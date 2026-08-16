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
 * Scroll recycling (ported from LichKingMod): trade unwanted scrolls for recycle
 * points (1 point per scroll), then redeem 20 points for one scroll of choice.
 * Points only last for the current conversation.
 */
var status;
var selectedType = 0;
var currentPoint = 0;
var invList = [];

const InventoryType = Java.type('org.gms.client.inventory.InventoryType');

// redeemable scrolls (10% armor scrolls + weapon attack scrolls), 20 points each
var scrollList = [2041014, 2040534, 2040419, 2040323, 2041023, 2040517, 2040412, 2040502, 2040031, 2040318, 2041020, 2040627, 2040705, 2040026, 2040302, 2040514, 2041017,
    2043002, 2044002, 2044302, 2044402, 2044502, 2044602, 2044702, 2043302, 2044902, 2044802
];

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 0) {
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

    if (status == 0) {
        // collect recyclable scrolls from the USE inventory (100% scrolls excluded)
        invList = [];
        var inv = cm.getPlayer().getInventory(InventoryType.USE);
        for (var i = 1; i <= 96; i++) {
            var tempItem = inv.getItem(i);
            if (!cm.isRecyclableScroll(tempItem, true)) {
                continue;
            }
            invList.push([tempItem.getItemId(), tempItem.getQuantity()]);
        }
        action(1, 0, 0);
    } else if (status == 1) {
        cm.sendSimple("You currently have #b" + currentPoint + "#k recycle points.\r\nPoints are only valid during this conversation and reset once it ends. Choose an action:\r\n#b#L1#Recycle scrolls#l\r\n#L2#Redeem scrolls#l");
    } else if (status == 2) {
        selectedType = selection;
        var txt;
        if (selectedType == 1) {
            txt = "You currently have #b" + currentPoint + "#k recycle points. Which scrolls would you like to recycle:";
            for (var i = 0; i < invList.length; i++) {
                txt += "\r\n#L" + i + "##i" + invList[i][0] + "##z" + invList[i][0] + "# - #b" + invList[i][1] + " #krecycle points#l";
            }
        } else {
            txt = "You currently have #b" + currentPoint + "#k recycle points. Scrolls available for redemption:";
            for (var i = 0; i < scrollList.length; i++) {
                txt += "\r\n#L" + i + "##i" + scrollList[i] + "##z" + scrollList[i] + "# - #r20 #krecycle points#l";
            }
        }
        cm.sendSimple(txt);
    } else if (status == 3) {
        status = 0;
        if (selectedType == 1) {
            if (selection < 0 || selection >= invList.length) {
                cm.dispose();
                return;
            }
            currentPoint += invList[selection][1];
            cm.gainItem(invList[selection][0], -invList[selection][1]);
            invList.splice(selection, 1);
            action(1, 0, 0);
        } else {
            if (cm.canHold(scrollList[selection], 1)) {
                if (currentPoint >= 20) {
                    currentPoint -= 20;
                    cm.gainItem(scrollList[selection], 1);
                    action(1, 0, 0);
                } else {
                    cm.sendOk("Not enough recycle points!");
                }
            } else {
                cm.sendOk("Not enough space in your inventory!");
            }
        }
    } else {
        cm.dispose();
    }
}
