/*
    This file is part of the HeavenMS MapleStory Server
    Copyleft (L) 2016 - 2019 RonanLana

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
/* NPC: Agent E (9000036)
    Victoria Road : Henesys
	
    Refining NPC:
    * Accessories refiner
        * 
        * @author Ronan Lana
        * @mod LichKing
*/

var status = -1;
var matList = [3100000, 3100001, 3101001, 3101001];  // 4900000 六一铅笔，
var royalMat = 3101000; // 3101002 龙年勋章
var matQuantity = [150, 80, 100, 150];
var royalPointReward = 30;
var royalPeriod = 30;
var selectedType = 0;

function start() {
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1 || (mode == 0 && status == 0)) {
        cm.dispose();
        return;
    }
    else if (mode == 0)
        status = 0;
    else
        status++;

    if (status == 0) {

        // HeavenMS兑换物品：
        // if (selection == 0) { //pendants
        //     var selStr = "Well, I've got these pendants on my repertoire:#b";
        //     items = [1122018,1122007,1122001,1122003,1122004,1122006,1122002,1122005,1122058];
        //     for (var i = 0; i < items.length; i++)
        //         selStr += "\r\n#L" + i + "##t" + items[i] + "##b";
        // }else if (selection == 1) { //face accessory
        //     var selStr = "Hmm, face accessories? There you go: #b";
        //     items = [1012181,1012182,1012183,1012184,1012185,1012186, 1012108, 1012109, 1012110, 1012111];
        //     for (var i = 0; i < items.length; i++)
        //         selStr += "\r\n#L" + i + "##t" + items[i] + "##b";
        // }else if (selection == 2) { //eye accessory
        //     var selStr = "Got hard sight? Okay, so which glasses do you want me to make?#b";
        //     items = [1022073, 1022088, 1022103, 1022089, 1022082];
        //     for (var i = 0; i < items.length; i++)
        //         selStr += "\r\n#L" + i + "##t" + items[i] + "##b";
        // }

        var selStr = "欢迎兑换皇家点券~#b";
        // "#k升级 #b#i1112413##z1112413#" // 利琳的戒指升级
        // "#k兑换 #b#i3101000##z3101000#" // 圣诞帽
        var options = ["30点皇家点券", "30天皇家会员", "#k兑换 #b#i5211900##z5211900#（一小时）", "#k兑换 #b#i5360900##z5360900#（一小时）", "#k兑换 #b#i" + royalMat + "##z" + royalMat + "#"]; 
        for (var i = 0; i < options.length; i++)
            selStr += "\r\n#L" + i + "# " + options[i] + "#l";
        cm.sendSimple(selStr);
    }
    else if (status == 1) {
        var sendTxt = "你确定想要兑换#b";
        selectedType = selection;

        if (selection == 0) {
            sendTxt += "30点皇家点券";
        } else if (selection == 1) {
            sendTxt += "30天皇家会员";
        } else if (selection == 2) {
            sendTxt += "#b#i5211900##z5211900#";
        }  else if (selection == 3) {
            sendTxt += "#b#i5360900##z5360900#";
        } else if (selection == 4) {
            cm.sendGetNumber("每个#b#i" + royalMat + "##z" + royalMat + "##k可兑换 1 #r皇家点券#k。\r\n你想兑换几个？", 0, 1, 2000);
            return;
        } else if (selection == 99) {
            selStr = "升级至："
            var options = [1112414, 1112405];
            for (var i = 0; i < options.length; i++)
                selStr += "\r\n#L" + i + "# #i" + options[i] + "##z" + options[i] + "##l";
            cm.sendSimple(selStr);
            return;
        }
        sendTxt += "#k？\r\n需要#r" + matQuantity[selectedType] + "#k个#i" + matList[selectedType] + "##z" + matList[selectedType] + "#";
        cm.sendYesNo(sendTxt);
    }
    else if (status == 2) {
        if (selectedType == 0) {
            if (!cm.haveItem(matList[selectedType], matQuantity[selectedType]))
                cm.sendOk("你没有足够的#b#i" + matList[selectedType] + "#");
            else {
                cm.gainItem(matList[selectedType], -matQuantity[selectedType]);
                cm.gainRoyalPoint(royalPointReward);
                cm.playerMessage(6, "获得 " + royalPointReward + " 皇家点券");
                cm.sendOk("兑换成功！");
            }
        }
        else if (selectedType == 1) {
            if (!cm.haveItem(matList[selectedType], matQuantity[selectedType]))
                cm.sendOk("你没有足够的#b#i" + matList[selectedType] + "#");
            else {
                cm.gainItem(matList[selectedType], -matQuantity[selectedType]);
                cm.gainRoyalTime(royalPeriod);
                cm.sendOk("兑换成功，使用“#b@redeem#k”领取每日奖励！");
            }
        }
        else if (selectedType == 2) {
            if (!cm.haveItem(matList[selectedType], matQuantity[selectedType]))
                cm.sendOk("你没有足够的#b#i" + matList[selectedType] + "#");
            else {
                cm.gainItem(matList[selectedType], -matQuantity[selectedType]);
                cm.gainItem(5211900, 1, false, true, 3600000);
                cm.sendOk("兑换成功！");
            }
        }
        else if (selectedType == 3) {
            if (!cm.haveItem(matList[selectedType], matQuantity[selectedType]))
                cm.sendOk("你没有足够的#b#i" + matList[selectedType] + "#");
            else {
                cm.gainItem(matList[selectedType], -matQuantity[selectedType]);
                cm.gainItem(5360900, 1, false, true, 3600000);
                cm.sendOk("兑换成功！");
            }
        }
        else if (selectedType == 4) {
            if (!cm.haveItem(royalMat, selection))
                cm.sendOk("你没有足够的#b#i" + royalMat + "#");
            else {
                cm.gainItem(royalMat, -selection);
                cm.gainRoyalPoint(selection);
                cm.playerMessage(6, "获得 " + selection + " 皇家点券");
                cm.sendOk("兑换成功！");
            }
        }
        else if (selectedType == 99) {
            var options = [1112414, 1112405];
            var mat = [1112413, 1112414];
            var EtcQuantity = [600, 1000];
            var selStr = "升级至#b#i" + options[selection] + "##z" + options[selection] + "##k";
            selStr += "#k需要：\r\n#b#i" + mat[selection] + "##z" + mat[selection] + "##k - 1\r\n#b" + " #i3101001##z3101001##k - " + EtcQuantity[selection];
            selectedType = selection;
            cm.sendYesNo(selStr);
            return;
        }
        cm.dispose();
    }
    else if (status == 3) {
        var options = [1112414, 1112405];
        var mat = [1112413, 1112414];
        var EtcQuantity = [600, 1000];
        if (!cm.haveItem(mat[selectedType], 1) || !cm.haveItem(3101001, EtcQuantity[selectedType]))
            cm.sendOk("你没有足够的材料。");
        else if (!cm.canHold(options[selectedType], 1)) {
            cm.sendOk("请确保可以背包可以装下#i" + options[selectedType] + "#");
        }
        else {
            cm.gainItem(mat[selectedType], -1);
            cm.gainItem(3101001, -EtcQuantity[selectedType]);
            cm.gainItem(options[selectedType], 1);
            cm.sendOk("兑换成功！");
        }
        cm.dispose();
        return;
    }
}
