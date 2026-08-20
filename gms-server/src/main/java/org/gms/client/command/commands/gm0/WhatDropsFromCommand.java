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

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.server.ItemInformationProvider;
import org.gms.server.life.LifeFactory;
import org.gms.server.life.Monster;
import org.gms.server.life.MonsterDropEntry;
import org.gms.server.life.MonsterInformationProvider;
import org.gms.server.life.MonsterStats;
import org.gms.server.quest.Quest;
import org.gms.util.I18nUtil;
import org.gms.util.MobTextUtil;
import org.gms.util.Pair;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 按怪物查掉落（{@code @whatdropsfrom <怪物名>}）。
 * <p>
 * 与 {@link WhoDropsCommand} 是一对：那边按物品找怪，这边按怪找物品。结构也照着来——
 * 搜到不止一只怪时先开选单让玩家挑，挑完再分页看掉落；只搜到一只就直接进掉落页。
 * 界面在 {@code scripts[-zh-CN]/MapleLand/whatDropsFromList.js}，
 * 理由同 {@code WhoDropsCommand}：翻页需要点击能回到服务端，{@code npcTalk} 做不到。
 * <p>
 * 展示口径对齐 {@code @mapdrops}（{@code BeiDouSpecial/当前地图掉落_当前地图.js}）：
 * 怪物立绘 + 名字 + 血蓝攻防，然后是「物品名称 / 基础掉率 / 你的掉率」三列的掉落一览，
 * 任务道具单独标出。<b>没有照搬那边的列宽算法</b>——它靠 {@code padEnd(width, '\t')}
 * 按字符串长度补制表符，中文按半宽算再取整，是一套只能靠肉眼调的经验值；
 * 这里直接用制表符分列，对不齐再调。
 */
public class WhatDropsFromCommand extends Command {
    /**
     * 掉落每页几件。
     * <p>
     * 比 {@code @whodrops} 那边小：每页顶上还压着 5 行怪物信息（立绘 + 名字 + 三行属性）。
     * 服务端量不到客户端渲染高度，这个数是估的，实测后直接调。
     */
    private static final int DROPS_PER_PAGE = 12;

    /** 怪物选单每页几只 */
    private static final int MOBS_PER_PAGE = 25;

    private static final String SCRIPT_NAME = "whatDropsFromList";

    /**
     * 一次查询的全部状态。对脚本是不透明句柄，理由同 {@link WhoDropsCommand.Query}：
     * 玩家叉掉对话框走的是不回调脚本的那条 dispose，服务端静态表清不掉。
     */
    public static final class Query {
        private List<Pair<Integer, String>> choices;    // 待挑的怪；只搜到一只时为 null
        private int mobId;
        private List<MonsterDropEntry> drops;
    }

    /** 指令 → 脚本的交接台，脚本 {@code start()} 一取就删 */
    private static final Map<Integer, Query> handoff = new ConcurrentHashMap<>();

