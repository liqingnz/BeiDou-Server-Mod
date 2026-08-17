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
MiniDungeon - LongKiss
*/

//因为不明原因无法进入多张副本（明明脚本与MD_high一模一样），只好固定进入一张图

var baseid = 541020610;
var dungeonid = 541020620;
var dungeons = 19;

function enter(pi) {

    if (pi.getMapId() == baseid) {
        pi.playPortalSound();
        pi.warp(dungeonid, 1);
        return true;
     } else {
        pi.playPortalSound();
        pi.warp(baseid, 1);
        return true;
     }

}
