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
    // GMs (level > 2) pass every door without the quest, but still follow the normal lane
    // routing below. Do NOT tack "|| isGm" onto the whole condition instead: that makes the
    // first branch swallow every GM regardless of where they stand, warping them to
    // mapid + 10 -- a map that does not exist at the lane-end maps (5/105/205/300).
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
            pi.playerMessage(5, "As the time starts to flow oddly, you are transported back to a safe lane.");
            pi.warp(270030000, "in00");
        } else if (map > 100) {
            pi.playerMessage(5, "As the time starts to flow oddly, you are transported back to a safe lane.");
            pi.warp(270020000, "in00");
        } else {
            pi.playerMessage(5, "As the time starts to flow oddly, you are transported back to a safe lane.");
            pi.warp(270010000, "in00");
        }
    }
    return true;
}