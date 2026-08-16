package org.gms.service;

import com.mybatisflex.core.query.QueryWrapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gms.client.inventory.InventoryType;
import org.gms.constants.inventory.ItemConstants;
import org.gms.dao.entity.FavoriteItemDO;
import org.gms.dao.mapper.FavoriteItemMapper;
import org.gms.exception.BizException;
import org.gms.server.ItemInformationProvider;
import org.gms.util.I18nUtil;
import org.gms.util.RequireUtil;
import org.springframework.stereotype.Service;

import java.util.List;

import static org.gms.dao.entity.table.FavoriteItemDOTableDef.FAVORITE_ITEM_D_O;

/**
 * 后台「发放资源」的常用物品收藏。
 * <p>
 * 按发放类型分开存放：type=5 收藏道具，type=6 收藏装备。两者不能混用——
 * GiveService 对二者分别做了 InventoryType 校验，选错会直接被拒。
 *
 * @author beidou
 */
@Service
@Slf4j
@AllArgsConstructor
public class FavoriteItemService {
    private static final int TYPE_ITEM = 5;
    private static final int TYPE_EQUIP = 6;

    private final FavoriteItemMapper favoriteItemMapper;

    public List<FavoriteItemDO> list(Integer type) {
        QueryWrapper queryWrapper = QueryWrapper.create();
        if (type != null) {
            queryWrapper.where(FAVORITE_ITEM_D_O.TYPE.eq(type));
        }
        queryWrapper.orderBy(FAVORITE_ITEM_D_O.ID.asc());
        return favoriteItemMapper.selectListByQuery(queryWrapper);
    }

    public void add(Integer type, Integer itemId) {
        RequireUtil.requireNotNull(type, I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "type"));
        RequireUtil.requireNotNull(itemId, I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "itemId"));
        if (type != TYPE_ITEM && type != TYPE_EQUIP) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS", type));
        }

        String itemName = ItemInformationProvider.getInstance().getName(itemId);
        if (itemName == null) {
            throw new BizException(I18nUtil.getExceptionMessage("ITEM_NOT_FOUND"));
        }
        // 与 GiveService 的校验保持一致，避免收藏了之后发放时才报错
        boolean isEquip = ItemConstants.getInventoryType(itemId).equals(InventoryType.EQUIP);
        if (type == TYPE_EQUIP && !isEquip) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_EQUIP"));
        }
        if (type == TYPE_ITEM && isEquip) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_ITEM"));
        }

        boolean exists = favoriteItemMapper.selectCountByQuery(QueryWrapper.create()
                .where(FAVORITE_ITEM_D_O.TYPE.eq(type))
                .and(FAVORITE_ITEM_D_O.ITEM_ID.eq(itemId))) > 0;
        if (exists) {
            throw new BizException(I18nUtil.getExceptionMessage("FavoriteItemService.duplicate"));
        }

        favoriteItemMapper.insertSelective(FavoriteItemDO.builder()
                .type(type)
                .itemId(itemId)
                .itemName(itemName)
                .build());
        log.info(I18nUtil.getLogMessage("FavoriteItemService.add.info1", itemId, itemName));
    }

    public void delete(Integer id) {
        RequireUtil.requireNotNull(id, I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_NULL", "id"));
        favoriteItemMapper.deleteById(id);
    }
}
