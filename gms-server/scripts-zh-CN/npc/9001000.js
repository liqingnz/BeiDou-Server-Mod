/*  
      
    Copyright (C) This file is part of the OdinMS Maple Story Server  
Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>   
Matthias Butz <matze@odinms.de>  
Jan Christian Meyer <vimes@odinms.de>  
    This program is free software: you can redistribute it and/or modify  
    it under the terms of the GNU Affero General Public License version 3  
    as published by the Free Software Foundation. You may not use, modify  
    or distribute this program under any other version of the  
    GNU Affero General Public License.  
  
    This program is distributed in the hope that it will be useful,  
    but WITHOUT ANY WARRANTY; without even the implied warranty of  
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the  
    GNU Affero General Public License for more details.  
  
    You should have received a copy of the GNU Affero General Public License  
    along with this program.  If not, see <http://www.gnu.org/licenses/>.  
*/

/**
Warp NPC
 **/

var status;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
        return;
    }
    if (mode == 0 && type > 0) {
        cm.dispose();
        return;
    }
    if (mode == 1) {
        status++;
    } else {
        status--;
    }

    var currentMapId = parseInt(cm.getMapId());

    if (status == 0) {
        if (currentMapId != 219000000) {
            // 不在可乐镇，询问是否要去
            cm.sendYesNo("我可以带你去#b可乐镇#k。你想要前去吗？");
        } else {
            // 在可乐镇，询问是否离开
            cm.sendYesNo("你想要离开#b可乐镇#k，回到原来的地方吗？");
        }
    } else if (status == 1) {
        if (currentMapId == 219000000) {
            // 在可乐镇，传送回之前保存的位置
            var mapId = cm.getPlayer().getSavedLocation("WORLDTOUR");
            cm.warp(mapId, "out00");
        } else {
            // 不在可乐镇，保存当前位置并传送到可乐镇
            cm.getPlayer().saveLocation("WORLDTOUR");
            cm.warp(219000000, 0);
        }
        cm.dispose();
    } else {
        cm.dispose();
    }
}