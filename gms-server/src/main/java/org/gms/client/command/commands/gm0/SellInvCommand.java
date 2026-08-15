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
import org.gms.client.inventory.Inventory;
import org.gms.client.inventory.InventoryType;
import org.gms.client.inventory.Item;
import org.gms.server.ShopFactory;
import org.gms.util.I18nUtil;

import java.util.HashMap;
import java.util.Map;

/**
 * 从指定格子开始批量出售某个背包栏的物品。
 * 卖出的清单与金额会记进 CommandManager，供后续的回收指令买回。
 */
public class SellInvCommand extends Command {
    /**
     * 用于结算的回收商店。该商店在 shops 表中已存在（npcid 11000）。
     */
    private static final int SELL_SHOP_ID = 1337;

    private static final Map<String, InventoryType> SELLABLE_TYPES = Map.of(
            "equip", InventoryType.EQUIP,
            "use", InventoryType.USE,
            "etc", InventoryType.ETC);

    {
        setDescription(I18nUtil.getMessage("SellInvCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 2) {
            player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message2"));
            return;
        }

        InventoryType type = SELLABLE_TYPES.get(params[0].toLowerCase());
        if (type == null) {
            player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message3"));
            return;
        }

        byte fromSlot;
        try {
            fromSlot = Byte.parseByte(params[1]);
        } catch (NumberFormatException e) {
            player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message2"));
            return;
        }
        if (fromSlot < 1) {
            player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message2"));
            return;
        }

        Map<Item, Short> soldItems = new HashMap<>();
        Inventory inventory = player.getInventory(type);
        // BeiDou 的 Shop.sell 返回 void、直接给玩家结算金币，
        // 不像 LichKingMod 那样返回本次成交额，因此用前后金币差额统计
        int mesoBefore = player.getMeso();
        // 上限取实际格数而非写死的 96，扩容过的背包才不会漏格
        for (short slot = fromSlot; slot <= inventory.getSlotLimit(); slot++) {
            Item item = inventory.getItem((byte) slot);
            if (item == null) {
                continue;
            }
            short quantity = item.getQuantity();
            ShopFactory.getInstance().getShop(SELL_SHOP_ID).sell(c, type, slot, quantity);
            soldItems.put(item, quantity);
        }
        int totalSold = player.getMeso() - mesoBefore;

        player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message4",
                params[0].toLowerCase(), fromSlot, totalSold));

        CommandManager.getInstance().setItemSoldThroughCommand(player.getId(), soldItems);
        CommandManager.getInstance().setItemSoldMeso(player.getId(), totalSold);
    }
}
