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

/* NPC: Maple Rooney (1022101)
    Victoria Road : Henesys

    Certificate & Maple Leaf Trader:
    * @author LichKing

    Ported from LichKingMod. This NPC used to be Rooney, the Happyville warp; that flow is kept
    below in comments. Restoring it means putting warpToHappyville() back at the head of start().

    Note this script is NOT behind use_enable_custom_npc_script, matching LichKingMod. It is the
    only sink for the boss/PQ certificates handed out by the boss and PQ scripts.
*/

var status = -1;
var selectedType = -1;
var item;
var items;
var multiplier;
var mats;
var matQty;
var baseMapleLeafCost = 20;
var baseCost = 100000;
var cost;
var qty = 1;
var matList = [3100000, 3100001, 4001126, 3101001];
var mapleLeafId = 4001126;

// 3010121 and 3010135 are absent from String.wz on this server, so they are left out of the pools.
var bossPointRewardPool = [[2340000, 40], [2049100, 40], [2022179, 4], [2022282, 10], [2040915, 15], [2040920, 15]];
var pqPointRewardPool = [[4031062, 30], [3010083, 40], [2044025, 40], [2043023, 40], [2044417, 40], [2044317, 40], [2044612, 40], [2044512, 40], [2043812, 40], [2043712, 40], [2044712, 40], [2043312, 40], [2044908, 40], [2044815, 40], [2040915, 15], [2040920, 15]];
var eventRewardPool = [[1102166, 200], [1112413, 200], [1072427, 1000], [5010009, 400]];

/* Original Rooney behaviour, kept for reference:
function warpToHappyville() {
    cm.getPlayer().saveLocation("HAPPYVILLE");
    cm.warp(209000000, 0);
    cm.dispose();
}
*/

function start() {
    cm.getPlayer().setCS(true);
    var sendTxt = "What would you like to trade for?";
    for (var i = 0; i < matList.length; i++) {
        sendTxt += "\r\n#L" + i + "##i" + matList[i] + "# #z" + matList[i] + "##l";
    }
    cm.sendSimple(sendTxt);
}

function action(mode, type, selection) {
    status++;
    if (mode != 1) {
        cm.dispose();
        return;
    }
    if (status == 0) {
        selectedType = selection;
        var selStr = "Trading #i" + matList[selectedType] + "##b#t" + matList[selectedType] + "##k for:#b";
        if (selection == 0) {
            for (var i = 0; i < bossPointRewardPool.length; i++) {
                selStr += "\r\n#L" + i + "# #i" + bossPointRewardPool[i][0] + "# #z" + bossPointRewardPool[i][0] + "# : " + bossPointRewardPool[i][1];
            }
            cm.sendSimple(selStr);
        } else if (selection == 1) {
            for (var i = 0; i < pqPointRewardPool.length; i++) {
                selStr += "\r\n#L" + i + "# #i" + pqPointRewardPool[i][0] + "# #z" + pqPointRewardPool[i][0] + "# : " + pqPointRewardPool[i][1];
            }
            cm.sendSimple(selStr);
        } else if (selection == 2) {
            selStr = "Trading #i" + mapleLeafId + "##b#t" + mapleLeafId + "##k for job weapons:#b";
            var options = ["Warrior", "Magician", "Thief", "Bowman", "Pirate"];
            for (var i = 0; i < options.length; i++) {
                selStr += "\r\n#L" + i + "# " + options[i] + "#l";
            }
            cm.sendSimple(selStr);
        } else if (selection == 3) {
            for (var i = 0; i < eventRewardPool.length; i++) {
                selStr += "\r\n#L" + i + "# #i" + eventRewardPool[i][0] + "# #z" + eventRewardPool[i][0] + "# : " + eventRewardPool[i][1];
            }
            cm.sendSimple(selStr);
        }
    } else if (status == 1) {
        if (selectedType == 0) {
            tradePoints(matList[selectedType], bossPointRewardPool, selection);
        } else if (selectedType == 1) {
            tradePoints(matList[selectedType], pqPointRewardPool, selection);
        } else if (selectedType == 2) {
            var selStr = "Here is what I can make:#b";
            if (selection == 0) { //warrior
                items = [1302020, 1302030, 1302064, 1402039, 1432012, 1432040, 1442024, 1442051];
            } else if (selection == 1) { //mage
                items = [1382009, 1382012, 1382039, 1372034];
            } else if (selection == 2) { //thief
                items = [1472030, 1472032, 1472055, 1332025, 1332056, 1332055];
            } else if (selection == 3) { //bow
                items = [1452016, 1452022, 1452045, 1462014, 1462019, 1462040];
            } else if (selection == 4) { //pirate
                items = [1482020, 1482021, 1482022, 1492020, 1492021, 1492022];
            }
            for (var i = 0; i < items.length; i++) {
                selStr += "\r\n#L" + i + "# #i" + items[i] + "# #z" + items[i] + "##b";
            }
            selectedType = selection;
            cm.sendSimple(selStr);
        } else if (selectedType == 3) {
            tradePoints(matList[selectedType], eventRewardPool, selection);
        }
    } else if (status == 2) {
        if (selectedType == 0) { //warrior
            var matQtySet = [1, 2, 3, 3, 2, 3, 2, 3];
        } else if (selectedType == 1) { //mage
            var matQtySet = [1, 2, 3, 3];
        } else if (selectedType == 2) { //thief
            var matQtySet = [1, 2, 3, 2, 3, 3];
        } else if (selectedType == 3) { //bow
            var matQtySet = [1, 2, 3, 1, 2, 3];
        } else if (selectedType == 4) { //pirate
            var matQtySet = [1, 2, 3, 1, 2, 3];
        }

        item = items[selection];
        mats = mapleLeafId;
        multiplier = matQtySet[selection];
        matQty = multiplier * baseMapleLeafCost;
        cost = baseCost * multiplier;

        var prompt = "Trade for #i" + item + "##b#z" + item + "##k? Make sure you have a #bfree slot#k in your inventory!#b";
        prompt += "\r\n#i" + mats + "# " + (matQty * qty) + " #t" + mats + "#";
        if (cost > 0) {
            prompt += "\r\n#i4031138# " + (cost * qty) + " meso";
        }
        cm.sendYesNo(prompt);
    } else if (status == 3) {
        if (cm.getMeso() < (cost * qty)) {
            cm.sendOk("You don't have enough mesos!");
        } else if (!cm.haveItem(mats, matQty * qty)) {
            cm.sendOk("You don't have enough #b#t" + mats + "##k!");
        } else if (!cm.canHold(item, qty)) {
            cm.sendOk("You got no free slot on your inventory.");
        } else {
            cm.gainItem(mats, -(matQty * qty));
            cm.gainMeso(-(cost * qty));
            cm.gainItem(item, qty);
            cm.sendOk("All done! Enjoy.");
        }

        cm.dispose();
    }
}

function tradePoints(itemId, rewardPool, selection) {
    if (!cm.haveItem(itemId, rewardPool[selection][1])) {
        cm.sendOk("You don't have enough #b#t" + itemId + "##k!");
    } else if (!cm.canHold(rewardPool[selection][0], 1)) {
        cm.sendOk("You got no free slot on your inventory.");
    } else {
        cm.gainItem(itemId, -rewardPool[selection][1]);
        cm.gainItem(rewardPool[selection][0], 1);
        cm.sendOk("All done! Enjoy.");
    }
    cm.dispose();
}
