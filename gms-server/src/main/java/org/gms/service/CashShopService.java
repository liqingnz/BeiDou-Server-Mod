package org.gms.service;

import com.mybatisflex.core.paginate.Page;
import lombok.AllArgsConstructor;
import org.gms.constants.string.CategoryType;
import org.gms.dao.entity.ModifiedCashItemDO;
import org.gms.dao.mapper.ModifiedCashItemMapper;
import org.gms.exception.BizException;
import org.gms.model.dto.CashShopBatchOnSaleReqDTO;
import org.gms.model.dto.CashShopSearchRtnDTO;
import org.gms.model.pojo.CashCategory;
import org.gms.provider.Data;
import org.gms.provider.DataProvider;
import org.gms.provider.DataProviderFactory;
import org.gms.provider.DataTool;
import org.gms.provider.wz.WZFiles;
import org.gms.server.CashShop;
import org.gms.server.ItemInformationProvider;
import org.gms.util.BasePageUtil;
import org.gms.util.I18nUtil;
import org.gms.util.RequireUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@AllArgsConstructor
public class CashShopService {
    // sn的前3位是「一级(1位)+二级(2位)」分类
    private static final int SN_CATEGORY_LENGTH = 3;
    private static final int MAX_PAGE_SIZE = 200;

    private final ModifiedCashItemMapper modifiedCashItemMapper;

    public List<ModifiedCashItemDO> loadAllModifiedCashItems() {
        return modifiedCashItemMapper.selectAll();
    }

    public List<CashCategory> getAllCategoryList() {
        DataProvider etc = DataProviderFactory.getDataProvider(WZFiles.ETC);
        List<CashCategory> cashCategoryList = new ArrayList<>();
        for (Data item : etc.getData("Category.img").getChildren()) {
            int id = DataTool.getIntConvert("Category", item);
            int subId = DataTool.getIntConvert("CategorySub", item);
            String subName = DataTool.getString("Name", item);
            String name = CategoryType.toName(id);
            cashCategoryList.add(CashCategory.builder().id(id).name(name).subId(subId).subName(subName).build());
        }
        return cashCategoryList;
    }

    /**
     * 后台商城管理用的分类树：在wz原始分类之上补「全部」伪分类。
     * 二级分类各成体系（同一个subId在装备下是帽子、在消耗下是卷轴），
     * 所以一级「全部」之下没有可用的二级集合，只给它一条同为「全部」的二级占位，由前端隐藏二级页签。
     *
     * @return 带「全部」的分类列表
     */
    public List<CashCategory> getCategoryListWithAll() {
        List<CashCategory> cashCategoryList = new ArrayList<>();
        cashCategoryList.add(buildAllCategory(CategoryType.ALL.getId(), CategoryType.ALL.getName()));
        Set<Integer> visitedIds = new HashSet<>();
        for (CashCategory cashCategory : getAllCategoryList()) {
            // 每个一级分类的二级「全部」插在它自己的二级分类之前
            if (visitedIds.add(cashCategory.getId())) {
                cashCategoryList.add(buildAllCategory(cashCategory.getId(), cashCategory.getName()));
            }
            cashCategoryList.add(cashCategory);
        }
        return cashCategoryList;
    }

