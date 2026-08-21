package org.gms.service;

import lombok.extern.slf4j.Slf4j;
import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.Stat;
import org.gms.client.inventory.*;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.constants.inventory.ItemConstants;
import org.gms.constants.string.ExtendType;
import org.gms.dao.entity.ExtendValueDO;

import org.gms.model.dto.GiveResourceReqDTO;
import org.gms.exception.BizException;


import org.gms.net.server.Server;
import org.gms.server.CashShop;
import org.gms.server.ItemInformationProvider;
import org.gms.util.I18nUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import java.util.concurrent.atomic.AtomicInteger;

import static java.util.concurrent.TimeUnit.DAYS;
import static java.util.concurrent.TimeUnit.MINUTES;


@Service
@Slf4j
public class GiveService {
    private static final long MINUTES_PER_HOUR = 60L;
    private static final long MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

    @Autowired
    CharacterService characterService;

    public void give(GiveResourceReqDTO submitData) {
        if (submitData.getPlayerId() == 0) {
            giveAllOnlineChr(submitData);
        } else {
            giveChr(submitData);
        }
    }

    private void giveAllOnlineChr(GiveResourceReqDTO submitData) {
        switch (submitData.getType()) {
            case 0: // nxCredit 点券
            case 1: // nxPrepaid 信用点
            case 2: // maplePoint 抵用券
                int cashType = switch (submitData.getType()) {
                    case 1 -> CashShop.NX_PREPAID;
                    case 2 -> CashShop.MAPLE_POINT;
                    default -> CashShop.NX_CREDIT;
                };
                giveNxAllOnlineChr(submitData.getQuantity(), cashType);
                break;
            case 3: // mesos
                giveMesosAllOnlineChr(submitData.getQuantity());
                break;
            case 4: // exp
                giveExpAllOnlineChr(submitData.getQuantity());
                break;
            case 5: // item
                giveItemAllOnlineChr(submitData);
                break;
            case 6: // equip
                giveEquipAllOnlineChr(submitData);
                break;
            // 全服没有设置倍率的操作
            // case 7: // expRate
            // case 8: // mesosRate
            // case 9: // dropRate
            // case 10: // bossRate
            //     String rateType = switch (submitData.getType()) {
            //         case 7 -> "Exp";
            //         case 8 -> "Mesos";
            //         case 9 -> "Drop";
            //         case 10 -> "Boss";
            //         default -> "None";
            //     };
            //     giveRateAllOnlineChr(rateType, submitData.getRate());
            //     break;
        }
    }

    private void giveChr(GiveResourceReqDTO submitData) {
        Integer wId = submitData.getWorldId();
        Integer cId = submitData.getPlayerId();
        if (wId == null || wId < 0 || cId == null || cId < 1) {
            throw new BizException(I18nUtil.getExceptionMessage("CHR_OR_WORLD_ID_ERROR"));
        }
        Character chr = Server.getInstance()
                .getWorlds().get(wId)
                .getPlayerStorage().getCharacterById(cId);
        if (chr == null) throw new BizException(I18nUtil.getExceptionMessage("CHR_OFFLINE"));

        switch (submitData.getType()) {
            case 0: // nxCredit 点券
            case 1: // nxPrepaid 信用点
            case 2: // maplePoint 抵用券
                int cashType = switch (submitData.getType()) {
                    case 1 -> CashShop.NX_PREPAID;
                    case 2 -> CashShop.MAPLE_POINT;
                    default -> CashShop.NX_CREDIT;
                };
                giveNxChr(chr, submitData.getQuantity(), cashType);
                break;
            case 3: // mesos
                giveMesosChr(chr, submitData.getQuantity());
                break;
            case 4: // exp
                giveExpChr(chr, submitData.getQuantity());
                break;
            case 5: // item
                giveItemChr(chr, submitData);
                break;
            case 6: // equip
                giveEquipChr(chr, submitData);
                break;
            case 7: // expRate
            case 8: // mesosRate
            case 9: // dropRate
            case 10: // bossRate
                String rateType = switch (submitData.getType()) {
                    case 7 -> "expRate";
                    case 8 -> "mesoRate";
                    case 9 -> "dropRate";
                    default -> "None";
                };
                giveRateChr(chr, rateType, submitData.getRate());
                break;
            case 11:
                giveGMChr(chr, submitData.getQuantity());
                break;
            case 12:
                giveFameChr(chr, submitData.getQuantity());
                break;
            case 13:
                changeMap(chr, submitData.getQuantity());
                break;
        }
    }

