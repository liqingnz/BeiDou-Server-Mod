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
import org.gms.client.SkillFactory;
import org.gms.config.GameConfig;
import org.gms.constants.game.GameConstants;
import org.gms.constants.skills.Aran;
import org.gms.net.AbstractPacketHandler;
import org.gms.net.packet.InPacket;

import static java.util.concurrent.TimeUnit.SECONDS;

public class AranComboHandler extends AbstractPacketHandler {

    @Override
    public void handlePacket(InPacket p, Client c) {
        final Character player = c.getPlayer();
        int skillLevel = player.getSkillLevel(SkillFactory.getSkill(Aran.COMBO_ABILITY));
        if (GameConstants.isAran(player.getJob().getId()) && (skillLevel > 0 || player.getJob().getId() == 2000)) {
            final long currentTime = currentServerTime();
            short combo = player.getCombo();
            // 连击断连的判定窗口。配置缺失时 GameConfig.getServerInt 返回 0，那样每次攻击都会断连，
            // 所以非正数一律退回默认的 3 秒
            int keepSeconds = GameConfig.getServerInt("aran_combo_last_time");
            long comboKeepTime = SECONDS.toMillis(keepSeconds > 0 ? keepSeconds : 3);
            if ((currentTime - player.getLastCombo()) > comboKeepTime && combo > 0) {
                combo = 0;
            }

            int gmBonus = GameConfig.getServerInt("aran_combo_gm_bonus");
            short prevCombo = combo;
            int nextCombo = combo + 1 + (gmBonus > 0 && player.gmLevel() > 2 ? gmBonus : 0);
            // 满连之后不再清零，长时间不断连会一路加上去；combo 是 short，加到 32767 再自增会绕成负数
            combo = (short) Math.min(nextCombo, Short.MAX_VALUE);

            // 原实现用 switch 匹配恰好等于 10 的倍数，GM 加成会让连击一次跨过多个阈值而整段跳过，
            // 所以改判「本次是否跨进了新的十位档」
            int prevTier = prevCombo / 10;
            int newTier = combo / 10;
            if (newTier > prevTier) {
                applyComboBuff(player, combo, skillLevel);
            }
            player.setCombo(combo);
            player.setLastCombo(currentTime);
        }
    }

    /**
     * 按当前连击数把连击增益挂上。
     * <p>
     * 消耗型连击技能（{@link RangedAttackHandler} 里的三招）扣完连击之后必须补调一次：
     * {@code Character.setCombo} 在连击数下降时会取消 ARAN_COMBO 增益，而本类只在跨进新的十位档
     * 时才重挂——不补这一下的话，客户端还显示着剩余连击数、增益却已经没了，要一直打到下一个整十
     * 才恢复，最长空窗 9 刀。
     */
    static void applyComboBuff(Character player, short combo, int skillLevel) {
        boolean ignoreSkillLevel = player.getJob().getId() == 2000;
        int newTier = combo / 10;
        int tier;
        if (newTier <= 10) {
            // 100 连以内保持原语义：档位超过技能等级就不给
            tier = ignoreSkillLevel || newTier <= skillLevel ? newTier : 0;
        } else {
            // 满连之后没有更高的档，按自己的最高档每 10 连续期一次。
            // applyComboBuff 服务端是 Long.MAX_VALUE 不过期，续期只为维持客户端 99999ms 的图标，
            // 因此不必每刀都发包重登
            tier = ignoreSkillLevel ? 10 : Math.min(skillLevel, 10);
        }
        if (tier > 0) {
            SkillFactory.getSkill(Aran.COMBO_ABILITY).getEffect(tier).applyComboBuff(player, combo);
        }
    }

    /** 供消耗连击的攻击处理器调用，技能等级自己查 */
    static void applyComboBuff(Character player, short combo) {
        applyComboBuff(player, combo, player.getSkillLevel(SkillFactory.getSkill(Aran.COMBO_ABILITY)));
    }
}
