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
import org.gms.server.Shop;
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

        // shops 表里没有这一行时 ShopFactory 会缓存并返回 null，逐格调用会让普通玩家的指令抛空指针
        Shop shop = ShopFactory.getInstance().getShop(SELL_SHOP_ID);
        if (shop == null) {
            player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message5", SELL_SHOP_ID));
            return;
        }

        Map<Item, Short> soldItems = new HashMap<>();
        Inventory inventory = player.getInventory(type);
        // 用 long 累加：单笔已被 Shop.sell 夹在 [0, Integer.MAX_VALUE]，
        // 但最多 96 格的和仍可能越过 int，溢出成负数就会让 @retrieve 的回购价变成负的
        long totalSold = 0;
        // 上限取实际格数而非写死的 96，扩容过的背包才不会漏格
        for (short slot = fromSlot; slot <= inventory.getSlotLimit(); slot++) {
            Item item = inventory.getItem((byte) slot);
            if (item == null) {
                continue;
            }
            short quantity = item.getQuantity();
            // 用 Shop.sell 的返回值而非前后金币差额：循环期间别的线程给的金币
            // （组队分成、掉落拾取）会被差额法算进售出额，进而抬高回收指令的买回价
            totalSold += shop.sell(c, type, slot, quantity);
            // Shop.sell 有两条静默拒收路径（数量为负直接返回、canSell 为假只回一个包），
            // 物品会原样留在格子里。按实际减少的数量记账，否则回购单里会出现根本没卖掉的东西
            Item remaining = inventory.getItem((byte) slot);
            short sold = remaining == null ? quantity : (short) (quantity - remaining.getQuantity());
            if (sold > 0) {
                soldItems.put(item, sold);
            }
        }

        // 回购价按 int 存：玩家金币本身就封顶在 Integer.MAX_VALUE，夹一下只是防越界
        int recordedMeso = (int) Math.min(totalSold, Integer.MAX_VALUE);
        player.yellowMessage(I18nUtil.getMessage("SellInvCommand.message4",
                params[0].toLowerCase(), fromSlot, recordedMeso));

        CommandManager.getInstance().setItemSoldThroughCommand(player.getId(), soldItems);
        CommandManager.getInstance().setItemSoldMeso(player.getId(), recordedMeso);
    }
}
