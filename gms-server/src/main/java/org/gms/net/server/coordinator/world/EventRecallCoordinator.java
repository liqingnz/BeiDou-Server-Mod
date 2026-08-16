/*
    This file is part of the HeavenMS MapleStory Server
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
package org.gms.net.server.coordinator.world;

import org.gms.config.GameConfig;
import org.gms.net.server.Server;
import org.gms.scripting.event.EventInstanceManager;

import java.util.LinkedList;
import java.util.List;
import java.util.Map.Entry;
import java.util.concurrent.ConcurrentHashMap;

import static java.util.concurrent.TimeUnit.MINUTES;

/**
 * @author Ronan
 */
public class EventRecallCoordinator {

    private final static EventRecallCoordinator instance = new EventRecallCoordinator();

    public static EventRecallCoordinator getInstance() {
        return instance;
    }

    /**
     * 一条召回历史。
     *
     * @param storedAt     写入时刻。storeEventInstance 是在 EventInstanceManager.playerDisconnected
     *                     里调用的，所以它就是玩家掉出活动的时刻，比角色表的 lastLogoutTime 更贴近语义。
     * @param lastRecallAt 上次自动召回的时刻，0 表示还没召回过。冷却时间戳并进条目而不是另开一张表，
     *                     这样 manageEventInstances 的清理就能一并回收，不会按角色 id 无限堆积。
     */
    private record RecallEntry(EventInstanceManager eim, long storedAt, long lastRecallAt) {
    }

    private final ConcurrentHashMap<Integer, RecallEntry> eventHistory = new ConcurrentHashMap<>();

    private static boolean isRecallableEvent(EventInstanceManager eim) {
        return eim != null && !eim.isEventDisposed() && !eim.isEventCleared();
    }

    private static long recallWindowMillis() {
        int minutes = GameConfig.getServerInt("max_recall_time");
        return MINUTES.toMillis(minutes > 0 ? minutes : 10);
    }

    private static long recallCooldownMillis() {
        int minutes = GameConfig.getServerInt("recall_cooldown");
        return MINUTES.toMillis(minutes > 0 ? minutes : 10);
    }

    /**
     * 登录时的自动召回，受「掉线时限」与「冷却」双重约束。
     *
     * <p>召回成功后条目<b>不删除</b>（原实现是 remove，一次性）。保留的理由是 GM 的 {@code @recall}
     * 需要历史还在，以及登录时序出岔子时还能补救；重复召回由冷却约束，条目本身在活动结束后
     * 由 {@link #manageEventInstances()} 回收。
     *
     * <p><b>已知取舍</b>：v83 客户端退出游戏与网络掉线都是直接关 socket，走同一条
     * {@code Client.channelInactive}，服务端<b>无法区分主动退出与真掉线</b>。因此本功能在时限内
     * 也会把「快死了先退游戏、再登回来」的玩家放回活动，等于免掉了脱战应有的代价。
     * 这是当前有意接受的行为——异常状态本身不会被刷掉（{@code playerdiseases} 表持久化了剩余时长，
     * 登录时会重新施加），所以收益有限；真要收紧，可把 max_recall_time 调短，
     * 或另加「掉线时带异常状态则不予召回」的判定。
     */
    public EventInstanceManager recallEventInstance(int characterId) {
        RecallEntry entry = eventHistory.get(characterId);
        if (entry == null || !isRecallableEvent(entry.eim())) {
            return null;
        }

        long now = Server.getInstance().getCurrentTime();
        if (now - entry.storedAt() > recallWindowMillis()) {
            return null;
        }
        if (entry.lastRecallAt() > 0 && now - entry.lastRecallAt() < recallCooldownMillis()) {
            return null;
        }

        // CAS：并发下只让一次召回成功，免得两条登录路径把同一个玩家塞进活动两次
        if (!eventHistory.replace(characterId, entry, new RecallEntry(entry.eim(), entry.storedAt(), now))) {
            return null;
        }
        return entry.eim();
    }

    /**
     * GM 手动召回用：不受时限与冷却约束，也不计入冷却。
     */
    public EventInstanceManager peekEventInstance(int characterId) {
        RecallEntry entry = eventHistory.get(characterId);
        return entry != null && isRecallableEvent(entry.eim()) ? entry.eim() : null;
    }

    public void storeEventInstance(int characterId, EventInstanceManager eim) {
        if (GameConfig.getServerBoolean("use_enable_recall_event") && isRecallableEvent(eim)) {
            eventHistory.put(characterId, new RecallEntry(eim, Server.getInstance().getCurrentTime(), 0));
        }
    }

    public void manageEventInstances() {
        if (!eventHistory.isEmpty()) {
            List<Integer> toRemove = new LinkedList<>();

            for (Entry<Integer, RecallEntry> eh : eventHistory.entrySet()) {
                if (!isRecallableEvent(eh.getValue().eim())) {
                    toRemove.add(eh.getKey());
                }
            }

            for (Integer r : toRemove) {
                eventHistory.remove(r);
            }
        }
    }
}
