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
/* NPC Base
	Map Name (Map ID)
	Extra NPC info.
 */

var status;
var ticketId = 5220000;
var curMapName = "";

function start() {
    status = -1;
    // 用客户端的地图名宏，省掉一张与 NPC ID 强耦合的硬编码地名表
    curMapName = "#m" + cm.getMapId() + "#";

    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 0) {
        cm.dispose();
    } else {
        if (mode == 1) {
            status++;
        } else {
            status--;
        }
        if (status == 0 && mode == 1) {
            if (cm.haveItem(ticketId)) {
                cm.sendSimple("你可以使用" + curMapName + "快乐百宝箱，请确保物品栏有足够的空位。\r\n\r\n#L1#抽一次#l\r\n#L10#抽#r十#k次#l");
            } else {
                cm.sendSimple("欢迎来到" + curMapName + "快乐百宝箱。我可以为您做些什么呢？\r\n\r\n#L0#什么是快乐百宝箱？#l\r\n#L1#在哪里可以购买快乐百宝券？#l");
            }
        } else if (status == 1 && cm.haveItem(ticketId)) {
            // 扣券与背包校验都在 Java 侧逐抽进行，这里不再预扣
            cm.doGachapon(selection == 10 ? 10 : 1, ticketId);
            cm.dispose();
        } else if (status == 1) {
            if (selection == 0) {
                cm.sendNext("玩转快乐百宝箱，赢得稀有卷轴、装备、椅子、熟练书和其他酷炫物品！你只需要一张 #b快乐百宝券#k 就有机会成为随机物品的幸运获得者。");
            } else {
                cm.sendNext("快乐百宝券可以在#r现金商店#k购买，可以使用NX或枫叶点购买。点击屏幕右下角的红色商店图标进入#r现金商店#k，就能购买快乐百宝券。");
            }
        } else if (status == 2) {
            cm.sendNextPrev("你会在" + curMapName + "的快乐百宝箱中找到各种物品，但最有可能找到与" + curMapName + "相关的物品和卷轴。");
        } else {
            cm.dispose();
        }
    }
}
