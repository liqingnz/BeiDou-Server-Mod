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
package org.gms.client.command.commands.gm2;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.client.command.commands.CommandManager;
import org.gms.constants.id.MapId;
import org.gms.server.TimerManager;
import org.gms.server.maps.MapleMap;
import org.gms.util.I18nUtil;

import java.util.Queue;
import java.util.concurrent.ScheduledFuture;

/**
 * 自动巡逻：按固定间隔把GM依次传送到当前频道其他玩家身边，用于人工巡查。
 * 再次执行同一指令即停止。
 */
public class PatrolCommand extends Command {
    private static final String CATEGORY = "Patrol";
    private static final short DEFAULT_INSPECT_SECONDS = 8;

    {
        setDescription(I18nUtil.getMessage("PatrolCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        short type = 0;
        short inspectTime = DEFAULT_INSPECT_SECONDS;
        try {
            if (params.length >= 1) {
                type = Short.parseShort(params[0]);
            }
            if (params.length >= 2) {
                inspectTime = Short.parseShort(params[1]);
            }
        } catch (NumberFormatException e) {
            player.yellowMessage(I18nUtil.getMessage("PatrolCommand.message1"));
            return;
        }
        if (inspectTime < 1) {
            inspectTime = DEFAULT_INSPECT_SECONDS;
        }

        // 队列按角色id隔离存放在 CommandManager，避免多个GM同时巡逻时互相抢目标
        Queue<Integer> targets = CommandManager.getInstance().getPatrolTargets(player.getId());
        if (type == 1 || targets.isEmpty()) {
            targets.clear();
            for (Character chr : c.getChannelServer().getPlayerStorage().getAllCharacters()) {
                if (!chr.isGM() || chr.gmLevel() < player.gmLevel()) {
                    targets.add(chr.getId());
                }
            }
        }

        ScheduledFuture<?> running = CommandManager.getInstance().getRunningCommand(CATEGORY, player.getId());
        if (running != null) {
            stopPatrol(player);
            return;
        }

        final short interval = inspectTime;
        ScheduledFuture<?> sf = TimerManager.getInstance().register(() -> {
            if (!player.isLoggedInWorld() || !player.isAlive() || targets.isEmpty()) {
                stopPatrol(player);
                player.changeMap(MapId.FM_ENTRANCE, 0);
                player.dropMessage(6, I18nUtil.getMessage("PatrolCommand.message2"));
                return;
            }

            Character victim = pollNextTarget(c, player, targets);
            if (victim == null) {
                return;
            }
            MapleMap map = victim.getMap();
            player.forceChangeMap(map, map.findClosestPortal(victim.getPosition()));
            if (player.gmLevel() < 3) {
                player.dropMessage(5, I18nUtil.getMessage("PatrolCommand.message3",
                        victim.getName(), victim.getId(), map.getMapName()));
            } else {
                player.dropMessage(5, I18nUtil.getMessage("PatrolCommand.message4",
                        victim.getName(), victim.getClient().getAccID(), victim.getId(), map.getMapName()));
            }
        }, interval * 1000L);

        CommandManager.getInstance().registerRunningCommands(CATEGORY, player.getId(), sf);
    }

    private void stopPatrol(Character player) {
        CommandManager.getInstance().cancelRunningCommands(CATEGORY, player.getId());
        CommandManager.getInstance().clearPatrolTargets(player.getId());
    }

    /**
     * 取下一个可巡查的目标。跳过已下线、跨频道、在自由市场或与GM同图的玩家。
     * 原实现在这里用递归，目标全部不合格时会一路递归到底；改为循环。
     */
    private Character pollNextTarget(Client c, Character player, Queue<Integer> targets) {
        Integer targetId;
        while ((targetId = targets.poll()) != null) {
            Character victim = c.getChannelServer().getPlayerStorage().getCharacterById(targetId);
            if (victim == null || !victim.isLoggedInWorld() || victim.getClient() == null) {
                continue;
            }
            if (player.getClient().getChannel() != victim.getClient().getChannel()) {
                continue;
            }
            int mapId = victim.getMap().getId();
            if (mapId == MapId.FM_ENTRANCE || mapId == player.getMapId()) {
                continue;
            }
            return victim;
        }
        return null;
    }
}