    public Page<CashShopSearchRtnDTO> getCommodityByCategory(CashCategory data) {
        RequireUtil.requireNotNull(data.getId(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "id"));
        RequireUtil.requireNotNull(data.getSubId(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "subId"));

        final boolean allCategory = CategoryType.isAll(data.getId());
        // 精确到二级分类时才校验分类存在，「全部」是后台伪分类，wz里查不到
        if (!allCategory && !CategoryType.isAll(data.getSubId())) {
            getCategory(data.getId(), data.getSubId());
        }
        // 默认与客户端保持一致，每页10条；「全部」跨分类条目太多，由前端指定更大的每页条数
        data.setPageSize(data.getPageSize() == null ? 10 : Math.clamp(data.getPageSize(), 1, MAX_PAGE_SIZE));

        final String prefix = snPrefix(data.getId(), data.getSubId());
        // wz中的物品
        List<CashShopSearchRtnDTO> wzCashItems = CashShop.CashItemFactory.getItems().values().stream()
                // 按分类过滤
                .filter(cashItem -> String.valueOf(cashItem.getSn()).startsWith(prefix))
                // 一级「全部」不含首页说明条目和wz未登记的分类
                .filter(cashItem -> !allCategory || CategoryType.isBrowsable(categoryIdOfSn(cashItem.getSn())))
                .map(this::fromCashItem)
                .toList();
        // 数据库中的物品
        List<ModifiedCashItemDO> dbCashItems = CashShop.CashItemFactory.getModifiedCashItems().values().stream()
                // 按分类过滤
                .filter(modifiedCashItemDO -> String.valueOf(modifiedCashItemDO.getSn()).startsWith(prefix))
                .toList();
        // 以数据库为准更新可能更新的字段
        wzCashItems.forEach(wzCashItem -> dbCashItems.stream()
                .filter(dbCashItem -> Objects.equals(wzCashItem.getSn(), dbCashItem.getSn()))
                .findFirst()
                .ifPresent(dbCashItem -> setDbItemValue(wzCashItem, dbCashItem)));

        // 按其他条件过滤
        wzCashItems = wzCashItems.stream().filter(item ->
                // 上架状态
                (data.getOnSale() == null || Objects.equals(data.getOnSale(), item.getOnSale() != null && item.getOnSale() == 1))
                        // 物品id
                        && (data.getItemId() == null || data.getItemId().equals(item.getItemId()))
        ).toList();

        // 排序是否正确？ 猜测按照Priority降序 ItemId升序排列
        // wz里有几十条商品没有Priority节点（宠物装备有1条，其余在首页说明和未登记分类里），排序必须容忍null
        Comparator<CashShopSearchRtnDTO> priorityDesc = Comparator
                .comparing(CashShopSearchRtnDTO::getPriority, Comparator.nullsFirst(Comparator.naturalOrder()))
                .reversed();
        Page<CashShopSearchRtnDTO> page = BasePageUtil.create(wzCashItems, data)
                .sorted(priorityDesc.thenComparing(CashShopSearchRtnDTO::getItemId))
                .page();

        // itemName既不参与过滤也不参与排序，放到分页之后再回填，省得「全部」时白查近万条物品名
        if (page.getRecords() != null) {
            ItemInformationProvider ii = ItemInformationProvider.getInstance();
            page.getRecords().forEach(record -> record.setItemName(ii.getName(record.getItemId())));
        }
        return page;
    }

