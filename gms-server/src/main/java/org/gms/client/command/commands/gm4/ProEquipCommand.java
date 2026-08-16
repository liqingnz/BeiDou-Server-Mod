/*
    This file is part of the HeavenMS MapleStory Server, commands OdinMS-based
    Copyleft (L) 2016 - 2019 RonanLana

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation version 3 as published by
    the Free Software Foundation. You may not use, modify or distribute
    this program under any other version of the GNU Affero General Public
    License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
package org.gms.client.command.commands.gm4;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.client.inventory.Equip;
import org.gms.client.inventory.InventoryType;
import org.gms.client.inventory.Item;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.config.GameConfig;
import org.gms.constants.inventory.ItemConstants;
import org.gms.server.ItemInformationProvider;
import org.gms.util.I18nUtil;

/**
 * 在装备原有属性上加值，原本为 0 的属性保持 0，因此装备本身的属性特征得以保留。
 * 与既有的 {@code @proitem} 互补——那条指令是把全属性统一设成定值。
 * 第三个参数传 drop 时改为掉在地上，替代原实现里与本指令 90% 重复的 DropProEquipCommand。
 */
public class ProEquipCommand extends Command {
    private static final String DROP_SWITCH = "drop";

    {
        setDescription(I18nUtil.getMessage("ProEquipCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.yellowMessage(I18nUtil.getMessage("ProEquipCommand.message2"));
            return;
        }

        ItemInformationProvider ii = ItemInformationProvider.getInstance();
        int itemId;
        short statGain = (short) GameConfig.getServerInt("equip_stat_randomize_range");
        try {
            itemId = Integer.parseInt(params[0]);
            if (params.length > 1) {
                statGain = Short.parseShort(params[1]);
            }
        } catch (NumberFormatException e) {
            player.yellowMessage(I18nUtil.getMessage("ProEquipCommand.message2"));
            return;
        }

        if (ii.getName(itemId) == null) {
            player.yellowMessage(I18nUtil.getMessage("ProEquipCommand.message3", params[0]));
            return;
        }

        if (!ItemConstants.getInventoryType(itemId).equals(InventoryType.EQUIP)) {
            player.dropMessage(6, I18nUtil.getMessage("ProEquipCommand.message4"));
            return;
        }

        Item item = ii.getEquipById(itemId);
        boostItemStats((Equip) item, statGain);

        boolean drop = params.length > 2 && DROP_SWITCH.equalsIgnoreCase(params[2]);
        if (drop) {
            player.getMap().spawnItemDrop(player, player, item, player.getPosition(), true, true);
        } else {
            InventoryManipulator.addFromDrop(c, item);
        }
    }

    /**
     * 只提升本来就大于 0 的属性。statGain 允许为负，用于削弱。
     */
    private static void boostItemStats(Equip equip, short statGain) {
        equip.setStr(boost(equip.getStr(), statGain));
        equip.setDex(boost(equip.getDex(), statGain));
        equip.setInt(boost(equip.getInt(), statGain));
        equip.setLuk(boost(equip.getLuk(), statGain));
        equip.setWatk(boost(equip.getWatk(), statGain));
        equip.setWdef(boost(equip.getWdef(), statGain));
        equip.setMatk(boost(equip.getMatk(), statGain));
        equip.setMdef(boost(equip.getMdef(), statGain));
        equip.setAcc(boost(equip.getAcc(), statGain));
        equip.setAvoid(boost(equip.getAvoid(), statGain));
        equip.setSpeed(boost(equip.getSpeed(), statGain));
        equip.setJump(boost(equip.getJump(), statGain));
        equip.setHp(boost(equip.getHp(), statGain));
        equip.setMp(boost(equip.getMp(), statGain));
    }

    private static short boost(short current, short statGain) {
        if (current <= 0) {
            return current;
        }
        // 先在 int 域内相加再钳位，否则大幅度加成会溢出 short 绕成负数
        return (short) Math.max(0, Math.min(Short.MAX_VALUE, current + statGain));
    }
}
