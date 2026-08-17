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

/**
 *Crystal of Roots
 *@Author: Ronan
 *@NPC: Crystal of Roots
 */
function start() {
    cm.sendYesNo("你想要离开吗？离开后无法返回.");
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }
    // 确保地图ID为整数类型
    var currentMapId = parseInt(cm.getMapId());
    if (currentMapId === 211070100) {
        cm.warp(211060800, 0);
    } else if (currentMapId === 211070200) {
        cm.warp(211061001, 0);
    } else {
        // 其他情况默认传送到第一张图出口
        cm.warp(211060800, "out00");
    }
    cm.dispose();
}