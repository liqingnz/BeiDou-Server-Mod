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

var travelFrom = [100000000];
var travelFee = [1000];

var travelMap = [700000000];
var travelPlace = ["红鸾宫"];


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
            cm.sendSimple("感觉怎么样?满意吗?#b\r\n#L0#是的,我要返回#m" + cm.getPlayer().peekSavedLocation("MIRROR") + "#\r\n#L1#不,我还想再逛逛.");
        else if (status == 1) {
            if (selection == 0) {
                cm.sendNext("好的.我会把你带回之前来的地方!");
            } else if (selection == 1) {
                cm.sendOk("好的.");
                cm.dispose();
            }
        } else if (status == 2) {
            var map = cm.getPlayer().getSavedLocation("MIRROR");
            if (map == -1)
                map = 104000000;
            cm.warp(map);
            cm.dispose();
        }
    } else {
        if (status == 0) {
            travelType = getTravelType(cm.getPlayer().getMapId());
            cm.sendNext("我可以送你去天上的红鸾宫！");
        } else if (status == 1) {
            var text = "现在要去观光吗？";
            for (var i = 0; i < travelMap.length; i++) {
                text += "\r\n#L" + i + "#" + (i + 1) + " . #b#m" + travelMap[i] + "##k(" + travelFee[i] + "金币)#l";
            }
            cm.sendSimple(text);

        } else if (status == 2) {
            sel = selection;
            cm.sendNext("好，我现在就送你到#b#m" + travelMap[selection] + "##k。");
        } else if (status == 3) {
            if (cm.getMeso() < travelFee[sel]) {
                cm.sendNext("你的金币不够这次旅行.");
                cm.dispose();
            } else {
                cm.gainMeso(-travelFee[sel]);
                cm.getPlayer().saveLocation("MIRROR");
                //java.lang.System.out.println(travelMap[sel]+""+sel);  //打印目标地图信息到服务端
                cm.warp(travelMap[sel], 0);
                cm.dispose();
            }
        }
    }
}
var sel;