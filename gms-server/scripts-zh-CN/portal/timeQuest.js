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
 *
 * 时间神殿各段路的任务门。挂在 270010100-500 / 270020100-500 / 270030100-500 / 270040000
 * 这 16 张图的 portal 上。
 *
 * 路由与门槛分开：这里只算「这道门通向哪儿」，能不能过统一问 TeleportRestriction——
 * 那张表是瞬移之石、家族传送、@goto 共用的规则源，两边各写一份必然会分叉。
 * GM 豁免（等级 > 2）也在表里，脚本这层不再单独判。
 */
var TeleportRestriction = Java.type("org.gms.server.maps.TeleportRestriction");

/**
 * 这道门通向哪儿；不在已知段上返回 -1。
 *
 * 段号 = (mapid - 270010000) / 100。1-4 / 101-104 / 201-204 是段内的门，走到下一张「邂逅」图；
 * 5 / 105 / 205 / 300 是换段门，走到下一段的「过去」图。
 */
function destinationOf(mapid, section) {
    if (section >= 1 && section < 5) {
        return mapid + 10;
    }
    if (section === 5) {
        return 270020000;   // 冻结的过去
    }
    if (section > 100 && section < 105) {
        return mapid + 10;
    }
    if (section === 105) {
        return 270030000;   // 燃烧的过去
    }
    if (section > 200 && section < 205) {
        return mapid + 10;
    }
    if (section === 205) {
        return 270040000;   // 破碎的回廊
    }
    if (section === 300) {
        return 270040100;   // 神殿废墟
    }
    return -1;
}

/** 过不去时退回本段起点 */
function safeLaneOf(section) {
    if (section > 200) {
        return 270030000;
    }
    if (section > 100) {
        return 270020000;
    }
    return 270010000;
}

function enter(pi) {
    var mapid = pi.getPlayer().getMapId();
    pi.playPortalSound();

    var section = Math.floor((mapid - 270010000) / 100);
    var target = destinationOf(mapid, section);

    if (target !== -1 && !TeleportRestriction.checkTeleport(pi.getPlayer(), target).isPresent()) {
        pi.warp(target, "out00");
        return true;
    }

    pi.playerMessage(5, "随着时间开始变得异常流动，你被传送回到了一个安全的空间。");
    pi.warp(safeLaneOf(section), "in00");
    return true;
}
