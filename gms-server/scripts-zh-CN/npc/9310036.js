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
/* 芸萍 —— 少林寺整形外科院长
	指定脸型，收通用整形高级会员卡。移植自 LichKingMod。
	随机（普通券）走助理如花 9310037。
*/
var status = 0;
var mface_v = Array(20000, 20001, 20003, 20004, 20005, 20045, 20047, 20048, 20049, 20050, 20051, 20052);
var fface_v = Array(21000, 21001, 21002, 21003, 21004, 21005, 21006, 21007, 21008, 21010, 21012, 21052);
var facenew = Array();

var faceCoupon = 5159002;   // 通用整形手术高级会员卡

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
            cm.sendSimple("正宗易容术，讲究的是自然与神韵。想改变面容的话，先想清楚哦。\r\n#L0#整形外科：#i" + faceCoupon + "##t" + faceCoupon + "##l");
        } else if (status == 1) {
            facenew = Array();
            // 脸型 id 的后两位是瞳色，换脸时保留玩家当前瞳色
            var eyeColor = cm.getPlayer().getFace() % 1000 - (cm.getPlayer().getFace() % 100);
            if (cm.getPlayer().getGender() == 0) {
                for (var i = 0; i < mface_v.length; i++) {
                    pushIfItemExists(facenew, mface_v[i] + eyeColor);
                }
            }
            if (cm.getPlayer().getGender() == 1) {
                for (var i = 0; i < fface_v.length; i++) {
                    pushIfItemExists(facenew, fface_v[i] + eyeColor);
                }
            }
            cm.sendStyle("用#i" + faceCoupon + "##b#t" + faceCoupon + "##k的话，样子你自己定。慢慢挑，不着急。", facenew);
        } else if (status == 2) {
            cm.dispose();
            if (cm.haveItem(faceCoupon)) {
                cm.gainItem(faceCoupon, -1);
                cm.setFace(facenew[selection]);
                cm.sendOk("好了，这才叫相由心生。");
            } else {
                cm.sendOk("没有高级会员卡的话，这一刀我不敢下。");
            }
        }
    }
}
