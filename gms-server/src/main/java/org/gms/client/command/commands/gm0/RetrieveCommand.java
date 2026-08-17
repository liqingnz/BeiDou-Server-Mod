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
import org.gms.constants.inventory.ItemConstants;
import org.gms.util.I18nUtil;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
        // 记录还被清空，等于凭空销毁。此处先整批预检，放不下就整体中止，不动金币也不清记录。
        if (!hasSpaceForAll(c, itemList)) {
            player.dropMessage(6, I18nUtil.getMessage("RetrieveCommand.message4"));
            return;
        }

        player.gainMeso(-cost, false);

        // 一律走 addFromDrop 发放原物品对象。原实现对非装备用 addById(c, itemId, quantity)，
        // 那个重载会新建一个 owner=null、flag=0、expiration=-1 的干净物品，而 Shop.canSell
        // 只校验数量、不看这些字段：@sellinv 与 @retrieve 都是 gm0，普通玩家能靠这一来一回
        // 洗掉 USE/ETC 物品的 UNTRADEABLE、SANDBOX 等标记，还能把限时物品变成永久物品。
        // addFromDrop 会原样保留 owner/flag/expiration，且只与 flag 和 owner 都相同的堆合并。
        Map<Item, Short> failed = new HashMap<>();
        for (Map.Entry<Item, Short> entry : itemList.entrySet()) {
            Item item = entry.getKey();
            // 原实现只要清单里有一件装备，就把所有物品都当装备处理，此处逐件按自身类型分支
            item.setQuantity(item.getInventoryType() == InventoryType.EQUIP ? 1 : entry.getValue());
            if (!InventoryManipulator.addFromDrop(c, item)) {
                // 记的必须是 addFromDrop 改写后的剩余量，不能是原始数量：addFromDropInternal 会先把
                // 一部分并进已有的堆、开新格失败时才返回 false，并把 item 的数量改写成还没发出去的那部分。
                // 按原始数量记账，玩家腾出一格再来一次（重试免费）就白拿到已经并进包里的那部分。
                // 其余失败路径（装备满格、可充值物品、pickupRestricted）都没动过数量，取回来仍是全额。
                failed.put(item, item.getQuantity());
            }
        }

        if (!failed.isEmpty()) {
            // 预检通过却仍有放不进去的，保留这部分待玩家腾出空间后重试。
            // 金额清零：本次已按全额收过费，重试不该再收一遍。
            manager.setItemSoldThroughCommand(player.getId(), failed);
            manager.setItemSoldMeso(player.getId(), 0);
            player.dropMessage(6, I18nUtil.getMessage("RetrieveCommand.message6", failed.size()));
            return;
        }

        player.yellowMessage(I18nUtil.getMessage("RetrieveCommand.message5", cost));
        manager.clearItemSold(player.getId());
    }

    /**
     * 判断整批物品能否一次性放进背包。
     * <p>
     * 用 checkSpaceProgressively 而不是 checkSpace：后者对装备只判断「还有没有一格」，
     * 逐件问会得出「一格空位放得下五件装备」的错误结论。usedSlots 要按背包类型分开累加，
     * 否则装备占的格子会被算到消耗栏头上。
     * <p>
     * 非装备还必须先聚合再检查。清单里一个原背包格是一条记录，同一种堆叠物品可能有多条；
     * 而 checkSpaceProgressively 的 usedSlots 只记新增格数，不记前一条已经假想占掉的堆叠余量，
     * 逐条问会让每条都看到当前背包里同一份剩余容量，从而低估所需格数。
     * 聚合的键取 itemId + flag + owner，与 addFromDrop 实际的合并条件一致。
     * <p>
     * 可充值物品（飞镖/子弹）是例外，不能聚合：addFromDrop 对它们从不并堆，每次都新开一格，
     * 而 checkSpaceProgressively 对它们一律只算一格。聚合后两把飞镖会被当成一格放行，实际要两格。
     */
    private static boolean hasSpaceForAll(Client c, Map<Item, Short> itemList) {
        Map<InventoryType, Integer> usedSlots = new EnumMap<>(InventoryType.class);

        // 装备与可充值物品都不并堆，每条记录独占一格，逐条累加即可
        for (Map.Entry<Item, Short> entry : itemList.entrySet()) {
            Item item = entry.getKey();
            if (item.getInventoryType() == InventoryType.EQUIP) {
                if (!checkOne(c, item.getItemId(), (short) 1, item.getOwner(), InventoryType.EQUIP, usedSlots)) {
                    return false;
                }
            } else if (ItemConstants.isRechargeable(item.getItemId())) {
                if (!checkOne(c, item.getItemId(), entry.getValue(), item.getOwner(),
                        ItemConstants.getInventoryType(item.getItemId()), usedSlots)) {
                    return false;
                }
            }
        }

        Map<StackKey, Integer> stacks = new LinkedHashMap<>();
        for (Map.Entry<Item, Short> entry : itemList.entrySet()) {
            Item item = entry.getKey();
            if (item.getInventoryType() == InventoryType.EQUIP
                    || ItemConstants.isRechargeable(item.getItemId())) {
                continue;
            }
            stacks.merge(new StackKey(item.getItemId(), item.getFlag(), item.getOwner()),
                    (int) entry.getValue(), Integer::sum);
        }
        for (Map.Entry<StackKey, Integer> stack : stacks.entrySet()) {
            StackKey key = stack.getKey();
            InventoryType type = ItemConstants.getInventoryType(key.itemId());
            if (!checkOne(c, key.itemId(), stack.getValue().shortValue(), key.owner(), type, usedSlots)) {
                return false;
            }
        }
        return true;
    }

    private static boolean checkOne(Client c, int itemId, short quantity, String owner, InventoryType type,
                                    Map<InventoryType, Integer> usedSlots) {
        int result = InventoryManipulator.checkSpaceProgressively(c, itemId, quantity, owner,
                usedSlots.getOrDefault(type, 0), false);
        if (result % 2 == 0) {  // bit0 表示这一份放不放得下
            return false;
        }
        usedSlots.put(type, result >> 1);
        return true;
    }

    /**
     * 堆叠合并的判定键，与 InventoryManipulator.addFromDrop 里「flag 与 owner 都相同才并堆」一致。
     */
    private record StackKey(int itemId, short flag, String owner) {
    }
}
