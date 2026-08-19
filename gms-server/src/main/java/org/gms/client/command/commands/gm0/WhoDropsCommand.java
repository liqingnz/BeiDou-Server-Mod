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
import org.gms.util.I18nUtil;
import org.gms.util.MobTextUtil;
import org.gms.util.Pair;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 按物品查掉落来源（{@code @whodrops <物品名或物品id>}）。
 * <p>
 * 参数是纯数字就按物品 id 精确查，否则按名字模糊查——同一个入口收两种输入，
 * 与 {@code Command.resolveTarget} 一个思路，省得再开一个 {@code @whodrops2}。
 *
 * <h2>为什么整条链路都挂在脚本上</h2>
 * 掉落源多的物品实测能到 800 多个（{@code drop_data} 里 180 件物品的掉落源超过 30 个），
 * 一屏根本装不下，而客户端对话框高度固定又没有滚动条——装不下的部分不是被服务端截掉，
 * 是压根没画出来。所以要翻页；而翻页需要「点了之后还能回到服务端」，
 * {@code npcTalk} 那种一发了之的对话框做不到，必须走 NPC 会话脚本
 * （{@code scripts[-zh-CN]/npc/whoDropsList.js}）。
 * <p>
 * 顺带解决了按名搜一搜一大把的问题（「智力卷轴」能出头盔／铠甲／披风各一版）：
 * 搜到不止一件时先让玩家挑，只搜到一件就直接翻页看掉落源。
 * <p>
 * 怪物立绘见 {@link org.gms.util.MobTextUtil}——立绘路径里的怪 id 必须是 link 解析过的，
 * 直接用掉落源 id 会让 20% 的怪把客户端搞崩。想按分类翻着看用 {@code @droptable}。
 */
public class WhoDropsCommand extends Command {
    /**
     * 掉落源每页几条。
     * <p>
     * 服务端量不到客户端的渲染高度，只能按排版估：一条占一行、行首一张立绘（比文字行高）。
     * 每条前面带的序号是**跨页连续**的，正是为了实测「翻到第几条开始看不见」——
     * 页底显示的条数区间与看得见的最后一个序号一对，就知道该往回收多少。
     * 嫌少嫌多直接调这里，翻页本身不受影响。
     */
    private static final int DROPPERS_PER_PAGE = 25;

    /** 选单里最多列几件物品 */
    private static final int MENU_LIMIT = 30;

    private static final String SCRIPT_NAME = "whoDropsList";

    /**
     * 一次查询的全部状态：候选物品 + 当前物品的掉落源。
     * <p>
     * 对脚本是个不透明句柄——脚本在 {@code start()} 里取走，之后每次调用再传回来。
     * <b>不放在服务端的静态表里</b>：玩家用右上角叉掉对话框时走的是
     * {@code NPCScriptManager.dispose}，那条路不会回调脚本，脚本也就没机会通知服务端清理，
     * 静态表会留下一份最多几百条的掉落源。挂在脚本变量上则随
     * {@code resetContext} 一起消失，不用惦记回收。
     */
    public static final class Query {
        private List<Pair<Integer, String>> choices;    // 待挑的物品；只搜到一件时为 null
        private int itemId;
        private List<Pair<Integer, Integer>> droppers;  // (怪物id, 原始 chance)
    }

    /**
     * 指令 → 脚本的交接台，key 是角色 id。
     * <p>
     * 只在 {@code openNpc} 与脚本 {@code start()} 之间存在一瞬，脚本一取就删。
     */
    private static final Map<Integer, Query> handoff = new ConcurrentHashMap<>();

