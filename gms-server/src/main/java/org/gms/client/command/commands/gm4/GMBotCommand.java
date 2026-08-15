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
import org.gms.client.command.commands.CommandManager;
import org.gms.constants.id.MobId;
import org.gms.server.TimerManager;
import org.gms.server.life.Monster;
import org.gms.server.maps.MapObject;
import org.gms.server.maps.MapObjectType;
import org.gms.server.maps.MapleMap;
import org.gms.util.I18nUtil;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ScheduledFuture;

/**
 * 替指定角色自动清怪并拾取掉落，再次执行同一目标即停止。
 * <p>
 * 不带参数时作用于自己。目标可以在任意频道，按角色id在全区在线列表中查找。
 */
public class GMBotCommand extends Command {
    /**
     * 每轮清怪拾取的间隔。原实现写的是 2001 毫秒，此处沿用。
     */
    private static final long BOT_TICK_MS = 2001;

    /**
     * 运行中任务的登记类别，与 CommandManager 中其它类别区分。
     */
    private static final String CATEGORY = "GMBot";

    {
        setDescription(I18nUtil.getMessage("GMBotCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        // 原实现的参数是 0/1/2 三个魔法选择器，其中 1、2 硬编码成作者自己的角色id，
        // 且用裸 parseInt 解析，提示里却写着 <playername>，传名字直接抛异常。此处直接收角色id。
        int targetId = player.getId();
        if (params.length >= 1) {
            try {
                targetId = Integer.parseInt(params[0]);
            } catch (NumberFormatException e) {
                player.yellowMessage(I18nUtil.getMessage("GMBotCommand.message2"));
                return;
            }
        }

        // 原实现只在自己所在频道查找，目标在别的频道就找不到；改用全区在线列表
        Character victim = c.getWorldServer().getPlayerStorage().getCharacterById(targetId);
        if (victim == null || !victim.isLoggedInWorld()) {
            player.dropMessage(6, I18nUtil.getMessage("GMBotCommand.message3", targetId));
            return;
        }

        if (CommandManager.getInstance().getRunningCommand(CATEGORY, victim.getId()) != null) {
            CommandManager.getInstance().cancelRunningCommands(CATEGORY, victim.getId());
            player.dropMessage(6, I18nUtil.getMessage("GMBotCommand.message4", victim.getName()));
            return;
        }

        final int victimId = victim.getId();
        // 任务体内按id重新取角色，不持有 Character 引用：原实现的闭包捕获了目标对象，
        // 目标下线后若任务没被取消，这个对象就一直回收不掉。
        ScheduledFuture<?> sf = TimerManager.getInstance().register(() -> runBotTick(c, victimId), BOT_TICK_MS);
        CommandManager.getInstance().registerRunningCommands(CATEGORY, victimId, sf);
        player.dropMessage(6, I18nUtil.getMessage("GMBotCommand.message5", victim.getName(), victimId));
    }

    private static void runBotTick(Client c, int victimId) {
        Character victim = c.getWorldServer().getPlayerStorage().getCharacterById(victimId);
        if (victim == null || !victim.isLoggedInWorld() || !victim.isAlive()) {
            // 原实现在这里取消任务后没有 return，继续对已下线的角色调 getMap()
            CommandManager.getInstance().cancelRunningCommands(CATEGORY, victimId);
            return;
        }

        MapleMap map = victim.getMap();
        if (map == null) {
            return;
        }

        List<MapObject> monsters = map.getMapObjectsInRange(victim.getPosition(), Double.POSITIVE_INFINITY,
                Arrays.asList(MapObjectType.MONSTER));
        for (MapObject monsterObject : monsters) {
            Monster monster = (Monster) monsterObject;
            // 友好怪不打；闇黑龙王本体与其残骸不打，那场战斗靠脚本推进阶段，秒掉会卡住流程
            if (monster.getStats().isFriendly()) {
                continue;
            }
            if (MobId.isDeadHorntailPart(monster.getId()) || monster.getId() == MobId.HORNTAIL) {
                continue;
            }
            map.damageMonster(victim, monster, Integer.MAX_VALUE);
        }

        // 原实现在这里手工比对 mapItem.getOwnerId() 与 victim 的角色id/队伍id，三个问题：
        // 一是多余，Character.pickupItem 内部已在 itemLock 下用 canBePickedBy 做了完整校验；
        // 二是本身就是错的，队伍归属在 MapItem 里是独立的 party_ownerid 字段，拿 ownerId 比不上；
        // 三是不安全，party_ownerid 是运行时可变字段，MapItem 要求持锁读取。
        List<MapObject> items = map.getMapObjectsInRange(victim.getPosition(), Double.POSITIVE_INFINITY,
                Arrays.asList(MapObjectType.ITEM));
        for (MapObject item : items) {
            victim.pickupItem(item);
        }
    }
}
