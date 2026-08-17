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
    // 确保地图ID为整数类型
    var currentMapId = parseInt(cm.getMapId());
    // 校验是否为指定地图
    if (currentMapId === 300010420 || currentMapId === 300030310) {
        cm.sendYesNo("你想要离开吗？离开后无法返回.");
    } else {
        // 非指定地图，直接释放对话，不做任何处理
        cm.dispose();
    }
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }
    // 确保地图ID为整数类型
    var currentMapId = parseInt(cm.getMapId());
    if (currentMapId === 300010420) {
        cm.warp(300010410, 2);
    } else if (currentMapId === 300030310) {
        cm.warp(300030300, 2); 
    } else {
        // 非指定地图，无传送操作
        //cm.warp(300000000, "out00");
    }
    cm.dispose();
}