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
import org.gms.util.I18nUtil;

import java.util.*;
import java.util.Map.Entry;

public class GotoCommand extends Command {

    {
        setDescription(I18nUtil.getMessage("GotoCommand.message1"));

        List<Entry<String, Integer>> towns = new ArrayList<>(GameConstants.GOTO_TOWNS.entrySet());
        sortGotoEntries(towns);

        try {
            // thanks shavit for noticing goto areas getting loaded from wz needlessly only for the name retrieval

            for (Map.Entry<String, Integer> e : towns) {
                GOTO_TOWNS_INFO += ("'" + e.getKey() + "' - #b" + (MapFactory.loadPlaceName(e.getValue())) + "#k\r\n");
            }

            List<Entry<String, Integer>> areas = new ArrayList<>(GameConstants.GOTO_AREAS.entrySet());
            sortGotoEntries(areas);
            for (Map.Entry<String, Integer> e : areas) {
                GOTO_AREAS_INFO += ("'" + e.getKey() + "' - #b" + (MapFactory.loadPlaceName(e.getValue())) + "#k\r\n");
            }
        } catch (Exception e) {
            e.printStackTrace();

            GOTO_TOWNS_INFO = "(none)";
            GOTO_AREAS_INFO = "(none)";
        }

    }

    public static String GOTO_TOWNS_INFO = "";
    public static String GOTO_AREAS_INFO = "";

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
     * 供 npc/gotoList.js 的选单回调。传送口径（守卫 + 随机出生点）与 @goto &lt;name&gt;
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
        warpTo(player, mapId);
        return true;
    }

    private static void warpTo(Character player, int mapId) {
        MapleMap target = player.getClient().getChannelServer().getMapFactory().getMap(mapId);

        // expedition issue with this command detected thanks to Masterrulax
        Portal targetPortal = target.getRandomPlayerSpawnpoint();
        player.saveLocationOnWarp();
        player.changeMap(target, targetPortal);
    }

    /**
     * 列出可去的地方。走 npc/gotoList.js 的选单，选项点一下直接传送——
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
