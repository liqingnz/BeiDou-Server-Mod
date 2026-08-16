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
/* 如花 —— 少林寺整形外科助理
	随机脸型，收通用整形普通会员卡。移植自 LichKingMod。
	指定样式（高级券）走院长芸萍 9310036。
*/
var status = 0;
var mface_r = Array(20001, 20003, 20007, 20013, 20021, 20023, 20025);
var fface_r = Array(21002, 21004, 21006, 21008, 21022, 21027, 21029);
var facenew = Array();

var faceCoupon = 5159003;   // 通用整形手术普通会员卡

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
            cm.sendSimple("本来不应该我来做这个手术的，但你不是没钱吗：\r\n#L0#面部整形：#i" + faceCoupon + "##t" + faceCoupon + "##l");
        } else if (status == 1) {
            facenew = Array();
            // 脸型 id 的后两位是瞳色，换脸时保留玩家当前瞳色
            var eyeColor = cm.getPlayer().getFace() % 1000 - (cm.getPlayer().getFace() % 100);
            if (cm.getPlayer().getGender() == 0) {
                for (var i = 0; i < mface_r.length; i++) {
                    pushIfItemExists(facenew, mface_r[i] + eyeColor);
                }
            }
            if (cm.getPlayer().getGender() == 1) {
                for (var i = 0; i < fface_r.length; i++) {
                    pushIfItemExists(facenew, fface_r[i] + eyeColor);
                }
            }
            cm.sendYesNo("我这手艺全凭手感，你确定要使用#i" + faceCoupon + "##b#t" + faceCoupon + "##k来#r随机#k改变你的脸型吗？");
        } else if (status == 2) {
            cm.dispose();
            if (facenew.length == 0) {
                cm.sendOk("现在没有别的脸型可以换了。");
            } else if (cm.haveItem(faceCoupon)) {
                cm.gainItem(faceCoupon, -1);
                cm.setFace(facenew[Math.floor(Math.random() * facenew.length)]);
                cm.sendOk("成了！别嫌弃，能用就行。");
            } else {
                cm.sendOk("没有会员卡，我可不敢动手。");
            }
        }
    }
}