    private void giveNxAllOnlineChr(int quantity, int type) {
        Server.getInstance().getWorlds().forEach(world -> world.getPlayerStorage().getAllCharacters().forEach(chr -> {
            doGainCash(chr, type, quantity);
            chr.message(I18nUtil.getMessage("Give.Nx.All", quantity, getCashTypeName(type)));
        }));
        log.info(I18nUtil.getLogMessage("Give.Nx.All.info1", quantity, getCashTypeName(type)));
    }

    private void giveNxChr(Character chr, int quantity, int type) {
        doGainCash(chr, type, quantity);
        chr.message(I18nUtil.getMessage("Give.Nx.Chr", quantity, getCashTypeName(type)));
        log.info(I18nUtil.getLogMessage("Give.Nx.Chr.info1", chr.getId(), chr.getName(), quantity, getCashTypeName(type)));
    }

    private String getCashTypeName(int type) {
        return switch (type) {
            case 1 -> I18nUtil.getMessage("Give.Nx.Type.1");
            case 2 -> I18nUtil.getMessage("Give.Nx.Type.2");
            default -> I18nUtil.getMessage("Give.Nx.Type.default");
        };
    }

    private void giveMesosAllOnlineChr(int quantity) {
        Server.getInstance().getWorlds().forEach(world -> world.getPlayerStorage().getAllCharacters().forEach(chr -> {
            doGainMeso(chr, quantity);
            chr.message(I18nUtil.getMessage("Give.Mesos.All", quantity));
        }));
        log.info(I18nUtil.getLogMessage("Give.Mesos.All.info1", quantity));
    }

    private void giveMesosChr(Character chr, int quantity) {
        doGainMeso(chr, quantity);
        chr.message(I18nUtil.getMessage("Give.Mesos.Chr", quantity));
        log.info(I18nUtil.getLogMessage("Give.Mesos.Chr.info1", chr.getId(), chr.getName(), quantity));
    }

    private void giveExpAllOnlineChr(int quantity) {
        Server.getInstance().getWorlds().forEach(world -> world.getPlayerStorage().getAllCharacters().forEach(chr -> {
            doGainExp(chr, quantity);
            chr.message(I18nUtil.getMessage("Give.Exp.All", quantity));
        }));
        log.info(I18nUtil.getLogMessage("Give.Exp.All.info1", quantity));
    }

    private void giveExpChr(Character chr, int quantity) {
        doGainExp(chr, quantity);
        chr.message(I18nUtil.getMessage("Give.Exp.Chr", quantity));
        log.info(I18nUtil.getLogMessage("Give.Exp.Chr.info1", chr.getId(), chr.getName(), quantity));
    }

