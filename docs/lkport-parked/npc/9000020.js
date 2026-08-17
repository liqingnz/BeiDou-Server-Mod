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
status = -1;


var travelFrom = [777777777, 541000000, 701000000];
var travelFee = [3000, 10000, 20000];

var travelMap = [800000000, 550000000, 702000000];
var travelPlace = ["日本蘑菇神社", "马来西亚", "嵩山少林寺"];
var travelPlaceShort = ["蘑菇神社", "大都会", "少林寺"];
var travelPlaceCountry = ["日本", "马来西亚", "嵩山"];
var travelAgent = ["我", "#r#p9201135##k", "我"];

var travelDescription = ["如果你想体验日本风情，去到神社再好不过了，这里聚集了日本文化。蘑菇神社还供奉着远古时期的蘑菇神。",
    "如果您想在乐观的环境中感受热带的炎热，马来西亚的居民热切欢迎您。此外，大都市本身就是当地经济的核心，众所周知，这个地方总是提供一些活动或游览。",
    "中国YYDS！不到少林非好汉不知道吗？"];

var travelDescription2 = ["看看侍奉蘑菇神的女巫，强烈推荐尝尝日本街头卖的章鱼烧、炒面等美味。现在，让我们前往#b蘑菇神社#k，如果有的话，这是一个神话般的地方。",
    "到达那里后，我强烈建议您安排参观甘榜村。为什么？您肯定已经了解奇幻主题公园阴森世界？不知道？简直就是把最大的主题公园摆在那里，值得一游！现在，让我们前往马来西亚的#b大都市#k。",
    "有机会一定要试试撞金人！"];

var travelType;
var travelStatus;

function start() {
    travelStatus = getTravelingStatus(cm.getPlayer().getMapId());
    action(1, 0, 0);
}

function getTravelingStatus(mapid) {
    for (var i = 0; i < travelMap.length; i++) {
        if (mapid == travelMap[i]) {
            return i;
        }
    }

    return -1;
}

function getTravelType(mapid) {
    for (var i = 0; i < travelFrom.length; i++) {
        if (mapid == travelFrom[i]) {
            return i;
        }
    }

    return 0;
}

function action(mode, type, selection) {
    status++;
    if (mode != 1) {
        if (mode == 0 && status == 4)
            status -= 2;
        else {
            cm.dispose();
            return;
        }
    }

    if (travelStatus != -1) {
        if (status == 0)
            cm.sendSimple("还开心吗？是否想回去？#b\r\n#L0#我想回 #m" + cm.getPlayer().peekSavedLocation("WORLDTOUR") + "#?\r\n#L1#我想在这再转转");
        else if (status == 1) {
            if (selection == 0) {
                cm.sendNext("好的，姐现在就带你回去。下次想出来玩记得还来找我哦！");
            } else if (selection == 1) {
                cm.sendOk("好的，要是改变想法了随时跟我说。");
                cm.dispose();
            }
        } else if (status == 2) {
            var map = cm.getPlayer().getSavedLocation("WORLDTOUR");
            if (map == -1) map = 104000000;

            cm.warp(map);
            cm.dispose();
        }
    } else {
        if (status == 0) {
            travelType = getTravelType(cm.getPlayer().getMapId());
            cm.sendNext("觉得无聊想出去转转？去一个新的地方旅游再好不过了！坤坤旅行社提供#b环球旅行#k服务！担心开支？完全没必要！#b坤坤旅行社#k本次服务只要#b" + cm.numberWithCommas(travelFee[travelType]) + "金币#k！");
        } else if (status == 1) {
            cm.sendSimple("当前站点提供前往：#b" + travelPlace[travelType] + "#k的服务。" + travelAgent[travelType] + "将作为本次的导游。准备好出发去" + travelPlaceShort[travelType] + "？#b\r\n#L0#冲鸭！去" + travelPlaceShort[travelType] + " (" + travelPlaceCountry[travelType] + ")！！！");
        } else if (status == 2) {
            cm.sendNext("确定要去#b" + travelPlace[travelType] + "#k? " + travelDescription[travelType]);
        } else if (status == 3) {
            if (cm.getMeso() < travelFee[travelType]) {
                cm.sendNext("本旅行社拒绝白嫖！");
                cm.dispose();
                return;
            }
            cm.sendNextPrev(travelDescription2[travelType]);
        } else if (status == 4) {
            cm.gainMeso(-travelFee[travelType]);
            cm.getPlayer().saveLocation("WORLDTOUR");
            cm.warp(travelMap[travelType], 0);
            cm.dispose();
        }
    }
}