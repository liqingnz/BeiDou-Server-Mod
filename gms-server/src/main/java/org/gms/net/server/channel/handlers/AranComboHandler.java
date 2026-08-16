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
            // 连击断连的判定窗口，默认 3 秒与原硬编码一致
            long comboKeepTime = SECONDS.toMillis(GameConfig.getServerInt("aran_combo_last_time"));
            if ((currentTime - player.getLastCombo()) > comboKeepTime && combo > 0) {
                combo = 0;
            }
            int gmBonus = GameConfig.getServerInt("aran_combo_gm_bonus");
            int nextCombo = combo + 1 + (gmBonus > 0 && player.gmLevel() > 2 ? gmBonus : 0);
            // 满连之后不再清零，长时间不断连会一路加上去；combo 是 short，加到 32767 再自增会绕成负数
            combo = (short) Math.min(nextCombo, Short.MAX_VALUE);

            if (combo > 100) {
                // 满连之后原实现不再命中任何 case，combo buff 只能等自然过期。
                // 这里每次命中都按满级重新施加，让持续连击的战神保住 buff
                SkillFactory.getSkill(Aran.COMBO_ABILITY).getEffect(10).applyComboBuff(player, combo);
            } else {
                switch (combo) {
                    case 10:
                    case 20:
                    case 30:
                    case 40:
                    case 50:
                    case 60:
                    case 70:
                    case 80:
                    case 90:
                    case 100:
                        if (player.getJob().getId() != 2000 && (combo / 10) > skillLevel) {
                            break;
                        }
                        SkillFactory.getSkill(Aran.COMBO_ABILITY).getEffect(combo / 10).applyComboBuff(player, combo);
                        break;
                }
            }
            player.setCombo(combo);
            player.setLastCombo(currentTime);
        }
    }
}
