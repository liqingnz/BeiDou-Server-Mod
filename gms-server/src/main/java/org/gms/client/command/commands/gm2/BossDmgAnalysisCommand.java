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
package org.gms.client.command.commands.gm2;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.string.CharsetConstants;
import org.gms.server.life.Monster;
import org.gms.util.I18nUtil;
import org.gms.util.ThreadLocalUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 列出当前地图上每只存活 BOSS 的伤害分担。
 * <p>
 * 口径是<b>只统计当前还在本地图的玩家</b>——与原实现一致。中途离开或掉线的人，伤害仍计在
 * BOSS 的 {@code takenDamage} 里但不会列出来，所以各行百分比之和通常小于「已掉血量」。
 * 表头因此给的是 BOSS 的剩余血量比例（直接来自 hp/maxHp），而不是各行的合计，免得两个数对不上。
 */
public class BossDmgAnalysisCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("BossDmgAnalysisCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        List<Character> attackers = player.getMap().getAllPlayers();
        boolean found = false;

        for (Monster monster : player.getMap().getAllMonsters()) {
            if (monster == null || !monster.isBoss() || monster.getHp() <= 0) {
                continue;
            }
            found = true;

            int maxHp = monster.getMaxHp();
            Map<Integer, Long> damages = monster.getTakenDamage();

            // 表头黄字、明细普通色，与同类的 @bosshp、@online 一致（两者都是聊天框内的文本）
            player.yellowMessage(I18nUtil.getMessage("BossDmgAnalysisCommand.message2",
                    monster.getName(), formatPercent(monster.getHp(), maxHp)));

            List<Map.Entry<String, Long>> rows = new ArrayList<>();
            for (Character attacker : attackers) {
                Long damage = damages.get(attacker.getId());
                if (damage == null) {
                    continue;   // 没打过这只 BOSS
                }
                rows.add(Map.entry(attacker.getName(), damage));
            }
            rows.sort(Map.Entry.<String, Long>comparingByValue().reversed());

            for (Map.Entry<String, Long> row : rows) {
                player.message(I18nUtil.getMessage("BossDmgAnalysisCommand.message3",
                        row.getKey(), formatPercent(row.getValue(), maxHp), formatDamage(row.getValue())));
            }
        }

        if (!found) {
            player.yellowMessage(I18nUtil.getMessage("BossDmgAnalysisCommand.message4"));
        }
    }

    /**
     * 原实现是 {@code damage * 100L / maxHp} 的整数除法，不足 1% 一律显示 0%，改成保留一位小数。
     * {@code Locale.ROOT} 不能省——按运行环境的默认区域格式化，小数点可能变成逗号。
     */
    private static String formatPercent(long value, long maxHp) {
        if (maxHp <= 0) {
            return String.format(Locale.ROOT, "%.1f", 0D);
        }
        return String.format(Locale.ROOT, "%.1f", value * 100.0 / maxHp);
    }

    /**
     * 中文客户端按亿/万分段，其余语言按千分位——v83 的 BOSS 伤害动辄上亿，紧凑写法好读得多。
     * <p>
     * 原实现在余数为 0 时会多吐一个 0（{@code 100000000} 显示成「1亿0」，
     * {@code 250000000} 显示成「2亿5000万0」），这里只在余数非零时才拼末段。
     */
    private static String formatDamage(long damage) {
        Locale locale = CharsetConstants.getLanguageLocale(ThreadLocalUtil.getClientLang());
        if (!Locale.CHINESE.getLanguage().equals(locale.getLanguage())) {
            return String.format(Locale.ROOT, "%,d", damage);
        }

        if (damage < 10000L) {
            return String.valueOf(damage);
        }

        StringBuilder sb = new StringBuilder();
        long rest = damage;
        if (rest >= 100000000L) {
            sb.append(rest / 100000000L).append(I18nUtil.getMessage("BossDmgAnalysisCommand.message5"));
            rest %= 100000000L;
        }
        if (rest >= 10000L) {
            sb.append(rest / 10000L).append(I18nUtil.getMessage("BossDmgAnalysisCommand.message6"));
            rest %= 10000L;
        }
        if (rest > 0) {
            sb.append(rest);
        }
        return sb.toString();
    }
}
