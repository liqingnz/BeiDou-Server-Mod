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
 * <p>
 * 按名字搜常常一搜一大把（「智力卷轴」能出头盔／铠甲／披风各一版），所以搜到不止一件时
 * 先用 {@code scripts[-zh-CN]/npc/whoDropsList.js} 开个选单让玩家挑，挑完再查掉落源；
 * 只搜到一件就直接出结果，不多一次点击。
 * <p>
 * 怪物立绘见 {@link org.gms.util.MobTextUtil}——立绘路径里的怪 id 必须是 link 解析过的，
 * 直接用掉落源 id 会让 20% 的怪把客户端搞崩。想按分类翻着看用 {@code @droptable}。
 */
public class WhoDropsCommand extends Command {
    /**
     * 单件物品最多列几个掉落源。
     * <p>
     * 客户端对话框高度固定且没有滚动条，装不下的部分不会画出来——服务端这边一个字都没截
     * （{@code npcTalk} 直到 {@code writeString} 全程无长度检查），所以只能自己收着发。
     * 超出的条数在末尾明说，让玩家知道还有没列完的，而不是以为就这么多。
     */
    private static final int DROPPER_LIMIT = 12;

    /** 选单里最多列几件物品 */
    private static final int MENU_LIMIT = 30;

    /**
     * 等待玩家在选单里挑的候选物品，key 是角色 id。
     * <p>
     * 不靠 {@code getLastCommandMessage()} 在开着对话框的这段时间保持不变，也省得
     * 选完再把 {@code getItemDataByName} 那趟全表模糊匹配重跑一遍。
     */
    private static final Map<Integer, List<Pair<Integer, String>>> pendingChoices = new ConcurrentHashMap<>();

    private static final String SCRIPT_NAME = "whoDropsList";

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

        if (items.size() == 1) {
            showDroppers(player, items.getFirst().getLeft());
            return;
        }

        if (items.size() > MENU_LIMIT) {
            // 选单装不下就明说，让玩家自己把关键字缩窄，而不是对着一份看不出被截过的清单挑
            player.yellowMessage(I18nUtil.getMessage("WhoDropsCommand.message7", items.size(), MENU_LIMIT));
        }
        pendingChoices.put(player.getId(), items);
        if (!player.getAbstractPlayerInteraction().openNpc(NpcId.MAPLE_ADMINISTRATOR, SCRIPT_NAME)) {
            pendingChoices.remove(player.getId());
            player.yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }

    /**
     * 供 {@code whoDropsList.js} 取候选清单。取走即清，避免玩家关掉对话框后残留。
     *
     * @return [[物品id, 物品名], ...]；没有待选清单时返回空数组
     */
    public static Object[][] takeChoices(Character chr) {
        List<Pair<Integer, String>> items = pendingChoices.remove(chr.getId());
        if (items == null) {
            return new Object[0][];
        }
        int size = Math.min(items.size(), MENU_LIMIT);
        Object[][] rows = new Object[size][2];
        for (int i = 0; i < size; i++) {
            rows[i][0] = items.get(i).getLeft();
            rows[i][1] = items.get(i).getRight();
        }
        return rows;
    }

    /**
     * 列出某件物品的掉落来源。选单挑完后由 {@code whoDropsList.js} 回调，
     * 与「只搜到一件」时走的是同一条路——两边口径不该有差。
     */
    public static void showDroppers(Character player, int itemId) {
        List<Pair<Integer, Integer>> droppers =
                ItemInformationProvider.getInstance().getWhoDropsWithChance(itemId);
        if (droppers.isEmpty()) {
            player.dropMessage(5, I18nUtil.getMessage("WhoDropsCommand.message5"));
            return;
        }

        StringBuilder output = new StringBuilder();
        // 整行都在 i18n 里：中文「#z#掉落于：」不留空格、英文「#z# is dropped by:」要留，
        // 拆成「图标 + 半句」拼的话空格没处放（properties 会把值前导空格吃掉）
        output.append(I18nUtil.getMessage("WhoDropsCommand.message4", itemId)).append("\r\n");

        int shown = Math.min(droppers.size(), DROPPER_LIMIT);
        for (int i = 0; i < shown; i++) {
            Pair<Integer, Integer> dropper = droppers.get(i);
            int mobId = dropper.getLeft();
            // 一条 Monster 同时供立绘与 isBoss 用，省一次 LifeFactory 查找
            Monster mob = LifeFactory.getMonster(mobId);
            float rate = (mob != null && mob.isBoss()) ? player.getBossDropRate() : player.getDropRate();
            // 一只怪一行太占高度，连着排、换行交给客户端折
            output.append(mob == null ? MobTextUtil.mobImage(mobId) : MobTextUtil.mobImage(mob))
                    .append(MobTextUtil.mobName(mobId)).append(" #r")
                    .append(formatChance(dropper.getRight(), rate))
                    .append("#k%   ");
        }
        output.append("\r\n");
        if (droppers.size() > shown) {
            output.append(I18nUtil.getMessage("WhoDropsCommand.message6", droppers.size() - shown));
        }

        player.getAbstractPlayerInteraction().npcTalk(NpcId.MAPLE_ADMINISTRATOR, output.toString());
    }

    /** 纯数字按 id 精确查，否则按名字模糊查 */
    private static List<Pair<Integer, String>> findItems(String search) {
        ItemInformationProvider ii = ItemInformationProvider.getInstance();

        int itemId;
        try {
            itemId = Integer.parseInt(search);
        } catch (NumberFormatException e) {
            // 不是数字就当名字搜。getItemDataByName 已经是 contains 匹配，不在这里截断——
            // 截断该由选单负责，这里少给一条就等于玩家永远选不到它
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