    public CashShopSearchRtnDTO getCommodityBySn(Integer sn) {
        RequireUtil.requireNotNull(sn, I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "sn"));
        ModifiedCashItemDO cashItem = CashShop.CashItemFactory.getWzItem(sn);
        RequireUtil.requireNotNull(cashItem, I18nUtil.getExceptionMessage("UNKNOWN_PARAMETER_VALUE", "sn", sn));
        CashShopSearchRtnDTO rtnDTO = fromCashItem(cashItem);
        CashShop.CashItemFactory.getModifiedCashItems().values().stream()
                .filter(dbCashItem -> Objects.equals(dbCashItem.getSn(), sn))
                .findFirst()
                .ifPresent(dbCashItem -> setDbItemValue(rtnDTO, dbCashItem));
        return rtnDTO;
    }

    @Transactional(rollbackFor = Exception.class)
    public void changeOnSale(ModifiedCashItemDO data) {
        RequireUtil.requireNotNull(data.getSn(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "sn"));
        ModifiedCashItemDO cashItem = CashShop.CashItemFactory.getWzItem(data.getSn());
        modifiedCashItemMapper.deleteById(data.getSn());

        // 如果是下架，直接插入或更新除状态外所有值为null
        if (data.getOnSale() != null && data.getOnSale() != 1) {
            if (cashItem.isSelling()) {
                modifiedCashItemMapper.insertSelective(ModifiedCashItemDO.builder().sn(data.getSn()).onSale(0).build());
            }
            CashShop.CashItemFactory.loadAllModifiedCashItems();
            return;
        }
        if (Objects.equals(cashItem.getItemId(), data.getItemId())) {
            data.setItemId(null);
        }
        if (Objects.equals(cashItem.getPrice(), data.getPrice())) {
            data.setPrice(null);
        }
        if (Objects.equals(cashItem.getPeriod(), data.getPeriod())) {
            data.setPeriod(null);
        }
        if (Objects.equals(cashItem.getPriority(), data.getPriority())) {
            data.setPriority(null);
        }
        if (Objects.equals(cashItem.getCount(), data.getCount())) {
            data.setCount(null);
        }
        if (Objects.equals(cashItem.getOnSale(), data.getOnSale())) {
            data.setOnSale(null);
        }
        modifiedCashItemMapper.insertSelective(data);
        CashShop.CashItemFactory.loadAllModifiedCashItems();
    }

    private CashCategory getCategory(Integer id, Integer subId) {
        return CashShop.CashItemFactory.getCashCategories().stream()
                .filter(cc -> Objects.equals(cc.getId(), id) && Objects.equals(cc.getSubId(), subId))
                .findFirst()
                .orElseThrow(() -> new BizException(I18nUtil.getExceptionMessage("CashShopService.getByCategory.exception1")));
    }

    private static CashCategory buildAllCategory(int id, String name) {
        return CashCategory.builder()
                .id(id)
                .name(name)
                .subId(CategoryType.ALL.getId())
                .subName(CategoryType.ALL.getName())
                .build();
    }

    /**
     * sn的前3位就是分类：第1位一级，第2~3位二级。「全部」逐级降级成更短的前缀，一级也「全部」时前缀为空即不限。
     *
     * @param id    一级分类
     * @param subId 二级分类
     * @return sn前缀
     */
    private static String snPrefix(Integer id, Integer subId) {
        if (CategoryType.isAll(id)) {
            return "";
        }
        if (CategoryType.isAll(subId)) {
            return String.valueOf(id);
        }
        return id + String.format("%02d", subId);
    }

    private static int categoryIdOfSn(int sn) {
        String snStr = String.valueOf(sn);
        return snStr.length() < SN_CATEGORY_LENGTH ? CategoryType.ALL.getId() : Integer.parseInt(snStr.substring(0, 1));
    }

    /**
     * 按sn反查所属分类。「全部」下每行分属不同分类，不能再共用一个查询条件里的分类。
     *
     * @param sn 商品sn
     * @return 分类，wz未登记的只回填得到一级分类名
     */
    private CashCategory findCategoryBySn(int sn) {
        String snStr = String.valueOf(sn);
        if (snStr.length() < SN_CATEGORY_LENGTH) {
            return CashCategory.builder().build();
        }
        int id = Integer.parseInt(snStr.substring(0, 1));
        int subId = Integer.parseInt(snStr.substring(1, SN_CATEGORY_LENGTH));
        return CashShop.CashItemFactory.getCashCategories().stream()
                .filter(cc -> Objects.equals(cc.getId(), id) && Objects.equals(cc.getSubId(), subId))
                .findFirst()
                .orElseGet(() -> CashCategory.builder().id(id).name(CategoryType.toName(id)).subId(subId).build());
    }

    private CashShopSearchRtnDTO fromCashItem(ModifiedCashItemDO cashItem) {
        CashCategory cashCategory = findCategoryBySn(cashItem.getSn());
        return CashShopSearchRtnDTO.builder()
                .categoryId(cashCategory.getId())
                .categoryName(cashCategory.getName())
                .subcategoryId(cashCategory.getSubId())
                .subcategoryName(cashCategory.getSubName())
                .sn(cashItem.getSn())
                .itemId(cashItem.getItemId())
                .price(cashItem.getPrice())
                .defaultPrice(cashItem.getPrice())
                .period(cashItem.getPeriod())
                .defaultPeriod(cashItem.getPeriod())
                .priority(cashItem.getPriority())
                .defaultPriority(cashItem.getPriority())
                .count(cashItem.getCount())
                .defaultCount(cashItem.getCount())
                .onSale(cashItem.getOnSale())
                .defaultOnSale(cashItem.getOnSale())
                .bonus(cashItem.getBonus())
                .defaultBonus(cashItem.getBonus())
                .maplePoint(cashItem.getMaplePoint())
                .defaultMaplePoint(cashItem.getMaplePoint())
                .meso(cashItem.getMeso())
                .defaultMeso(cashItem.getMeso())
                .forPremiumUser(cashItem.getForPremiumUser())
                .defaultForPremiumUser(cashItem.getForPremiumUser())
                .gender(cashItem.getCommodityGender())
                .defaultGender(cashItem.getCommodityGender())
                .clz(cashItem.getClz())
                .defaultClz(cashItem.getClz())
                .limit(cashItem.getLimit())
                .defaultLimit(cashItem.getLimit())
                .pbCash(cashItem.getPbCash())
                .defaultPBCash(cashItem.getPbCash())
                .pbPoint(cashItem.getPbPoint())
                .defaultPBPoint(cashItem.getPbPoint())
                .pbGift(cashItem.getPbGift())
                .defaultPBGift(cashItem.getPbGift())
                .packageSn(cashItem.getPackageSn())
                .defaultPackageSn(cashItem.getPackageSn())
                .build();
    }

    private void setDbItemValue(CashShopSearchRtnDTO rtnDTO, ModifiedCashItemDO dbCashItem) {
        rtnDTO.setItemId(Optional.ofNullable(dbCashItem.getItemId()).orElse(rtnDTO.getItemId()));
        rtnDTO.setPrice(Optional.ofNullable(dbCashItem.getPrice()).orElse(rtnDTO.getPrice()));
        rtnDTO.setPeriod(Optional.ofNullable(dbCashItem.getPeriod()).orElse(rtnDTO.getPeriod()));
        rtnDTO.setPriority(Optional.ofNullable(dbCashItem.getPriority()).orElse(rtnDTO.getPriority()));
        rtnDTO.setCount(Optional.ofNullable(dbCashItem.getCount()).orElse(rtnDTO.getCount()));
        rtnDTO.setOnSale(Optional.ofNullable(dbCashItem.getOnSale()).orElse(rtnDTO.getOnSale()));
        rtnDTO.setBonus(Optional.ofNullable(dbCashItem.getBonus()).orElse(rtnDTO.getBonus()));
        rtnDTO.setMaplePoint(Optional.ofNullable(dbCashItem.getMaplePoint()).orElse(rtnDTO.getMaplePoint()));
        rtnDTO.setMeso(Optional.ofNullable(dbCashItem.getMeso()).orElse(rtnDTO.getMeso()));
        rtnDTO.setForPremiumUser(Optional.ofNullable(dbCashItem.getForPremiumUser()).orElse(rtnDTO.getForPremiumUser()));
        rtnDTO.setGender(Optional.ofNullable(dbCashItem.getCommodityGender()).orElse(rtnDTO.getGender()));
        rtnDTO.setClz(Optional.ofNullable(dbCashItem.getClz()).orElse(rtnDTO.getClz()));
        rtnDTO.setLimit(Optional.ofNullable(dbCashItem.getLimit()).orElse(rtnDTO.getLimit()));
        rtnDTO.setPbCash(Optional.ofNullable(dbCashItem.getPbCash()).orElse(rtnDTO.getPbCash()));
        rtnDTO.setPbPoint(Optional.ofNullable(dbCashItem.getPbPoint()).orElse(rtnDTO.getPbPoint()));
        rtnDTO.setPbGift(Optional.ofNullable(dbCashItem.getPbGift()).orElse(rtnDTO.getPbGift()));
        rtnDTO.setPackageSn(Optional.ofNullable(dbCashItem.getPackageSn()).orElse(rtnDTO.getPackageSn()));
    }

    @Transactional
    public void batchChangeOnSale(CashShopBatchOnSaleReqDTO submit) {
        for (ModifiedCashItemDO data : submit.getData()) {
            data.setOnSale(1);
            switch (submit.getType()) {
                case "价格":
                    data.setPrice(submit.getValue());
                    break;
                case "数量":
                    data.setCount(submit.getValue().shortValue());
                    break;
                case "有效期":
                    data.setPeriod(submit.getValue().longValue());
                    break;
            }
            changeOnSale(data);
        }
    }
}
