/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

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
 * @author Moogra
 */
function enter(pi) {
    var mapid = pi.getPlayer().getMapId();
    pi.playPortalSound();
    var map = (mapid - 270010000) / 100;
    // GM（等级 > 2）免任务穿门，但仍走下面正常的分段路由。**不要**改成整条条件后面
    // 接 || isGm：那样 isGm 为真时第一个分支必中，GM 站在换段图（5/105/205/300）
    // 会被 warp(mapid + 10) 送进不存在的地图。
    var isGm = pi.getPlayer().gmLevel() > 2;
    //pi.getPlayer().dropMessage(5, map + " " + pi.isQuestCompleted(3534));
    if (map < 5 && (pi.isQuestCompleted(3500 + map) || isGm)) {
        pi.warp(mapid + 10, "out00");
    } else if (map == 5 && (pi.isQuestCompleted(3502 + map) || isGm)) {
        pi.warp(270020000, "out00");
    } else if (map > 100 && map < 105 && (pi.isQuestCompleted(3407 + map) || isGm)) {
        pi.warp(mapid + 10, "out00");
    } else if (map == 105 && (pi.isQuestCompleted(3514) || isGm)) {
        pi.warp(270030000, "out00");
    } else if (map > 200 && map < 205 && (pi.isQuestCompleted(3314 + map) || isGm)) {
        pi.warp(mapid + 10, "out00");
    } else if (map == 205 && (pi.isQuestCompleted(3519) || isGm)) {
        pi.warp(270040000, "out00");
    } else if (map == 300 && (pi.haveItem(4032002) || pi.isQuestCompleted(3522) || isGm)) {
        pi.warp(270040100, "out00");
    } else {
        if (map > 200) {
            pi.playerMessage(5, "随着时间开始变得异常流动，你被传送回到了一个安全的空间。");
            pi.warp(270030000, "in00");
        } else if (map > 100) {
            pi.playerMessage(5, "随着时间开始变得异常流动，你被传送回到了一个安全的空间。");
            pi.warp(270020000, "in00");
        } else {
            pi.playerMessage(5, "随着时间开始变得异常流动，你被传送回到了一个安全的空间。");
            pi.warp(270010000, "in00");
        }
    }
    return true;
}