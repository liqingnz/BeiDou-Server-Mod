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
package org.gms.client.command.commands.gm1;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.game.GameConstants;
import org.gms.constants.id.NpcId;
import org.gms.server.maps.FieldLimit;
import org.gms.server.maps.MapFactory;
import org.gms.server.maps.MapleMap;
import org.gms.server.maps.MiniDungeonInfo;
import org.gms.server.maps.Portal;
import org.gms.server.maps.TeleportRestriction;
import org.gms.util.I18nUtil;

import java.util.*;
import java.util.Map.Entry;

public class GotoCommand extends Command {

    {
        setDescription(I18nUtil.getMessage("GotoCommand.message1"));

        try {
            // thanks shavit for noticing goto areas getting loaded from wz needlessly only for the name retrieval
            // 赋值而不是追加：这是实例初始化块，写静态字段，命令被实例化两次就会把清单排两遍
            GOTO_TOWNS_INFO = renderList(GameConstants.GOTO_TOWNS);
            GOTO_AREAS_INFO = renderList(GameConstants.GOTO_AREAS);
        } catch (Exception e) {
            e.printStackTrace();

            GOTO_TOWNS_INFO = "(none)";
            GOTO_AREAS_INFO = "(none)";
        }

    }

    public static String GOTO_TOWNS_INFO = "";
    public static String GOTO_AREAS_INFO = "";

    /**
     * 每行排几个目的地。目的地有 70 上下，一行一个会把对话框顶出屏幕——客户端对话框
     * 高度固定且没有滚动条，装不下的行直接不画。MapleLand/gotoList.js 读的是这个常量，
     * 两边是同一张清单，口径不该有两份。
     */
    public static final int PER_LINE = 2;
    /** 两列之间的间隔。同样给 gotoList.js 用 */
    public static final String COLUMN_GAP = "  ";
    /** 英文名一栏的宽度。最长的 southperry / excavation 占 10，留 1 格分隔 */
    private static final int KEY_WIDTH = 11;
    /** 地图名一栏的宽度。不封顶的话第二列会随地图名长短散在各处，对不齐 */
    private static final int NAME_WIDTH = 12;
    /** 地图名截断后的省略号。用半角点而不是「…」：英文客户端出包是 US-ASCII，编不出全角 */
    private static final String ELLIPSIS = "..";

    /**
     * 排一格：#b英文名#k + 地图名，两段各自补到固定宽度，下一列才对得齐。
     * 只给英文名上蓝色——地图名跟着上色的话整屏都是蓝的，反而看不出重点。
     * <p>
     * 客户端中文字体里半角恰好是全角的一半，所以按「半角 1、全角 2」补空格能对齐。
     * 一行两格约 48 个半角宽，同一种对话框里 BeiDouSpecial/万能传送.js 实测 51 宽不折行。
     *
     * @param padded 是否补右侧空白。一行最后一格不用补，免得留一串行尾空格
     */
    public static String formatCell(String key, int mapId, boolean padded) {
        String name = clip(MapFactory.loadPlaceName(mapId), NAME_WIDTH);
        // 补白落在 #b...#k 里，颜色对空格没影响
        String cell = "#b" + padRight(key, KEY_WIDTH) + "#k" + name;
        // 按地图名的宽度补，不能拿 cell 去量——#b / #k 这些颜色码不占显示宽度
        return padded ? cell + spaces(NAME_WIDTH - displayWidth(name)) : cell;
    }