    private void giveItemAllOnlineChr(GiveResourceReqDTO submitData) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        final int itemId = submitData.getId();
        final short quantity = Short.parseShort(submitData.getQuantity().toString());
        String itemName = ii.getName(itemId);
        if (itemName == null) {
            throw new BizException(I18nUtil.getExceptionMessage("ITEM_NOT_FOUND"));
        }
        if (ItemConstants.getInventoryType(itemId).equals(InventoryType.EQUIP)) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_ITEM"));
        }

        final boolean isPet = ItemConstants.isPet(itemId);
        final Long expireMinutes = normalizeExpireMinutes(submitData.getExpire());

        Server.getInstance().getWorlds().forEach(world -> world.getPlayerStorage().getAllCharacters().forEach(chr -> {
            if (isPet) {
                // petId 必须每人单独生成，否则所有人的宠物指向 pets 表同一行
                InventoryManipulator.addById(chr.getClient(), itemId, quantity, null, Pet.createPet(itemId),
                        petExpiration(expireMinutes, quantity));
                chr.message(withExpireMessage(I18nUtil.getMessage("Give.Pet.All", quantity, itemName), expireMinutes));
            } else {
                giveNormalItem(chr, itemId, quantity, expireMinutes);
                chr.message(withExpireMessage(I18nUtil.getMessage("Give.Item.All", quantity, itemName), expireMinutes));
            }
        }));

        if (isPet) {
            log.info(withExpireLog(I18nUtil.getLogMessage("Give.Pet.All.info1", quantity, itemId, itemName), expireMinutes));
        } else {
            log.info(withExpireLog(I18nUtil.getLogMessage("Give.Item.All.info1", quantity, itemId, itemName), expireMinutes));
        }

    }

    private void giveItemChr(Character chr, GiveResourceReqDTO submitData) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        int itemId = submitData.getId();
        short quantity = Short.parseShort(submitData.getQuantity().toString());
        String itemName = ii.getName(itemId);
        if (itemName == null) {
            throw new BizException(I18nUtil.getExceptionMessage("ITEM_NOT_FOUND"));
        }
        if (ItemConstants.getInventoryType(itemId).equals(InventoryType.EQUIP)) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_ITEM"));
        }

        boolean isPet = ItemConstants.isPet(itemId);
        Long expireMinutes = normalizeExpireMinutes(submitData.getExpire());

        if (isPet) {
            InventoryManipulator.addById(chr.getClient(), itemId, quantity, null, Pet.createPet(itemId),
                    petExpiration(expireMinutes, quantity));
            chr.message(withExpireMessage(I18nUtil.getMessage("Give.Pet.Chr", quantity, itemName), expireMinutes));
        } else {
            giveNormalItem(chr, itemId, quantity, expireMinutes);
            chr.message(withExpireMessage(I18nUtil.getMessage("Give.Item.Chr", quantity, itemName), expireMinutes));
        }

        if (isPet) {
            log.info(withExpireLog(I18nUtil.getLogMessage("Give.Pet.Chr.info1", chr.getId(), chr.getName(), quantity, itemId, itemName), expireMinutes));
        } else {
            log.info(withExpireLog(I18nUtil.getLogMessage("Give.Item.Chr.info1", chr.getId(), chr.getName(), quantity, itemId, itemName), expireMinutes));
        }
    }

    /**
     * 发放非宠物道具。带有效期时必须新开格子，否则背包里已有的同 ID 永久堆叠会被一起打上有效期。
     */
    private void giveNormalItem(Character chr, int itemId, short quantity, Long expireMinutes) {
        if (expireMinutes == null) {
            InventoryManipulator.addById(chr.getClient(), itemId, quantity, null, -1, (short) 0, -1);
        } else {
            InventoryManipulator.addByIdNoStack(chr.getClient(), itemId, quantity, toExpirationTime(expireMinutes));
        }
    }

    /**
     * 宠物到期时间：显式填了有效期就以有效期为准，否则沿用「数量即天数」的历史约定。
     */
    private long petExpiration(Long expireMinutes, short quantity) {
        if (expireMinutes != null) {
            return toExpirationTime(expireMinutes);
        }
        return System.currentTimeMillis() + DAYS.toMillis(Math.max(1, quantity));
    }

    /**
     * 前端有效期以分钟为单位，留空或非正数视为永久。
     *
     * @return 有效分钟数，永久时返回 null
     */
    private Long normalizeExpireMinutes(Long expireMinutes) {
        return expireMinutes == null || expireMinutes <= 0 ? null : expireMinutes;
    }

    private long toExpirationTime(long expireMinutes) {
        return System.currentTimeMillis() + MINUTES.toMillis(expireMinutes);
    }

    /**
     * 自定义装备日志里的有效期分钟数。转字符串既能避免千分符，也让「永久」统一记成 -1 而不是 null。
     */
    private String expireLogValue(Long expireMinutes) {
        Long minutes = normalizeExpireMinutes(expireMinutes);
        return minutes == null ? "-1" : String.valueOf(minutes);
    }

    /**
     * 给发放提示补上有效期说明，永久时原样返回。分钟数先折算成最大的整单位（天/小时/分钟）再展示。
     */
    private String withExpireMessage(String message, Long expireMinutes) {
        if (expireMinutes == null) {
            return message;
        }
        String duration;
        if (expireMinutes % MINUTES_PER_DAY == 0) {
            duration = I18nUtil.getMessage("Give.Expire.Day", expireMinutes / MINUTES_PER_DAY);
        } else if (expireMinutes % MINUTES_PER_HOUR == 0) {
            duration = I18nUtil.getMessage("Give.Expire.Hour", expireMinutes / MINUTES_PER_HOUR);
        } else {
            duration = I18nUtil.getMessage("Give.Expire.Minute", expireMinutes);
        }
        return I18nUtil.getMessage("Give.Expire.Wrap", message, duration);
    }

    /**
     * 给发放日志补上有效期说明，永久时原样返回。日志统一用分钟，便于排查。
     */
    private String withExpireLog(String logMessage, Long expireMinutes) {
        // 转字符串再传，避免 MessageFormat 给分钟数加上千分符
        return expireMinutes == null ? logMessage
                : I18nUtil.getLogMessage("Give.Expire.Wrap.info1", logMessage, String.valueOf(expireMinutes));
    }

    private void giveEquipAllOnlineChr(GiveResourceReqDTO submitData) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        String itemName = ii.getName(submitData.getId());
        if (ii.getEquipById(submitData.getId()) == null || itemName == null) {
            throw new BizException(I18nUtil.getExceptionMessage("EQUIP_NOT_FOUND"));
        }
        if (!ItemConstants.getInventoryType(submitData.getId()).equals(InventoryType.EQUIP)) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_EQUIP"));
        }
        // 全服发放不能因为某个人装备栏满就整体中止，但也不能一律当成功记账：
        // 计一下失败人数，收尾单独落一条 warn，运营才知道有人没收到
        AtomicInteger failed = new AtomicInteger();
        Server.getInstance().getWorlds().forEach(world -> world.getPlayerStorage().getAllCharacters().forEach(chr -> {
            boolean given = chr.gainEquip(
                    submitData.getId(),
                    submitData.getStr(),
                    submitData.getDex(),
                    submitData.get_int(),
                    submitData.getLuk(),
                    submitData.getHp(),
                    submitData.getMp(),
                    submitData.getPAtk(),
                    submitData.getMAtk(),
                    submitData.getPDef(),
                    submitData.getMDef(),
                    submitData.getAcc(),
                    submitData.getAvoid(),
                    submitData.getHands(),
                    submitData.getSpeed(),
                    submitData.getJump(),
                    submitData.getUpgradeSlot(),
                    submitData.getExpire()
            );
            if (!given) {
                failed.incrementAndGet();
                return;
            }
            chr.message(withExpireMessage(I18nUtil.getMessage("Give.Equip.All", submitData.getId().toString(), itemName),
                    normalizeExpireMinutes(submitData.getExpire())));
        }));
        if (failed.get() > 0) {
            log.warn(I18nUtil.getLogMessage("Give.Equip.All.warn1"), submitData.getId(), itemName, failed.get());
        }
        log.info(I18nUtil.getLogMessage("Give.Equip.All.info1",
                submitData.getId(),
                itemName,
                submitData.getStr(),
                submitData.getDex(),
                submitData.get_int(),
                submitData.getLuk(),
                submitData.getHp(),
                submitData.getMp(),
                submitData.getPAtk(),
                submitData.getMAtk(),
                submitData.getPDef(),
                submitData.getMDef(),
                submitData.getAcc(),
                submitData.getAvoid(),
                submitData.getHands(),
                submitData.getSpeed(),
                submitData.getJump(),
                submitData.getUpgradeSlot(),
                expireLogValue(submitData.getExpire())
        ));
    }

    private void giveEquipChr(Character chr, GiveResourceReqDTO submitData) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        String itemName = ii.getName(submitData.getId());
        if (itemName == null) {
            throw new BizException(I18nUtil.getExceptionMessage("EQUIP_NOT_FOUND"));
        }

        if (!ItemConstants.getInventoryType(submitData.getId()).equals(InventoryType.EQUIP)) {
            throw new BizException(I18nUtil.getExceptionMessage("ONLY_SUPPORT_GIVE_EQUIP"));
        }
        boolean given = chr.gainEquip(
                submitData.getId(),
                submitData.getStr(),
                submitData.getDex(),
                submitData.get_int(),
                submitData.getLuk(),
                submitData.getHp(),
                submitData.getMp(),
                submitData.getPAtk(),
                submitData.getMAtk(),
                submitData.getPDef(),
                submitData.getMDef(),
                submitData.getAcc(),
                submitData.getAvoid(),
                submitData.getHands(),
                submitData.getSpeed(),
                submitData.getJump(),
                submitData.getUpgradeSlot(),
                submitData.getExpire()
        );
        // 发放失败必须回报给后台：原实现无视返回值，装备栏满时照样往下发成功提示和成功日志
        if (!given) {
            throw new BizException(I18nUtil.getExceptionMessage("EQUIP_GIVE_FAILED", chr.getName()));
        }
        chr.message(withExpireMessage(I18nUtil.getMessage("Give.Equip.Chr", submitData.getId().toString(), itemName),
                normalizeExpireMinutes(submitData.getExpire())));
        log.info(I18nUtil.getLogMessage("Give.Equip.Chr.info1",
                submitData.getId(),
                itemName,
                submitData.getStr(),
                submitData.getDex(),
                submitData.get_int(),
                submitData.getLuk(),
                submitData.getHp(),
                submitData.getMp(),
                submitData.getPAtk(),
                submitData.getMAtk(),
                submitData.getPDef(),
                submitData.getMDef(),
                submitData.getAcc(),
                submitData.getAvoid(),
                submitData.getHands(),
                submitData.getSpeed(),
                submitData.getJump(),
                submitData.getUpgradeSlot(),
                expireLogValue(submitData.getExpire()),
                chr.getId(),
                chr.getName()
        ));
    }

    private void giveRateChr(Character chr, String type, float rate) {
        if (rate <= 0) {
            throw new BizException(I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_ZERO", "rate"));
        }
        ExtendValueDO data = ExtendValueDO.builder()
                .extendId(String.valueOf(chr.getId()))
                .extendType(ExtendType.CHARACTER_EXTEND.getType())
                .extendName(type)
                .extendValue(String.valueOf(rate))
                .build();
        characterService.updateRate(data);

        chr.message(I18nUtil.getMessage("Give.Rate.Chr", type, rate));
        log.info(I18nUtil.getLogMessage("Give.Rate.Chr.info1", chr.getId(), chr.getName(), type, rate));
    }

    private void giveGMChr(Character chr, Integer level) {
        if (level < 0  || level > 127) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS",level));
        }
        // 按照以下顺序hide，否则因为没有GM权限而无法hide或unhide
        if (level < 3) {
            chr.hide(false);
            chr.setGMLevel(level);
        } else {
            chr.setGMLevel(level);
            chr.hide(true);
        }
        chr.message(I18nUtil.getMessage("Give.GM.Chr", level));
        log.info(I18nUtil.getLogMessage("Give.GM.Chr.info1", chr.getId(), chr.getName(), level));
    }

    private void giveFameChr(Character chr, Integer fame) {
        chr.setFame(fame);
        chr.updateSingleStat(Stat.FAME, fame);
        chr.message(I18nUtil.getMessage("Give.Fame.Chr", fame));
        log.info(I18nUtil.getLogMessage("Give.Fame.Chr.info1", chr.getId(), chr.getName(), fame));
    }

    private void changeMap(Character chr, Integer mapId) {
        if (910000000 == mapId) {
            chr.saveLocation("FREE_MARKET");
            chr.changeMap(mapId, "out00");
        } else {
            chr.changeMap(mapId);
        }
        chr.message(I18nUtil.getMessage("Give.Map.Chr", mapId));
        log.info(I18nUtil.getLogMessage("Give.Map.Chr.info1", chr.getId(), chr.getName(), mapId));
    }

    private void doGainCash(Character chr, int type, int quantity) {
        int cash = chr.getCashShop().getCash(type);
        long sum = (long) cash + (long) quantity;
        // 禁止点券小于0导致商城错误
        if (sum < 0) {
            quantity = -cash;
        }
        // 禁止点券大于最大值
        if (sum > Integer.MAX_VALUE) {
            quantity = Integer.MAX_VALUE - cash;
        }
        chr.getCashShop().gainCash(type, quantity);
    }

    private void doGainExp(Character chr, int quantity) {
        int exp = chr.getExp();
        long sum = (long) exp + (long) quantity;
        // 最低只能把经验清0
        if (sum < 0) {
            sum = -exp;
        } else {
            sum = quantity;
        }
        chr.gainExp((int) sum);
    }

    private void doGainMeso(Character chr, int quantity) {
        int meso = chr.getMeso();
        long sum = (long) meso + (long) quantity;
        if (sum < 0) {
            quantity = -meso;
        }
        if (sum > Integer.MAX_VALUE) {
            quantity = Integer.MAX_VALUE - meso;
        }
        chr.gainMeso(quantity);
    }
}
