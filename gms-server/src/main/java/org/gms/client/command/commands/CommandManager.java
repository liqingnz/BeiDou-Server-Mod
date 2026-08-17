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
package org.gms.client.command.commands;

import org.gms.client.inventory.Item;

import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ScheduledFuture;

/**
 * 指令之间共享的运行时状态。移植自 LichKingMod 的 client.command.commands.CommandManager。
 * <p>
 * 这些状态只活在内存里，不落库：进程重启即清空，与原实现一致。
 * 原实现用的是裸 HashMap，而这些结构会被多个频道线程并发读写，此处改用并发容器。
 */
public class CommandManager {
    private static final CommandManager instance = new CommandManager();

    public static CommandManager getInstance() {
        return instance;
    }

    /**
     * 按「类别 -> 角色id」登记正在运行的定时任务，用于重复执行时取消上一轮。
     */
    private final Map<String, Map<Integer, ScheduledFuture<?>>> runningCommands = new ConcurrentHashMap<>();

    /**
     * 巡逻指令的待巡目标队列，按角色id隔离。
     * <p>
     * 原实现把队列放在 PatrolCommand 的实例字段上，而指令在 CommandService 里只实例化一次并全局共享，
     * 多个GM同时巡逻会共用同一个队列互相抢目标。此处按角色id分开存放。
     */
    private final Map<Integer, Queue<Integer>> patrolTargets = new ConcurrentHashMap<>();

    /**
     * 记录通过指令卖出的物品，供回收类指令买回。
     */
    private final Map<Integer, Map<Item, Short>> itemSoldThroughCommand = new ConcurrentHashMap<>();

    /**
     * 记录通过指令卖出物品所得的金币，与 itemSoldThroughCommand 配套。
     */
    private final Map<Integer, Integer> itemSoldMeso = new ConcurrentHashMap<>();

    public ScheduledFuture<?> getRunningCommand(String category, Integer characterId) {
        Map<Integer, ScheduledFuture<?>> categoryCommands = runningCommands.get(category);
        return categoryCommands == null ? null : categoryCommands.get(characterId);
    }

    public void registerRunningCommands(String category, Integer characterId, ScheduledFuture<?> runningCommand) {
        runningCommands.computeIfAbsent(category, k -> new ConcurrentHashMap<>()).put(characterId, runningCommand);
    }

    /**
     * 仅当该 (类别, 角色id) 尚无运行中任务时才登记，返回是否登记成功。
     * <p>
     * 给「任务作用于别人」的指令用：那类指令的 key 是目标角色id 而非发起者自己，
     * 两个GM同时对同一目标发起时，先查后写的写法会双双看到空值、各自起一个任务，
     * 后写入的覆盖前一个，被覆盖的那个再也取消不掉，会一直跑下去。
     * 竞争失败的一方要自己把已创建的 future 取消掉。
     */
    public boolean registerRunningCommandIfAbsent(String category, Integer characterId, ScheduledFuture<?> runningCommand) {
        return runningCommands.computeIfAbsent(category, k -> new ConcurrentHashMap<>())
                .putIfAbsent(characterId, runningCommand) == null;
    }

    public void cancelRunningCommands(String category, Integer characterId) {
        Map<Integer, ScheduledFuture<?>> categoryCommands = runningCommands.get(category);
        if (categoryCommands == null) {
            return;
        }
        // 先原子移除再取消：先查后删会在并发下取消掉别人刚登记的新任务
        // （原实现在此 put(characterId, null)，并发容器不接受 null 值，改为移除，语义一致）
        ScheduledFuture<?> sf = categoryCommands.remove(characterId);
        if (sf != null) {
            sf.cancel(false);
        }
    }

    public Queue<Integer> getPatrolTargets(Integer characterId) {
        return patrolTargets.computeIfAbsent(characterId, k -> new ConcurrentLinkedQueue<>());
    }

    public void clearPatrolTargets(Integer characterId) {
        patrolTargets.remove(characterId);
    }

    public Integer getItemSoldMeso(Integer characterId) {
        return itemSoldMeso.get(characterId);
    }

    public void setItemSoldMeso(Integer characterId, Integer amount) {
        itemSoldMeso.put(characterId, amount);
    }

    public Map<Item, Short> getItemSoldThroughCommand(Integer characterId) {
        return itemSoldThroughCommand.get(characterId);
    }

    public void setItemSoldThroughCommand(Integer characterId, Map<Item, Short> itemList) {
        itemSoldThroughCommand.put(characterId, itemList);
    }

    /**
     * 清空某角色的出售记录。
     * <p>
     * 原实现在回收后用 {@code set...(id, null)} 清空，而并发容器不接受 null 值会直接抛异常，
     * 此处改为成对移除，语义一致。两张表必须一起清，否则会出现「有清单没金额」的半截状态。
     */
    public void clearItemSold(Integer characterId) {
        itemSoldMeso.remove(characterId);
        itemSoldThroughCommand.remove(characterId);
    }
}
