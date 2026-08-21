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

package org.gms.client.command.commands.gm2;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.client.inventory.InventoryType;
import org.gms.client.inventory.Item;
import org.gms.client.inventory.Pet;
import org.gms.config.GameConfig;
import org.gms.constants.inventory.ItemConstants;
import org.gms.server.ItemInformationProvider;
import org.gms.server.maps.MapItem;
import org.gms.server.maps.MapleMap;
import org.gms.util.I18nUtil;

import static java.util.concurrent.TimeUnit.DAYS;
import static java.util.concurrent.TimeUnit.MINUTES;

/**
 * {@code !dropto <角色名或角色id> <物品id> [数量] [有效期分钟数]}
 *
 * <p>{@code !drop} 的定向版：物品掉在目标角色自己脚下（他在哪张图哪条线都行），
 * 而且<b>只有他一个人看得见、也只有他能捡</b>——同一张图上的其他玩家屏幕上什么都没有。
 *
 * <p>原理见 {@link MapleMap#spawnExclusiveItemDrop}：地面掉落本来就是服务端逐客户端
 * 单独发包的，独享掉落只是把「发不发」的判据从任务道具换成了角色 id。
 */
public class ItemDropToCommand extends Command {
    /**
     * 有效期参数的上限，1 天。与 {@link ItemDropCommand} 保持一致。
     */
    private static final int MAX_EXPIRATION_MINUTES = 1440;

    {
        setDescription(I18nUtil.getMessage("ItemDropToCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        if (params.length < 2) {
            player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message2"));
            return;
        }

        // 名字或角色 id 都收，见 Command.resolveTarget
        Character victim = resolveTarget(c, params[0]);
        if (victim == null) {
            player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message3", params[0]));
            return;
        }

        // 掉在目标自己的图上，所以他必须真的站在某张图里：在商城/交易所或正在切频道时没有 map 可掉
        MapleMap targetMap = victim.getMap();
        if (targetMap == null || victim.isAwayFromWorld()) {
            player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message4", victim.getName()));
            return;
        }

        int itemId;
        try {
            itemId = Integer.parseInt(params[1]);
        } catch (NumberFormatException e) {
            player.yellowMessage(I18nUtil.getMessage("ItemCommand.message3", params[1]));
            return;
        }

        ItemInformationProvider ii = ItemInformationProvider.getInstance();
        if (ii.getName(itemId) == null) {
            player.yellowMessage(I18nUtil.getMessage("ItemCommand.message3", params[1]));
            return;
        }

        if (GameConfig.getServerBoolean("block_generate_cash_item") && ii.isCash(itemId)) {
            player.yellowMessage(I18nUtil.getMessage("ItemCommand.message4"));
            return;
        }

        Item toDrop;
        if (ItemConstants.isPet(itemId)) {
            // 宠物的第三个参数是「天数」，和普通道具的「分钟数」不是一回事，别混用
            if (params.length < 3) {
                player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message5"));
                return;
            }

            long days;
            try {
                days = Math.max(1, Integer.parseInt(params[2]));
            } catch (NumberFormatException e) {
                player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message5"));
                return;
            }

            toDrop = new Item(itemId, (short) 0, (short) 1, Pet.createPet(itemId));
            toDrop.setExpiration(System.currentTimeMillis() + DAYS.toMillis(days));
        } else {
            short quantity = 1;
            if (params.length >= 3) {
                try {
                    quantity = Short.parseShort(params[2]);
                } catch (NumberFormatException e) {
                    player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message2"));
                    return;
                }
            }

            if (ItemConstants.getInventoryType(itemId) == InventoryType.EQUIP) {
                toDrop = ii.getEquipById(itemId);
            } else {
                toDrop = new Item(itemId, (short) 0, quantity);
            }

            if (params.length >= 4) {
                int minutes;
                try {
                    minutes = Integer.parseInt(params[3]);
                } catch (NumberFormatException e) {
                    player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message6"));
                    return;
                }
                minutes = Math.min(Math.max(minutes, 1), MAX_EXPIRATION_MINUTES);
                toDrop.setExpiration(System.currentTimeMillis() + MINUTES.toMillis(minutes));
            }
        }

        // 与 !drop 同一套试用标记：gm3 以下刷出来的东西打上不可交易/沙盒标签。
        // Item.owner 不是拾取权（拾取权在 MapItem.exclusiveOwnerId），它影响的是
        // Inventory 合并——owner 不同的两堆同种物品不会叠在一起
        toDrop.setOwner(player.gmLevel() > 3 ? "" : player.getName());
        if (player.gmLevel() < 3) {
            short f = toDrop.getFlag();
            f |= ItemConstants.ACCOUNT_SHARING;
            f |= ItemConstants.UNTRADEABLE;
            f |= ItemConstants.SANDBOX;

            toDrop.setFlag(f);
            toDrop.setOwner("TRIAL-MODE");
        }

        MapItem mdrop = targetMap.spawnExclusiveItemDrop(victim, victim, toDrop, victim.getPosition());
        if (mdrop == null) {   // 该图禁止掉落（FieldLimit.DROP_LIMIT），物品已当场消散
            player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message7", victim.getName()));
            return;
        }

        player.yellowMessage(I18nUtil.getMessage("ItemDropToCommand.message8",
                victim.getName(), ii.getName(itemId), toDrop.getQuantity()));
    }
}
