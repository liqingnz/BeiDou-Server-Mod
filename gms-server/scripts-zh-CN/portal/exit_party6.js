/*
	This file is part of the OdinMS Maple Story Server
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

/*
Author: kevintjuh93
*/

function enter(pi) {
    var mapId = pi.getPlayer().getSavedLocation("MIRROR");
    var currentMapId = parseInt(pi.getMapId());

    pi.playPortalSound();
    if ((mapId == -1 && currentMapId === 910320000) || (mapId == 102040000 && currentMapId === 910320000)) {
        pi.warp(102040000, 12);
    } else if ((mapId == -1 && currentMapId === 300030100) || (mapId == 300030000 && currentMapId === 300030100)){
        pi.warp(300030000, 2);
    } else {
        pi.warp(mapId, "out00");
    }
    // 出来之后重置次元之镜坐标，但未能重置成功
    // pi.getPlayer().clearSavedLocation("MIRROR");
    return true;
}