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

/*
   @Author: Arthur L - Refactored command content into modules
*/
package org.gms.client.command.commands.gm0;

import org.gms.client.BuffStat;
import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.config.GameConfig;
import org.gms.server.maps.MapleMap;
import org.gms.util.I18nUtil;

public class RatesCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("RatesCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        float exp_buff = 1;
        // travel rates 不在这里进行展示 因为它是全局的 与角色无关
        String noviceMsg = player.hasNoviceExpRate() ? I18nUtil.getMessage("ShowRatesCommand.message7") : "";
        String showMsg_ = "#e" + I18nUtil.getMessage("RatesCommand.message2") + "#n\r\n\r\n";
        Integer expBuff = player.getBuffedValue(BuffStat.EXP_BUFF);
        if (expBuff != null) {
            exp_buff = 2;
        }
        showMsg_ += I18nUtil.getMessage("ShowRatesCommand.message6") + "#e#b" + player.getExpRate() * exp_buff * player.getFamilyExp() + "x#k#n " + noviceMsg + "\r\n";
        if (player.getMobExpRate() > 1) {
            showMsg_ += I18nUtil.getMessage("RatesCommand.message4") + "#e#b" + Math.round(player.getMobExpRate() * 100f) / 100f + "x#k#n" + "\r\n";
        }
        showMsg_ += I18nUtil.getMessage("ShowRatesCommand.message12") + "#e#b" + player.getMesoRate() + "x#k#n" + "\r\n";
        showMsg_ += I18nUtil.getMessage("ShowRatesCommand.message17") + "#e#b" + player.getDropRate() *  player.getFamilyDrop() + "x#k#n" + "\r\n";
        showMsg_ += I18nUtil.getMessage("ShowRatesCommand.message22") + "#e#b" + player.getBossDropRate() + "x#k#n" + "\r\n";
        if (GameConfig.getServerBoolean("use_quest_rate")) {
            showMsg_ += I18nUtil.getMessage("RatesCommand.message3") + "#e#b" + c.getWorldServer().getQuestRate() + "x#k#n" + "\r\n";
        }
        showMsg_ += describeSpawnRate(player.getMap());

        player.showHint(showMsg_, 300);
    }

    /**
     * 刷怪倍率这一段单独拼：配置倍率之外还压着 wz 的地图系数和刷怪点容量上限两层，
     * 只报配置值的话，玩家看到的倍率和地上的怪数对不上。括号里给的是能落地的怪数，
     * 已经按容量上限截断过——倍率乘出来超过 `刷怪点数 × mob_spawn_point_capacity` 的部分刷不出来。
     */
    private static String describeSpawnRate(MapleMap map) {
        float wzMobRate = map.getWzMonsterRate();
        int spawnPoints = map.getMonsterSpawnPointCount();
        int actualSpawn = Math.min(map.getSpawnCountTarget(), map.getSpawnCountCeiling());

        return (wzMobRate == 1.0f
                ? I18nUtil.getMessage("RatesCommand.message5",
                        round2(map.getCurrentSpawnRate()), actualSpawn, spawnPoints)
                : I18nUtil.getMessage("RatesCommand.message6", round2(map.getCurrentSpawnRate()),
                        round2(wzMobRate), round2(map.getEffectiveSpawnRate()), actualSpawn, spawnPoints))
                + "\r\n";
    }

    private static float round2(double value) {
        return Math.round(value * 100) / 100f;
    }
}
