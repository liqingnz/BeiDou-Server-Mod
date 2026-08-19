/*
    This file is part of the BeiDou MapleStory Server
    Copyright (C) 2026 BeiDou

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
package org.gms.server.maps;

import org.gms.client.Character;
import org.gms.client.QuestStatus;
import org.gms.constants.id.ItemId;
import org.gms.util.I18nUtil;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 需要前置条件才能瞬移进入的地图。
 * <p>
 * 与 {@link FieldLimit#CANNOTVIPROCK} 的区别：那一位来自 Map.wz 的 {@code info/fieldLimit}，
 * 是对所有人永久生效的硬开关，表达不了「完成某任务后才放行」。本类补的正是这一层——
 * 同一张图，达成条件的人可以传，没达成的不行。
 * <p>
 * <b>为什么要有这层</b>：这些地图的门槛原本只挂在 portal 脚本上（少林是
 * {@code mahavira_enter}，时间神殿是 {@code timeQuest}），而瞬移之石、家族团聚这类
 * 传送完全绕开 portal，等于给任务门开了后门。
 * <p>
 * <b>条件表从哪来</b>：不是拍脑袋定的，是从既有 portal 脚本反推的，改门槛时两边要同步改。
 * <ul>
 *   <li>少林：{@code scripts-zh-CN/portal/mahavira_enter.js} —— 任务 8530「拜山门」</li>
 *   <li>时间神殿：{@code scripts-zh-CN/portal/timeQuest.js} —— 每段路一个任务，
 *       该脚本用 {@code (mapid - 270010000) / 100} 算段号再查任务，此处展开成显式表</li>
 * </ul>
 */
public final class TeleportRestriction {

    /**
     * 一条准入规则。
     *
     * @param questId    需完成的任务 id
     * @param bypassItem 持有即可放行的道具 id，0 表示无此旁路
     * @param messageKey 拦下时给玩家看的提示，走 i18n
     */
    private record Rule(int questId, int bypassItem, String messageKey) {
        Rule(int questId, String messageKey) {
            this(questId, NO_BYPASS_ITEM, messageKey);
        }
    }

    /** {@link Rule#bypassItem()} 的空值：该规则没有「持有某道具即可放行」的旁路。 */
    private static final int NO_BYPASS_ITEM = 0;

    private static final String MSG_MAHAVIRA = "TeleportRestriction.mahavira";
    private static final String MSG_TEMPLE_OF_TIME = "TeleportRestriction.templeOfTime";

    private static final Map<Integer, Rule> RULES = new HashMap<>();

    static {
        // ---------------- 少林（大雄宝殿及其后的地图）----------------
        // 门在 702030000 山腰 与 702050000 广场 两个入口上，脚本 mahavira_enter。
        // 藏经阁与塔林都在大雄宝殿之后，不单独设门，但同样不许直接传送进去。
        final int questMahavira = 8530;
        for (int mapId : new int[]{
                702100000,  // 大雄宝殿
                702070100,  // 藏经阁一到二层
                702070200,  // 藏经阁三到四层
                702070300,  // 藏经阁五到六层
                702070400,  // 藏经阁七层
                702080000,  // 塔林
        }) {
            RULES.put(mapId, new Rule(questMahavira, MSG_MAHAVIRA));
        }

        // ---------------- 时间神殿 ----------------
        // 地图链是「之路N →(任务门)→ 邂逅N → 之路N+1」，所以邂逅N 与 之路N+1
        // 同在第 N 道门之后，两者用同一个任务把关。
        // 追忆之路（270010xxx）：门 3501-3504，走完第五段用 3507 进冻结的过去
        putTempleSection(270010000, new int[]{3501, 3502, 3503, 3504});
        RULES.put(270010111, new Rule(3501, MSG_TEMPLE_OF_TIME));   // 关照者的房间，挂在邂逅1 之后
        RULES.put(270020000, new Rule(3507, MSG_TEMPLE_OF_TIME));   // 冻结的过去

        // 后悔之路（270020xxx）：门 3508-3511，走完用 3514 进燃烧的过去
        putTempleSection(270020000, new int[]{3508, 3509, 3510, 3511});
        RULES.put(270020211, new Rule(3509, MSG_TEMPLE_OF_TIME));   // 魔法术士的房间，挂在邂逅2 之后
        RULES.put(270030000, new Rule(3514, MSG_TEMPLE_OF_TIME));   // 燃烧的过去

        // 忘却之路（270030xxx）：门 3515-3518，走完用 3519 进破碎的回廊
        putTempleSection(270030000, new int[]{3515, 3516, 3517, 3518});
        RULES.put(270030411, new Rule(3518, MSG_TEMPLE_OF_TIME));   // 记录者的房间，挂在邂逅4 之后
        RULES.put(270040000, new Rule(3519, MSG_TEMPLE_OF_TIME));   // 破碎的回廊

        // 神殿废墟：timeQuest 里这一段允许持有「时间的碎片」直接通过
        RULES.put(270040100, new Rule(3522, ItemId.PIECE_OF_TIME, MSG_TEMPLE_OF_TIME));
    }

    /**
     * 登记时间神殿一段路的准入规则。
     * <p>
     * {@code base} 是该段的「过去」图（如追忆段的 270010000）。第 N 道门放行后
     * 能到的是「邂逅N」（{@code base + N*100 + 10}）与紧随其后的「之路N+1」
     * （{@code base + (N+1)*100}），两者同用第 N 个任务把关。
     * 「之路1」不登记——它是本段入口，由上一段的门管。
     */
    private static void putTempleSection(int base, int[] questIds) {
        for (int i = 0; i < questIds.length; i++) {
            int gate = i + 1;
            RULES.put(base + gate * 100 + 10, new Rule(questIds[i], MSG_TEMPLE_OF_TIME));
            RULES.put(base + (gate + 1) * 100, new Rule(questIds[i], MSG_TEMPLE_OF_TIME));
        }
    }

    private TeleportRestriction() {
    }

    /**
     * 目标地图是否登记了瞬移准入条件。调用方一般不需要它，直接用
     * {@link #checkTeleport(Character, int)} 即可。
     */
    public static boolean isRestricted(int mapId) {
        return RULES.containsKey(mapId);
    }

    /**
     * 判定该角色能否瞬移到目标地图。
     * <p>
     * 放行返回 {@link Optional#empty()}；拦下返回已本地化的提示文案，调用方直接展示即可。
     * GM（{@code gmLevel > 2}）一律放行，与 portal 脚本 timeQuest 的口径保持一致。
     *
     * @param chr         发起瞬移的角色
     * @param targetMapId 目标地图 id
     */
    public static Optional<String> checkTeleport(Character chr, int targetMapId) {
        Rule rule = RULES.get(targetMapId);
        if (rule == null) {
            return Optional.empty();
        }
        if (chr == null) {
            return Optional.empty();
        }
        if (chr.gmLevel() > 2) {
            return Optional.empty();
        }
        if (chr.getQuestStatus(rule.questId()) == QuestStatus.Status.COMPLETED.getId()) {
            return Optional.empty();
        }
        if (rule.bypassItem() != NO_BYPASS_ITEM && chr.haveItem(rule.bypassItem())) {
            return Optional.empty();
        }
        return Optional.of(I18nUtil.getMessage(rule.messageKey()));
    }
}