    {
        setDescription(I18nUtil.getMessage("WhatDropsFromCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.dropMessage(5, I18nUtil.getMessage("WhatDropsFromCommand.message2"));
            return;
        }

        // params 被 CommandsExecutor 统一转过小写，怪名的大小写会丢，得用没被动过的这份
        String search = player.getLastCommandMessage().trim();
        List<Pair<Integer, String>> mobs = MonsterInformationProvider.getMobsIDsFromName(search);
        if (mobs.isEmpty()) {
            player.dropMessage(5, I18nUtil.getMessage("WhatDropsFromCommand.message5"));
            return;
        }

        Query query = new Query();
        if (mobs.size() == 1) {
            if (!loadDrops(query, mobs.getFirst().getLeft())) {
                player.dropMessage(5, I18nUtil.getMessage("WhatDropsFromCommand.message6"));
                return;
            }
        } else {
            query.choices = mobs;
        }

        handoff.put(player.getId(), query);
        if (!player.getAbstractPlayerInteraction().openNpc(NpcId.MAPLE_ADMINISTRATOR, SCRIPT_NAME)) {
            handoff.remove(player.getId());
            player.yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }

    // ---------------------------------------------------------------------
    // 以下 public static 供 scripts[-zh-CN]/MapleLand/whatDropsFromList.js 调用
    // ---------------------------------------------------------------------

    /** 脚本在 start() 里取走本次查询；取走即从交接台删除。没有则返回 null */
    public static Query takeQuery(Character chr) {
        return handoff.remove(chr.getId());
    }

    /** 搜到的怪物总数；只搜到一只（已经直接进掉落页）时返回 0 */
    public static int getChoiceCount(Query query) {
        return (query == null || query.choices == null) ? 0 : query.choices.size();
    }

    /** 怪物选单的总页数 */
    public static int getChoicePageCount(Query query) {
        int total = getChoiceCount(query);
        return (total + MOBS_PER_PAGE - 1) / MOBS_PER_PAGE;
    }

    /**
     * 怪物选单的一页。
     *
     * @return [[怪物id, 怪物名], ...]；下标是页内序号
     */
    public static Object[][] getChoices(Query query, int page) {
        int total = getChoiceCount(query);
        int start = page * MOBS_PER_PAGE;
        if (page < 0 || start >= total) {
            return new Object[0][];
        }
        int end = Math.min(start + MOBS_PER_PAGE, total);

        Object[][] rows = new Object[end - start][2];
        for (int i = start; i < end; i++) {
            rows[i - start][0] = query.choices.get(i).getLeft();
            rows[i - start][1] = MobTextUtil.mobName(query.choices.get(i).getLeft());
        }
        return rows;
    }

    /**
     * 玩家挑定一只怪，载入它的掉落。
     *
     * @return 是否有掉落；false 时脚本该提示「没有掉落」而不是翻一页空的
     */
    public static boolean selectMob(Query query, int mobId) {
        // choices 保留不清：掉落页的「上一步」要靠它回到怪物列表
        return query != null && loadDrops(query, mobId);
    }

    /** 当前怪物的掉落总页数 */
    public static int getPageCount(Query query) {
        if (query == null || query.drops == null) {
            return 0;
        }
        return (query.drops.size() + DROPS_PER_PAGE - 1) / DROPS_PER_PAGE;
    }

    /**
     * 渲染一页掉落（不含翻页控件——那部分由脚本按自己的语言层拼）。
     * <p>
     * 每页都带怪物信息块：翻到第 3 页还得知道在看谁。
     *
     * @param page 从 0 开始
     * @return 该页正文；页码越界或没有会话时返回空串
     */
    public static String renderPage(Query query, Character chr, int page) {
        if (query == null || query.drops == null) {
            return "";
        }
        List<MonsterDropEntry> drops = query.drops;
        int start = page * DROPS_PER_PAGE;
        if (page < 0 || start >= drops.size()) {
            return "";
        }
        int end = Math.min(start + DROPS_PER_PAGE, drops.size());

        StringBuilder output = new StringBuilder();
        appendMobHeader(output, query.mobId);

        output.append("\r\n").append(I18nUtil.getMessage("WhatDropsFromCommand.message3"))
                .append("  ")
                .append(I18nUtil.getMessage("WhatDropsFromCommand.message7", start + 1, end, drops.size()))
                .append("\r\n")
                .append(I18nUtil.getMessage("WhatDropsFromCommand.message8"))
                .append("\r\n");

        ItemInformationProvider ii = ItemInformationProvider.getInstance();
        float rateMultiplier = chr.getDropRate() * chr.getFamilyDrop();
        for (int i = start; i < end; i++) {
            MonsterDropEntry drop = drops.get(i);
            String itemName = ii.getName(drop.itemId);
            if (itemName == null || itemName.isEmpty()) {
                itemName = String.valueOf(drop.itemId);
            }
            float base = drop.chance / 10000f;
            output.append("#v").append(drop.itemId).append("##b").append(itemName).append("#k\t")
                    .append(formatChance(base)).append("%\t#d")
                    .append(formatChance(Math.min(100f, base * rateMultiplier))).append("%#k");
            if (drop.questid > 0) {
                Quest quest = Quest.getInstance(drop.questid);
                output.append("  #r").append(I18nUtil.getMessage("WhatDropsFromCommand.message9")).append("#k")
                        .append(quest == null ? "" : " " + quest.getName());
            }
            output.append("\r\n");
        }
        return output.toString();
    }

    // ---------------------------------------------------------------------

    /** 怪物信息块：立绘 + 名字 + 血蓝攻防，口径与 @mapdrops 一致 */
    private static void appendMobHeader(StringBuilder output, int mobId) {
        Monster mob = LifeFactory.getMonster(mobId);
        output.append(mob == null ? MobTextUtil.mobImage(mobId) : MobTextUtil.mobImage(mob)).append("\r\n")
                .append("[ #e#b").append(MobTextUtil.mobName(mobId)).append("#k#n ]");
        if (mob == null) {
            output.append("\r\n");
            return;
        }

        MonsterStats stats = mob.getStats();
        output.append("  Lv.").append(mob.getLevel()).append("\r\n")
                .append(I18nUtil.getMessage("WhatDropsFromCommand.message10", mob.getMaxHp(), mob.getMaxMp())).append("\r\n")
                .append(I18nUtil.getMessage("WhatDropsFromCommand.message11", stats.getPADamage(), stats.getPDDamage())).append("\r\n")
                .append(I18nUtil.getMessage("WhatDropsFromCommand.message12", stats.getMADamage(), stats.getMDDamage())).append("\r\n");
    }

    private static boolean loadDrops(Query query, int mobId) {
        query.mobId = mobId;
        // 过滤掉 itemId <= 0（金币等）与查不到名字的条目，与 @mapdrops 的口径一致
        List<MonsterDropEntry> all = MonsterInformationProvider.getInstance().retrieveDrop(mobId);
        List<MonsterDropEntry> kept = new ArrayList<>(all.size());
        ItemInformationProvider ii = ItemInformationProvider.getInstance();
        for (MonsterDropEntry drop : all) {
            if (drop.itemId <= 0 || drop.chance <= 0) {
                continue;
            }
            String name = ii.getName(drop.itemId);
            if (name == null || name.isEmpty() || "null".equals(name)) {
                continue;
            }
            kept.add(drop);
        }
        // 掉率高的排前面，与 @whodrops 一致
        kept.sort((a, b) -> Integer.compare(b.chance, a.chance));
        query.drops = kept;
        return !kept.isEmpty();
    }

    /** 掉率化成百分数，保留 4 位——稀有掉落 0.0001% 这个量级，位数少了全是 0.00 */
    private static String formatChance(float percent) {
        return String.format("%.4f", percent);
    }
}
