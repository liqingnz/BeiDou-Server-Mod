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
var status = 0;
var eQuestChoices = new Array (4031901,4000175,4032133,4001094,1122011,4001241,4001242,4000224,4031902,4000139,4000140,4000141,4032013); 
var eQuestPrizes = new Array();
eQuestPrizes[0] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[1] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[2] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[3] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[4] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[5] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[6] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[7] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[8] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[9] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[10] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[11] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
eQuestPrizes[12] = new Array([2330005,1],[1442026,1],[1102206,1],[1102207,1],[1302037,1],[2070007,1],[2340000,1],[2022062,20],[1102040,1],[1082149,1],[1082145,1],[1082146,1],[1082147,1],[1082148,1],[1002393,1],[1112407,1],[1112408,1],[2049100,1],[4310000,1],[4001126,1],[4000313,1]);
var requiredItem  = 0;
var lastSelection = 0;
var prizeItem     = 0;
var prizeQuantity = 0;
var info;
var itemSet;
var reward;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (mode == 0 && status == 0) {
            cm.sendOk("如果改变主意了请再来。");
            cm.dispose();
            return;
        } if (mode == 0 && status == 1) {
            cm.dispose();
            return;
        }
        if (mode == 1)
            status++;
        if (status == 0) {
            cm.sendYesNo("我现在正在收集一些东西，如果你有，可否与我交换？");
        } else if (status == 1) {
            var eQuestChoice = makeChoices(eQuestChoices);
            cm.sendSimple(eQuestChoice);
        } else if (status == 2){
            requiredItem = eQuestChoices[selection];
            reward = eQuestPrizes[selection];
            itemSet = (Math.floor(Math.random() * reward.length));
            prizeItem = reward[itemSet][0];
            prizeQuantity = reward[itemSet][1];
            if (!cm.canHold(prizeItem)){
                cm.sendNext("你背包满了。");
            } else if (cm.hasItem(requiredItem, 1)){   // check they have >= 1 in Inventory
                cm.gainItem(requiredItem,-1);   
                cm.gainItem(prizeItem,prizeQuantity);
                cm.sendOk("换好了，这是给你的。\r\n#t"+ prizeItem +"#.");
            } else{        
                cm.sendOk("你没有这个呀！");
            }
            cm.dispose();
        }
    }
}

function makeChoices(a){
    var result  = "请看看你是否有这些东西，\r\n和你做笔交易怎么样？奖励随机哦。\r\n(奖励种类还很少，待完善)\r\n";
    for (var x = 0; x< a.length; x++){
        result += " #L" + x + "##v" + a[x] + "##t" + a[x] + "##l\r\n";
    }
    return result;
}