    /** 排一份纯文本清单，每行 {@link #PER_LINE} 个。openNpc 起不来时走这条，排版与选单一致 */
    private static String renderList(Map<String, Integer> registry) {
        List<Entry<String, Integer>> entries = new ArrayList<>(registry.entrySet());
        sortGotoEntries(entries);

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < entries.size(); i++) {
            Entry<String, Integer> e = entries.get(i);
            boolean lineEnd = i % PER_LINE == PER_LINE - 1 || i == entries.size() - 1;
            sb.append(formatCell(e.getKey(), e.getValue(), !lineEnd));
            sb.append(lineEnd ? "\r\n" : COLUMN_GAP);
        }
        return sb.toString();
    }

    /** 显示宽度：半角算 1、全角算 2 */
    private static int displayWidth(String text) {
        int width = 0;
        for (int i = 0; i < text.length(); i++) {
            width += text.charAt(i) > 127 ? 2 : 1;
        }
        return width;
    }

    private static String spaces(int width) {
        return " ".repeat(Math.max(0, width));
    }

    private static String padRight(String text, int width) {
        return text + spaces(width - displayWidth(text));
    }

    /** 截到 width 以内，截过的补 {@link #ELLIPSIS}——不留个记号玩家会以为地图就叫这名字 */
    private static String clip(String text, int width) {
        if (displayWidth(text) <= width) {
            return text;
        }

        StringBuilder sb = new StringBuilder();
        int taken = 0;
        for (int i = 0; i < text.length(); i++) {
            int charWidth = text.charAt(i) > 127 ? 2 : 1;
            if (taken + charWidth > width - ELLIPSIS.length()) {
                break;
            }
            sb.append(text.charAt(i));
            taken += charWidth;
        }
        return sb.append(ELLIPSIS).toString();
    }

    private static void sortGotoEntries(List<Entry<String, Integer>> listEntries) {
        listEntries.sort(Entry.comparingByValue());
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        // 守卫必须在列清单之前：选单点一下就传送，放到后面等于给了一条绕过通道。
        String blocked = blockReason(player);
        if (blocked != null) {
            player.dropMessage(1, blocked);
            return;
        }

        if (params.length < 1) {
            showDestinations(player, null);
            return;
        }

        Map<String, Integer> gotomaps;
        if (player.isGM()) {
            gotomaps = new HashMap<>(GameConstants.GOTO_AREAS);     // distinct map registry for GM/users suggested thanks to Vcoc
            gotomaps.putAll(GameConstants.GOTO_TOWNS);  // thanks Halcyon (UltimateMors) for pointing out duplicates on listed entries functionality
        } else {
            gotomaps = GameConstants.GOTO_TOWNS;
        }

        if (gotomaps.containsKey(params[0])) {
            warpTo(player, gotomaps.get(params[0]));
        } else {
            // detailed info on goto available areas suggested thanks to Vcoc
            showDestinations(player, params[0]);
        }
    }

    /**
     * 能不能用 @goto 传送。
     *
     * @return 不能传送时返回该给玩家的提示，能传送时返回 null
     */
    private static String blockReason(Character player) {
        if (!player.isAlive()) {
            return I18nUtil.getMessage("GotoCommand.message5");
        }
        if (!player.isGM() && (player.getEventInstance() != null
                || MiniDungeonInfo.isDungeonMap(player.getMapId())
                || FieldLimit.CANNOTMIGRATE.check(player.getMap().getFieldLimit()))) {
            return I18nUtil.getMessage("GotoCommand.message6");
        }
        return null;
    }

    /**
     * 供 MapleLand/gotoList.js 的选单回调。传送口径（守卫 + 随机出生点）与 @goto &lt;name&gt;
     * 完全一致——选单开着的时候玩家可能已经死了或被关进副本，所以这里必须再查一次。
     *
     * @return 是否真的传送了；被守卫拦下时返回 false 并已提示玩家
     */
    public static boolean warpFromMenu(Character player, int mapId) {
        String blocked = blockReason(player);
        if (blocked != null) {
            player.dropMessage(1, blocked);
            return false;
        }
        return warpTo(player, mapId);
    }

    /**
     * @return 是否真的传送了；被任务门拦下时返回 false 并已提示玩家
     */
    private static boolean warpTo(Character player, int mapId) {
        // @goto 同样绕开 portal，任务门要单独过一遍：GOTO_AREAS 里的 cjg（藏经阁七层）
        // 就在规则表内。这里只查任务门、不套 TeleportGuard 的其余守卫——无视 fieldLimit
        // 与临时地图正是这条命令存在的意义。checkTeleport 自己豁免 gmLevel > 2，
        // 真正会被拦下的是 gmLevel == 2 这一档：够格用 @goto <area>，却没到豁免线
        Optional<String> denial = TeleportRestriction.checkTeleport(player, mapId);
        if (denial.isPresent()) {
            player.dropMessage(1, denial.get());
            return false;
        }

        MapleMap target = player.getClient().getChannelServer().getMapFactory().getMap(mapId);

        // expedition issue with this command detected thanks to Masterrulax
        Portal targetPortal = target.getRandomPlayerSpawnpoint();
        player.saveLocationOnWarp();
        player.changeMap(target, targetPortal);
        return true;
    }

    /**
     * 列出可去的地方。走 MapleLand/gotoList.js 的选单，选项点一下直接传送——
     * 原实现只是 npcTalk 一段纯文本，玩家看完还得自己把名字敲对。
     *
     * @param badName 用户敲错的地图名；没带参数时传 null
     */
    private static void showDestinations(Character player, String badName) {
        if (badName != null) {
            player.dropMessage(1, I18nUtil.getMessage("GotoCommand.message7", badName));
        }

        if (player.getAbstractPlayerInteraction().openNpc(NpcId.SPINEL, "gotoList")) {
            return;
        }

        // 脚本没开起来（已在跟别的 NPC 对话，或脚本文件缺失）就退回纯文本清单，
        // 至少别让玩家看不到能去哪。
        String sendStr = I18nUtil.getMessage("GotoCommand.message2") + "\r\n\r\n"
                + I18nUtil.getMessage("GotoCommand.message3") + "\r\n" + GOTO_TOWNS_INFO;
        if (player.isGM()) {
            sendStr += ("\r\n" + I18nUtil.getMessage("GotoCommand.message4") + "\r\n" + GOTO_AREAS_INFO);
        }
        player.getAbstractPlayerInteraction().npcTalk(NpcId.SPINEL, sendStr);
    }
}
