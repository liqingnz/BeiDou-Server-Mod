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
//@Author Moogra, Ronan
//Fixed grammar, javascript syntax

var status = 0;

function isTransformed(ch) {
    const BuffStat = Java.type('org.gms.client.BuffStat');
    return ch.getBuffSource(BuffStat.MORPH) == 2210003;
}

function start() {
    if (!(isTransformed(cm.getPlayer()) || cm.haveItem(4001086))) {
        cm.sendOk("This is the cave of the mighty Horntail, supreme ruler of the Leafre Canyons. Only those #bdeemed worthy#k to meet him can pass here, #boutsiders#k are not welcome. Get lost!");
        cm.dispose();
        return;
    }

    cm.sendAcceptDecline("Welcome to Cave of Life - Entrance! Would you like to go inside and fight #rHorntail#k?");
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }

    if (cm.getLevel() > 99) {
        cm.warp(240050000, 0);
    } else {
        cm.sendOk("I'm sorry. You need to be atleast level 100 or above to enter.");
    }
    cm.dispose();
}