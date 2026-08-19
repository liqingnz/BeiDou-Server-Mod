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
import org.gms.constants.id.MapId;

import java.util.Optional;
import java.util.Set;

/**
 * 「绕开 portal 的传送」统一守卫。
 * <p>
 * 瞬移之石、家族团聚/召唤这类传送不经过 portal 脚本，portal 上挂的那些门对它们一律无效，
 * 所以每条这样的路径都要自己把守卫补齐：任务门（{@link TeleportRestriction}）、
 * {@link FieldLimit#CANNOTVIPROCK}、临时地图（{@link MapleMap#hasForcedReturn()}）、
 * 活动实例。此前这一组条件在四个调用点各拼了一份，改一处漏三处——本类把它收成一份。
 * <p>
 * <b>新增传送路径时</b>：调 {@link #denyArrival} 或 {@link #denyFamilyTeleport}，
 * 不要在调用点自己拼条件。
 */
public final class TeleportGuard {

    /**
     * 传送禁入的地图。
     * <p>
     * 「forcedReturn 指向自身视作无强制返回」那次修复之前，这类地图会被当成临时图一并拦下；
     * 放开之后，其中 fieldLimit 缺 {@link FieldLimit#CANNOTVIPROCK} 位的 14 张从「拦」
     * 翻成了「可直达」。逐张过了一遍：9 张是城镇或集合点（里恩、爱莉亚、红鸾宫、未来东京、
     * OrbisPQ 集合图 200080101 等），放开无害；剩下这 5 张本服没有任何脚本接入，
     * 进去既没有玩法也没有出口脚本，按原样拦住。
     * <p>
     * 更彻底的办法是给这些图的 fieldLimit 补 0x40 位，但那是 wz 改动、要同步客户端，
     * 先在服务端记一份名单。
     */
    private static final Set<Integer> CLOSED_MAPS = Set.of(
            610010010, 610010011, 610010012, 610010013,     // 幻影森林，无脚本接入
            674012001                                       // 蕃茄农场2 等候室，无脚本接入
    );

    private TeleportGuard() {
    }

    /**
     * 目标地图能否被直接传送进入。
     * <p>
     * 拦下时会把原因发给 {@code traveller}，调用方只需要补自己协议层的回包。
     *
     * @param traveller    要被送进目标图的人。<b>不一定是发起者</b>——家族召唤是被召唤者，
     *                     任务门查的是他的任务进度，提示自然也该发给他
     * @param target       目标地图
     * @param mapClosedMsg 通用守卫拦下时给玩家看的文案；传 {@code null} 表示不发文字
     *                     （家族那两条路径只回协议包）。任务门有自己的文案，不走这个参数
     * @return 拦下返回 true
     */
    public static boolean denyArrival(Character traveller, MapleMap target, String mapClosedMsg) {
        Optional<String> questGate = TeleportRestriction.checkTeleport(traveller, target.getId());
        if (questGate.isPresent()) {
            traveller.dropMessage(1, questGate.get());
            return true;
        }

        if (FieldLimit.CANNOTVIPROCK.check(target.getFieldLimit())
                || CLOSED_MAPS.contains(target.getId())
                || (target.hasForcedReturn() && !MapId.isMapleIsland(target.getId()))) {
            if (mapClosedMsg != null) {
                traveller.dropMessage(1, mapClosedMsg);
            }
            return true;
        }

        return false;
    }

    /**
     * 家族团聚 / 召唤的守卫：在 {@link #denyArrival} 之上，还要求出发图允许离开、
     * 目标图没有正在进行的活动实例。
     *
     * @param traveller 真正被传送的人（团聚是发起者自己，召唤是被召唤者）
     * @param from      {@code traveller} 当前所在的地图
     * @param target    目标地图
     */
    public static boolean denyFamilyTeleport(Character traveller, MapleMap from, MapleMap target, String mapClosedMsg) {
        // 任务门放在最前：它的文案最具体，先报它对玩家最有用
        if (denyArrival(traveller, target, mapClosedMsg)) {
            return true;
        }

        if (FieldLimit.CANNOTMIGRATE.check(from.getFieldLimit()) || target.getEventInstance() != null) {
            if (mapClosedMsg != null) {
                traveller.dropMessage(1, mapClosedMsg);
            }
            return true;
        }

        return false;
    }
}
