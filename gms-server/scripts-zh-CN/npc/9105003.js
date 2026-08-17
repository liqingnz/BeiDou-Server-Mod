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

var status = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    // mode=-1 表示关闭对话框，直接释放
    if (mode == -1) {
        cm.dispose();
        return; // 终止后续逻辑
    }

    // mode=0 表示玩家点了No，释放对话框
    if (mode == 0) {
        cm.dispose();
        return;
    }

    // mode=1 表示玩家点了Yes，执行下一步逻辑
    status++;
        var playerLevel = cm.getPlayer().getLevel();
    if (status == 0) {
        if (playerLevel >= 21 && playerLevel <= 30) {
        cm.sendYesNo("你希望参与#b#e圣诞假日组队任务#n#k吗？\r\n你的等级在21级以上，我可以送你去#e初级地图#n...");
        } else if (playerLevel >= 31 && playerLevel <= 40) {
        cm.sendYesNo("你希望参与#b#e圣诞假日组队任务#n#k吗？\r\n你的等级在31级以上，我可以送你去#e中级地图#n...");	
        } else if (playerLevel >= 41) {
        cm.sendYesNo("你希望参与#b#e圣诞假日组队任务#n#k吗？\r\n你的等级在41级以上，我可以送你去#e高级地图#n...");
        } else {
            cm.sendOk("你希望参与#b#e圣诞假日组队任务#n#k吗？\r\n不过你的等级不够，等21级以后再来吧。");
            cm.dispose();
        }
    } else if (status == 1) {
        // 获取玩家等级
        // 定义各等级段对应的地图编号
        var Map1= 889100000;  
        var Map2= 889100010;  
        var Map3= 889100020;  
        
        // 等级校验 + 分等级传送（请根据实际规则调整等级区间）
        if (playerLevel >= 21 && playerLevel <= 30) {
            // 等级区间1
            cm.getPlayer().saveLocation("MIRROR");
            cm.warp(Map1);
            cm.dispose();
        } else if (playerLevel >= 31 && playerLevel <= 40) {
            // 等级区间2
            cm.getPlayer().saveLocation("MIRROR");
            cm.warp(Map2);
            cm.dispose();
        } else if (playerLevel >= 41) {
            // 等级区间3
            cm.getPlayer().saveLocation("MIRROR");
            cm.warp(Map3);
            cm.dispose();
        } else {
            // 等级不足时的提示
            cm.sendOk("你没有达到21级，无法参与圣诞假日组队任务！");
            cm.dispose();
        }
    }
}