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
/* 丢夫人 —— 上海滩美发店老板
	指定造型 / 指定染发，收通用高级会员卡。移植自 LichKingMod。
	随机（普通券）走店助理小叶子 9310031。
*/
var status = 0;
var beauty = 0;
var mhair_v = Array(30150, 30240, 30370, 30420, 30640, 30710, 30750, 30810);
var fhair_v = Array(31140, 31160, 31180, 31300, 31460, 31470, 31660, 31910);
var hairnew = Array();
var haircolor = Array();

var vipStyle = 5159000;     // 通用美发店高级会员卡
var vipColor = 5159004;     // 通用染色高级会员卡

function pushIfItemExists(array, itemid) {
    if ((itemid = cm.getCosmeticItem(itemid)) != -1 && !cm.isCosmeticEquipped(itemid)) {
        array.push(itemid);
    }
}

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 1) {  // disposing issue with stylishs found thanks to Vcoc
        cm.dispose();
    } else {
        if (mode == 1) {
            status++;
        } else {
            status--;
        }
        if (status == 0) {
            cm.sendSimple("不管是走江湖，还是礼佛参禅，发型都不能乱。想换个造型吗？\r\n#L0#造型：#i" + vipStyle + "##t" + vipStyle + "##l\r\n#L1#染发：#i" + vipColor + "##t" + vipColor + "##l");
        } else if (status == 1) {
            if (selection == 0) {
                beauty = 1;
                hairnew = Array();
                if (cm.getPlayer().getGender() == 0) {
                    for (var i = 0; i < mhair_v.length; i++) {
                        pushIfItemExists(hairnew, mhair_v[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                if (cm.getPlayer().getGender() == 1) {
                    for (var i = 0; i < fhair_v.length; i++) {
                        pushIfItemExists(hairnew, fhair_v[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                cm.sendStyle("拿着#i" + vipStyle + "##b#t" + vipStyle + "##k就好办，样式你自己挑，我来上手。", hairnew);
            } else if (selection == 1) {
                beauty = 2;
                haircolor = Array();
                var current = parseInt(cm.getPlayer().getHair() / 10) * 10;
                for (var i = 0; i < 8; i++) {
                    pushIfItemExists(haircolor, current + i);
                }
                cm.sendStyle("拿着#i" + vipColor + "##b#t" + vipColor + "##k就好办，颜色你自己挑。", haircolor);
            }
        } else if (status == 2) {
            cm.dispose();
            if (beauty == 1) {
                if (cm.haveItem(vipStyle)) {
                    cm.gainItem(vipStyle, -1);
                    cm.setHair(hairnew[selection]);
                    cm.sendOk("好了，去照照镜子吧。");
                } else {
                    cm.sendOk("没有高级会员卡，这活我可接不了。");
                }
            } else if (beauty == 2) {
                if (cm.haveItem(vipColor)) {
                    cm.gainItem(vipColor, -1);
                    cm.setHair(haircolor[selection]);
                    cm.sendOk("好了，去照照镜子吧。");
                } else {
                    cm.sendOk("没有高级会员卡，这活我可接不了。");
                }
            }
        }
    }
}
