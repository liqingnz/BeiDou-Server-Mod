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
/* 小叶子 —— 上海滩美发店助理
	随机造型 / 随机染发，收通用普通会员卡。移植自 LichKingMod。
	高级（指定样式）走店老板丢夫人 9310032。
*/
var status = 0;
var beauty = 0;
var mhair_r = Array(30030, 30150, 30240, 30370, 30420, 30550, 30600, 30640, 30700, 30710, 30720, 30750, 30810, 30830);
var fhair_r = Array(31140, 31160, 31180, 31210, 31300, 31430, 31460, 31470, 31660, 31690, 31800, 31890, 31910, 31940);
var hairnew = Array();
var haircolor = Array();

var regStyle = 5159001;     // 通用美发店普通会员卡
var regColor = 5159005;     // 通用染色普通会员卡

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
            cm.sendSimple("做个头发吧，很便宜的！\r\n#L0#造型：#i" + regStyle + "##t" + regStyle + "##l\r\n#L1#染发：#i" + regColor + "##t" + regColor + "##l");
        } else if (status == 1) {
            if (selection == 0) {
                beauty = 1;
                hairnew = Array();
                if (cm.getPlayer().getGender() == 0) {
                    for (var i = 0; i < mhair_r.length; i++) {
                        pushIfItemExists(hairnew, mhair_r[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                if (cm.getPlayer().getGender() == 1) {
                    for (var i = 0; i < fhair_r.length; i++) {
                        pushIfItemExists(hairnew, fhair_r[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                cm.sendYesNo("让我来弄有可能会出现你意想不到的效果，你确定要使用#i" + regStyle + "##b#t" + regStyle + "##k来#r随机#k改变你的发型吗？");
            } else if (selection == 1) {
                beauty = 2;
                haircolor = Array();
                var current = parseInt(cm.getPlayer().getHair() / 10) * 10;
                for (var i = 0; i < 8; i++) {
                    pushIfItemExists(haircolor, current + i);
                }
                cm.sendYesNo("我对颜色不敏感，你确定要使用#i" + regColor + "##b#t" + regColor + "##k来#r随机#k改变你的发色吗？");
            }
        } else if (status == 2) {
            cm.dispose();
            if (beauty == 1) {
                if (hairnew.length == 0) {
                    cm.sendOk("现在没有适合你的新发型可以换了。");
                } else if (cm.haveItem(regStyle)) {
                    cm.gainItem(regStyle, -1);
                    cm.setHair(hairnew[Math.floor(Math.random() * hairnew.length)]);
                    cm.sendOk("精神小伙！");
                } else {
                    cm.sendOk("咱这是会员制，不办卡我很难办啊。");
                }
            } else if (beauty == 2) {
                if (haircolor.length == 0) {
                    cm.sendOk("现在没有别的发色可以换了。");
                } else if (cm.haveItem(regColor)) {
                    cm.gainItem(regColor, -1);
                    cm.setHair(haircolor[Math.floor(Math.random() * haircolor.length)]);
                    cm.sendOk("精神小伙！");
                } else {
                    cm.sendOk("咱这是会员制，不办卡我很难办啊。");
                }
            }
        }
    }
}