    {
        setDescription(I18nUtil.getMessage("WhoDropsCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.dropMessage(5, I18nUtil.getMessage("WhoDropsCommand.message2"));
            return;
        }

        // 参数原样取自 getLastCommandMessage：params 被 CommandsExecutor 统一转过小写，
        // 物品名里的大小写会丢，按名搜索得用没被动过的这份
        String search = player.getLastCommandMessage().trim();
        List<Pair<Integer, String>> items = findItems(search);
        if (items.isEmpty()) {
            player.dropMessage(5, I18nUtil.getMessage("WhoDropsCommand.message3"));
            return;
        }

        Query query = new Query();
        if (items.size() == 1) {
            // 只有一件就别多一次点击，直接进掉落源分页
            if (!loadDroppers(query, items.getFirst().getLeft())) {
                player.dropMessage(5, I18nUtil.getMessage("WhoDropsCommand.message5"));
                return;
            }
        } else {
            if (items.size() > MENU_LIMIT) {
                // 选单装不下就明说，让玩家自己把关键字缩窄，
                // 而不是对着一份看不出被截过的清单挑
                player.yellowMessage(I18nUtil.getMessage("WhoDropsCommand.message7", items.size(), MENU_LIMIT));
                items = items.subList(0, MENU_LIMIT);
            }
            query.choices = items;
        }

        handoff.put(player.getId(), query);
        if (!player.getAbstractPlayerInteraction().openNpc(NpcId.MAPLE_ADMINISTRATOR, SCRIPT_NAME)) {
            handoff.remove(player.getId());
            player.yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }

    // ---------------------------------------------------------------------
    // 以下 public static 供 scripts[-zh-CN]/npc/whoDropsList.js 调用
    // ---------------------------------------------------------------------

    /** 脚本在 start() 里取走本次查询；取走即从交接台删除。没有则返回 null */
    public static Query takeQuery(Character chr) {
        return handoff.remove(chr.getId());
    }

    /**
     * 待挑的物品清单。
     *
     * @return [[物品id, 物品名], ...]；只搜到一件（已经直接进分页）时返回空数组
     */
    public static Object[][] getChoices(Query query) {
        if (query == null || query.choices == null) {
            return new Object[0][];
        }
        List<Pair<Integer, String>> choices = query.choices;
        Object[][] rows = new Object[choices.size()][2];
        for (int i = 0; i < choices.size(); i++) {
            rows[i][0] = choices.get(i).getLeft();
            rows[i][1] = choices.get(i).getRight();
        }
        return rows;
    }

    /**
     * 玩家在选单里挑定一件物品，载入它的掉落源。
     *
     * @return 是否有掉落源；false 时脚本该提示「查不到」而不是翻一页空的
     */
    public static boolean selectItem(Query query, int itemId) {
        if (query == null) {
            return false;
        }
        // choices 保留不清：翻页界面上的「上一步」要靠它回到物品列表
        return loadDroppers(query, itemId);
    }

    /** 当前物品的掉落源总页数 */
    public static int getPageCount(Query query) {
        if (query == null || query.droppers == null) {
            return 0;
        }
        return (query.droppers.size() + DROPPERS_PER_PAGE - 1) / DROPPERS_PER_PAGE;
    }

    /**
     * 渲染一页掉落源（不含翻页控件——那部分由脚本按自己的语言层拼）。
     * <p>
     * 掉率按角色自己的爆率折算并掐在 100%；怪名与立绘走 {@link MobTextUtil}。
     *
     * @param page 从 0 开始
     * @return 该页正文；页码越界或没有会话时返回空串
     */
    public static String renderPage(Query query, Character chr, int page) {
        if (query == null || query.droppers == null) {
            return "";
        }
        List<Pair<Integer, Integer>> droppers = query.droppers;
        int start = page * DROPPERS_PER_PAGE;
        if (page < 0 || start >= droppers.size()) {
            return "";
        }
        int end = Math.min(start + DROPPERS_PER_PAGE, droppers.size());

        StringBuilder output = new StringBuilder();
        // 整行都在 i18n 里：中文「#z#掉落于：」不留空格、英文「#z# is dropped by:」要留，
        // 拆成「图标 + 半句」拼的话空格没处放（properties 会把值前导空格吃掉）
        output.append(I18nUtil.getMessage("WhoDropsCommand.message4", query.itemId))
                .append("  ")
                .append(I18nUtil.getMessage("WhoDropsCommand.message8", start + 1, end, droppers.size()))
                .append("\r\n\r\n");

        for (int i = start; i < end; i++) {
            Pair<Integer, Integer> dropper = droppers.get(i);
            int mobId = dropper.getLeft();
            // 一条 Monster 同时供立绘与 isBoss 用，省一次 LifeFactory 查找
            Monster mob = LifeFactory.getMonster(mobId);
            float rate = (mob != null && mob.isBoss()) ? chr.getBossDropRate() : chr.getDropRate();
            // 序号跨页连续：看得见的最后一个序号就是这一页的实际容量
            output.append("#e").append(i + 1).append(".#n")
                    .append(mob == null ? MobTextUtil.mobImage(mobId) : MobTextUtil.mobImage(mob))
                    .append(MobTextUtil.mobName(mobId)).append(" #r")
                    .append(formatChance(dropper.getRight(), rate))
                    .append("#k%\r\n");
        }
        return output.toString();
    }

    // ---------------------------------------------------------------------

    private static boolean loadDroppers(Query query, int itemId) {
        query.itemId = itemId;
        // 查询不设 LIMIT：要翻页就得知道总数，而单件物品的 drop_data 行数是几十量级
        query.droppers = ItemInformationProvider.getInstance().getWhoDropsWithChance(itemId);
        return !query.droppers.isEmpty();
    }

    /** 纯数字按 id 精确查，否则按名字模糊查 */
    private static List<Pair<Integer, String>> findItems(String search) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        int itemId;
        try {
            itemId = Integer.parseInt(search);
        } catch (NumberFormatException e) {
            // 不是数字就当名字搜。getItemDataByName 已经是 contains 匹配
            return ii.getItemDataByName(search);
        }

        String name = ii.getName(itemId);
        if (name == null || name.isEmpty() || "null".equals(name)) {
            return List.of();
        }
        List<Pair<Integer, String>> single = new ArrayList<>(1);
        single.add(new Pair<>(itemId, name));
        return single;
    }

    /**
     * drop_data 的 chance 满值是 1000000（=100%），乘上角色自己的爆率后化成百分数，保留两位。
     * 爆率调高后算出来可能超过 100%，掐在 100%——实际判定同样是必掉，显示 300% 只会让人以为是 bug。
     */
    private static float formatChance(int chance, float dropRate) {
        float percent = Math.round((float) chance / 100 * dropRate) / 100f;
        return Math.min(100f, percent);
    }
}
