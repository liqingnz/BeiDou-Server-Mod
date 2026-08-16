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
import org.gms.config.GameConfig;
import org.gms.dao.entity.GameConfigDO;
import org.gms.util.I18nUtil;

/**
 * 现场调整刷怪倍率。GameConfig.update 只改内存不落库，所以这里调的是临时值，
 * 重启后回到 game_config 表里的配置；要持久修改请走 gms-ui 后台。
 */
public class MobRateCommand extends Command {
    private static final String CONFIG_TYPE = "server";
    private static final String CONFIG_SUB_TYPE = "Game Mechanics";
    /** 倍率上限。再高也只是被刷怪点容量卡住，徒增无谓的遍历 */
    private static final float MAX_RATE = 100f;

    {
        setDescription(I18nUtil.getMessage("MobRateCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.yellowMessage(I18nUtil.getMessage("MobRateCommand.message2"));
            return;
        }

        Float baseRate = parseRate(params[0]);
        Float playerFactor = params.length > 1 ? parseRate(params[1]) : null;
        if (baseRate == null || (params.length > 1 && playerFactor == null)) {
            player.yellowMessage(I18nUtil.getMessage("MobRateCommand.message2"));
            player.yellowMessage(I18nUtil.getMessage("MobRateCommand.message5", MAX_RATE));
            return;
        }

        updateConfig("mob_spawn_base_rate", String.valueOf(baseRate));
        if (playerFactor != null) {
            updateConfig("mob_spawnrate_to_player_count", String.valueOf(playerFactor));
        }

        player.dropMessage(6, I18nUtil.getMessage("MobRateCommand.message3",
                GameConfig.getServerFloat("mob_spawn_base_rate"),
                GameConfig.getServerFloat("mob_spawnrate_to_player_count")));
        player.dropMessage(6, I18nUtil.getMessage("MobRateCommand.message4",
                Math.round(player.getMap().getCurrentSpawnRate() * 100) / 100f,
                player.getMap().getMonsterSpawnPointCount()));
    }

    /**
     * Float.parseFloat 会接受 NaN、Infinity，以及溢出成 Infinity 的科学计数法，而 Math.max
     * 也拦不住 NaN。一旦把 NaN 写进配置，getNumShouldSpawn 的乘积取整后恒为 0，
     * 全服所有地图都会停止补怪直到有人再改一次或重启。
     *
     * @return 非法输入返回 null
     */
    private static Float parseRate(String param) {
        float value;
        try {
            value = Float.parseFloat(param);
        } catch (NumberFormatException e) {
            return null;
        }
        if (!Float.isFinite(value) || value < 0f || value > MAX_RATE) {
            return null;
        }
        return value;
    }

    private static void updateConfig(String code, String value) {
        GameConfig.update(GameConfigDO.builder()
                .configType(CONFIG_TYPE)
                .configSubType(CONFIG_SUB_TYPE)
                .configCode(code)
                .configValue(value)
                .build());
    }
}
