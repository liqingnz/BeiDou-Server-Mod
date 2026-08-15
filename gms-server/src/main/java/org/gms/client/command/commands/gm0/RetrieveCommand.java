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
package org.gms.client.command.commands.gm0;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.client.command.commands.CommandManager;
import org.gms.client.inventory.InventoryType;
import org.gms.client.inventory.Item;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.util.I18nUtil;

import java.util.EnumMap;
import java.util.Map;

/**
 * 按原价买回本次用 {@code @sellinv} 卖出的物品。
 * <p>
 * 出售清单与金额由 {@link CommandManager} 暂存在内存里，进程重启即失效，只能买回最近一次的出售。
 */
public class RetrieveCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("RetrieveCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        CommandManager manager = CommandManager.getInstance();

        Integer cost = manager.getItemSoldMeso(player.getId());
        Map<Item, Short> itemList = manager.getItemSoldThroughCommand(player.getId());
        if (cost == null || itemList == null || itemList.isEmpty()) {
            player.dropMessage(6, I18nUtil.getMessage("RetrieveCommand.message2"));
            return;
        }

        if (player.getMeso() < cost) {
            player.dropMessage(6, I18nUtil.getMessage("RetrieveCommand.message3", cost));
            return;
        }

        // 原实现先扣钱再放物品，且忽略 addFromDrop 的返回值：背包放不下时钱扣了、物品没进包、
        // 记录还被清空，等于凭空销毁。此处整批预检，任一件放不下就整体中止，不动金币也不清记录。
        //
        // 这里用 checkSpaceProgressively 而不是 checkSpace：后者对装备只判断「还有没有一格」，
        // 在循环里逐件问会得到「一格空位能放下五件装备」的错误结论。
        // usedSlots 必须按背包类型分开累加，否则装备占的格子会被算到消耗栏头上。
        Map<InventoryType, Integer> usedSlots = new EnumMap<>(InventoryType.class);
        for (Map.Entry<Item, Short> entry : itemList.entrySet()) {
            Item item = entry.getKey();
            InventoryType type = item.getInventoryType();
            short quantity = type == InventoryType.EQUIP ? 1 : entry.getValue();

            int result = InventoryManipulator.checkSpaceProgressively(c, item.getItemId(), quantity,
                    item.getOwner(), usedSlots.getOrDefault(type, 0), false);
            if (result % 2 == 0) {  // bit0 表示这一件放不放得下
                player.dropMessage(6, I18nUtil.getMessage("RetrieveCommand.message4"));
                return;
            }
            usedSlots.put(type, result >> 1);
        }

        player.gainMeso(-cost, false);
        for (Map.Entry<Item, Short> entry : itemList.entrySet()) {
            Item item = entry.getKey();
            // 原实现只要清单里有一件装备，就把所有物品都当装备处理，此处逐件按自身类型分支
            if (item.getInventoryType() == InventoryType.EQUIP) {
                item.setQuantity((short) 1);
                InventoryManipulator.addFromDrop(c, item);
            } else {
                InventoryManipulator.addById(c, item.getItemId(), entry.getValue());
            }
        }

        player.yellowMessage(I18nUtil.getMessage("RetrieveCommand.message5", cost));
        manager.clearItemSold(player.getId());
    }
}
