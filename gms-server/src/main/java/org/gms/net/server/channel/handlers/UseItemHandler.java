/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

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
package org.gms.net.server.channel.handlers;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.Disease;
import org.gms.client.inventory.InventoryType;
import org.gms.client.Job;
import org.gms.client.inventory.Item;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.config.GameConfig;
import org.gms.constants.id.ItemId;
import org.gms.constants.inventory.ItemConstants;
import org.gms.net.AbstractPacketHandler;
import org.gms.net.packet.InPacket;
import org.gms.server.ItemInformationProvider;
import org.gms.server.StatEffect;
import org.gms.util.I18nUtil;
import org.gms.util.PacketCreator;

/**
 * @author Matze
 */
public final class UseItemHandler extends AbstractPacketHandler {
    @Override
    public final void handlePacket(InPacket p, Client c) {
        Character chr = c.getPlayer();

        if (!chr.isAlive()) {
            c.sendPacket(PacketCreator.enableActions());
            return;
        }
        ItemInformationProvider ii = ItemInformationProvider.getInstance();
        p.readInt();
        short slot = p.readShort();
        int itemId = p.readInt();
        Item toUse = chr.getInventory(InventoryType.USE).getItem(slot);
        if (toUse != null && toUse.getQuantity() > 0 && toUse.getItemId() == itemId) {
            if (itemId == ItemId.ALL_CURE_POTION) {
                chr.dispelDebuffs();
                remove(c, slot);
                return;
            } else if (itemId == ItemId.EYEDROP) {
                chr.dispelDebuff(Disease.DARKNESS);
                remove(c, slot);
                return;
            } else if (itemId == ItemId.TONIC) {
                chr.dispelDebuff(Disease.WEAKEN);
                chr.dispelDebuff(Disease.SLOW);
                remove(c, slot);
                return;
            } else if (itemId == ItemId.HOLY_WATER) {
                chr.dispelDebuff(Disease.SEAL);
                chr.dispelDebuff(Disease.CURSE);
                remove(c, slot);
                return;
            } else if (itemId == ItemId.HP_PILL_LARGE) {
                applyHpPill(chr, 500, 100, 400);
                remove(c, slot);
                return;
            } else if (itemId == ItemId.HP_PILL_SMALL) {
                applyHpPill(chr, 10, 2, 8);
                remove(c, slot);
                return;
            } else if (ItemConstants.isTownScroll(itemId)) {
                int banMap = chr.getMapId();
                int banSp = chr.getMap().findClosestPlayerSpawnpoint(chr.getPosition()).getId();
                long banTime = currentServerTime();

                if (ii.getItemEffect(toUse.getItemId()).applyTo(chr)) {
                    if (GameConfig.getServerBoolean("use_banishable_town_scroll")) {
                        chr.setBanishPlayerData(banMap, banSp, banTime);
                    }

                    remove(c, slot);
                } else if (itemId == 2030009 || itemId == 2030010) {
                    c.sendPacket(PacketCreator.serverNotice(1, I18nUtil.getMessage("UseItemHandler.message2")));
                    c.sendPacket(PacketCreator.enableActions());
                }
                return;
            } else if (ItemConstants.isAntibanishScroll(itemId)) {
                if (ii.getItemEffect(toUse.getItemId()).applyTo(chr)) {
                    remove(c, slot);
                } else {
                    chr.dropMessage(5, I18nUtil.getMessage("UseItemHandler.message1"));
                }
                return;
            }

            remove(c, slot);

            if (toUse.getItemId() != ItemId.HAPPY_BIRTHDAY) {
                ii.getItemEffect(toUse.getItemId()).applyTo(chr);
            } else {
                StatEffect mse = ii.getItemEffect(toUse.getItemId());
                for (Character player : chr.getMap().getCharacters()) {
                    mse.applyTo(player);
                }
            }
        }
    }

    /**
     * 血液精华：永久提升血/魔上限。法师系拿一部分血换较多的魔，其余职业全给血。
     * <p>
     * 新手职业吃了没有任何效果。原实现只排除了 0（初心者）和 1000（骑士团新手），<b>漏了战神新手 2000</b>；
     * {@code isBeginnerJob()} 覆盖 0/1000/2000，但 v83 还有第四条新手线 <b>Evan 新手 2001</b>，
     * 它也不在里面。这里单独补上——不直接改 {@code isBeginnerJob()} 是因为初心者经验倍率、
     * 自动加点等多处都在用它，扩语义要单独评估。
     * <p>
     * 法师判定用 {@link Job#getJobStyle()}：它把冒险家法师、炎术士、Evan 三条线统一归到 MAGICIAN，
     * 是本仓库既有的职业分类标准。原实现是 {@code id/100 == 2 || id/100 == 12}，<b>把 Evan 漏成了战士待遇</b>。
     * <p>
     * 药丸不走 wz 的 spec，效果全写在这里，所以调用点必须自己 return，不能落到下面的通用道具流程。
     */
    private void applyHpPill(Character chr, int hpGain, int mageHpGain, int mageMpGain) {
        if (chr.isBeginnerJob() || chr.getJob() == Job.EVAN) {
            return;
        }
        if (chr.getJobStyle() == Job.MAGICIAN) {
            chr.addMaxHpMpExternal(mageHpGain, mageMpGain);
        } else {
            chr.addMaxHpMpExternal(hpGain, 0);
        }
    }

    private void remove(Client c, short slot) {
        InventoryManipulator.removeFromSlot(c, InventoryType.USE, slot, (short) 1, false);
        c.sendPacket(PacketCreator.enableActions());
    }
}
