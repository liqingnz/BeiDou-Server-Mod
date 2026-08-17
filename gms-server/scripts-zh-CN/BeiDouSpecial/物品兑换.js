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
/**
-- Odin JavaScript --------------------------------------------------------------------------------
	VIP Cab - Victoria Road : Lith Harbor (104000000)
-- By ---------------------------------------------------------------------------------------------
	Xterminator
-- Version Info -----------------------------------------------------------------------------------
	1.0 - First Version by Xterminator
---------------------------------------------------------------------------------------------------
**/


var itemSet = Array(
Array(4001129,4001126,1),		//嘉年华1纪念币，
//Array(4001254,4001126,2),		//嘉年华2纪念币，暂用嘉年华1的纪念币替代
//Array(2040920,4001006,3),		//盾牌魔力10%
//Array(2040816,4001006,3),		//手套魔力10%
//Array(2040915,4001006,5),		//盾牌攻击10%
Array(4310000,4001126,2),		//绝对音感
Array(4031544,4031543,1),		//婚礼村沙曼先生的希望票兑换
Array(4031545,4031544,1),		//婚礼村沙曼先生的希望票兑换
Array(4031543,4031545,1),		//婚礼村沙曼先生的希望票兑换
Array(2340000,4001006,30),		//祝福卷轴
Array(2049100,4001006,30), 		//混沌卷轴
Array(5150040,4030012,100),		//皇家理发卷轴(普通)
Array(5150044,5150040,3),		//皇家理发卷轴(高级)
Array(4250800,4005000,1),		//力量水晶
Array(4250801,4250800,10),
Array(4250802,4250801,10),
Array(4250900,4005001,1),		//智慧水晶
Array(4250901,4250900,10),
Array(4250902,4250901,10),
Array(4251000,4005003,1),		//幸运水晶
Array(4251001,4251000,10),
Array(4251002,4251001,10),
Array(4251100,4005002,1),		//敏捷水晶
Array(4251101,4251100,10),
Array(4251102,4251101,10),
Array(4251400,4005004,1),		//黑暗水晶
Array(4251401,4251400,10),
Array(4251402,4251401,10),
Array(4251200,4000313,1),		//五彩水晶
Array(4251201,4251200,10),
Array(4251202,4251201,10),
Array(4251300,4021008,1),		//黑水晶
Array(4251301,4251300,10),
Array(4251302,4251301,10),
Array(4250000,4021007,1),		//钻石
Array(4250001,4250000,10),
Array(4250002,4250001,10),
Array(4250100,4021005,1),		//蓝宝石
Array(4250101,4250100,10),
Array(4250102,4250101,10),
Array(4250200,4021000,1),		//石榴石
Array(4250201,4250200,10),
Array(4250202,4250201,10),
Array(4250300,4021004,1),		//蛋白石
Array(4250301,4250300,10),
Array(4250302,4250301,10),
Array(4250400,4021001,1),		//紫水晶
Array(4250401,4250400,10),
Array(4250402,4250401,10),
Array(4250500,4021002,1),		//海蓝宝石
Array(4250501,4250500,10),
Array(4250502,4250501,10),
Array(4250600,4021006,1),		//黄晶
Array(4250601,4250600,10),
Array(4250602,4250601,10),
Array(4250700,4021003,1),		//祖母绿
Array(4250701,4250700,10),
Array(4250702,4250701,10)
);
var status = 0;
var selectedItem;
var item;
var req;
var cost;
var qty;
var co;

function start() {
    action(1, 0, 0);
}

function action(mode, type, selection) {
    status++;
    if (mode == -1){
        cm.dispose();
        return;
    } else if (mode == 0) {
        // cm.sendOk("欢迎下次再来!.");
    	cm.dispose();
    	return;
    }
    if (status == 1) {
            var add ="请选择你想兑换的物品\r\n";
            //add += "#d点卷余额：#b" + cm.getPlayer().getCashShop().getCash(1) + "#k          ";
            //add += "#d抵用余额：#b" + cm.getPlayer().getCashShop().getCash(4) + "#k#n\r\n";
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "\r\n#L" + i + "##v " + itemSet[i][0] + "##z";
                    add += itemSet[i][0]+"#"+"    需要材料:#v " + itemSet[i][1]+"#";
                    //add += "   需要个数: " + itemSet[i][2]+"个#l#k";
                };

            cm.sendSimple(add);
    } else if (status == 2) {

            selectedItem = selection;
            item = itemSet[selectedItem][0];
            req = itemSet[selectedItem][1];
            co = itemSet[selectedItem][2];
            var bdd ="你确定要兑换\r\n";
            bdd += "\r\n#i" +item+"# "+ " #t" + item + "#";
            bdd += "    需要材料:#v " + req + "\r\n\r\n";
            bdd += "单个物品需要材料个数:#r " + co + "个\r\n\r\n\r\n";
            bdd += "请输入购买个数\r\n";
            cm.sendGetNumber(bdd,1,1,999)
            //cm.sendYesNo(bdd);
    } else if (status == 3) {
        qty = (selection > 0) ? selection : (selection < 0 ? -selection : 1);
        cost = co * qty;   //花费为物品单价*输入的数量
        if (!cm.haveItem(req, cost)) {
            cm.sendOk("#b您的材料不足");
            cm.dispose();
        } else {
            // 弹出确认对话框
            var confirmMsg = "你确定要兑换 #b" + qty + " 个#k #t" + item + "# 吗？\r\n";
            confirmMsg += "将消耗 #v" + req + "# #b" + cost + " 个#k。";
            cm.sendYesNo(confirmMsg);
            // 此时 status 保持为 3，下一次 action 调用时 status 变为 4 并处理确认结果
        }
    } else if (status == 4) {
        // 用户点击了“是”（mode=1），执行兑换
        cm.gainItem(req, -cost);
        cm.gainItem(item, qty);
        cm.sendOk("#b兑换成功！");
        cm.dispose();
    }
}