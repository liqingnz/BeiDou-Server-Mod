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
 * The quest doors of the Temple of Time lanes. Attached to the portals of 270010100-500 /
 * 270020100-500 / 270030100-500 / 270040000 -- 16 maps in total.
 *
 * Routing and gating are kept apart: this script only works out where a door leads, while
 * TeleportRestriction decides whether it opens. That table is the single rule source shared
 * with teleport rocks, family teleports and @goto; keeping a second copy here would drift.
 * The GM bypass (level > 2) lives in the table too, so it is not repeated here.
 */
var TeleportRestriction = Java.type("org.gms.server.maps.TeleportRestriction");

/**
 * Where this door leads; -1 when the map is not on a known lane.
 *
 * section = (mapid - 270010000) / 100. 1-4 / 101-104 / 201-204 are doors inside a lane and
 * lead to the next "encounter" map; 5 / 105 / 205 / 300 are lane changes and lead to the
 * "past" map of the next lane.
 */
function destinationOf(mapid, section) {
    if (section >= 1 && section < 5) {
        return mapid + 10;
    }
    if (section === 5) {
        return 270020000;   // Chryse
    }
    if (section > 100 && section < 105) {
        return mapid + 10;
    }
    if (section === 105) {
        return 270030000;   // Burnt Past
    }
    if (section > 200 && section < 205) {
        return mapid + 10;
    }
    if (section === 205) {
        return 270040000;   // Forgotten Twilight
    }
    if (section === 300) {
        return 270040100;   // Temple Ruins
    }
    return -1;
}

/** Sent back to the start of the lane when the door will not open */
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

    pi.playerMessage(5, "As the time starts to flow oddly, you are transported back to a safe lane.");
    pi.warp(safeLaneOf(section), "in00");
    return true;
}
