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
/* 	
	NPC Name: 		Big Headward
        Map(s): 		Victoria Road : Henesys Hair Salon (100000104)
	Description: 		Random haircut

        GMS-like revised by Ronan -- contents found thanks to Mitsune (GamerBewbs), Waltzing, AyumiLove
*/

var status = 0;

var hariCoupon = 5150040;
var faceCoupon = 5150044;

// var mhair_r = Array(30010, 30070, 30080, 30090, 30100, 30690, 30760, 33000);
// var fhair_r = Array(31130, 31530, 31820, 31920, 31940, 34000, 34030);
// var mhair_v = Array(30010, 30070, 30080, 30090, 30100, 30480, 30560, 30690, 30760, 30850, 30890, 30930, 30950);
// var fhair_v = Array(31020, 31130, 31510, 31530, 31820, 31860, 31890, 31920, 31940, 31950, 34000);

// removed male face: 20003, 20007, 20008, 20012, 20016, 20022, 20028, 
// removed female face:
var mface_r = Array(20029, 20030, 20031, 20032, 20035, 20036, 20037, 20038, 20040, 20044, 20045, 20046, 20047, 20048, 20049, 20050, 20043, 20144);
var fface_r = Array(21007, 21008, 21012, 21016, 21022, 21028, 21029, 21030, 21031, 21033, 21034, 21035, 21036, 21037, 21038, 21042, 21043, 21044, 21045, 21046, 21047, 21048, 21049);
var mhair_v = Array(32520, 32540, 33150, 33160, 33250, 33290, 33310, 33320, 33380, 33430, 33440, 33480, 33500, 33510, 33550, 33580, 33600, 33800, 33820, 33830, 33930, 33940, 33950, 33960, 33990, 35090, 35190, 35210, 35220, 35330, 40030, 40040, 40050, 40060, 40070, 40510, 40540, 45080, 45120, 45150, 45160);
var fhair_v = Array(34420, 34450, 31960, 31970, 32550, 34150, 34160, 34180, 34190, 34210, 34290, 34270, 34260, 34470, 34480, 37200, 37420, 38770, 38780, 38840, 37860, 34710, 34730, 34750, 34770, 34780, 34810, 34900, 37030, 37050, 37060, 37070, 37080, 37090, 41580, 44500, 44980, 44990, 47520, 48170, 48200, 48220, 47280);

var newStyle = Array();

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
        if (mode == 1)
            status++;
        else
            status--;
        
        if (status == 0) {
            // cm.sendSimple("你好，我是#p1012117#, the most charming and stylish stylist around. If you're looking for the best looking hairdos around, look no further!\r\n\#L0##i5150040##t5150040##l\r\n\#L1##i5150044##t5150044##l");
            cm.sendSimple("你好，我是#p1012117#，我提供皇家美容服务~\r\n\#L0##i" + faceCoupon + "##z" + faceCoupon + "##l\r\n\#L1##i" + hariCoupon + "##z" + hariCoupon + "##l");
        } else if (status == 1) {
            if (selection == 0) {
                beauty = 1;
                
                newStyle = Array();
                if (cm.getPlayer().getGender() == 0) {
                    for(var i = 0; i < mface_r.length; i++) {
                        pushIfItemExists(newStyle, mface_r[i] + cm.getPlayer().getFace()% 1000 - (cm.getPlayer().getFace()% 100));
                    }
                }
                else {
                    for(var i = 0; i < fface_r.length; i++) {
                        pushIfItemExists(newStyle, fface_r[i] + cm.getPlayer().getFace()% 1000 - (cm.getPlayer().getFace()% 100));
                    }
                }
                
                // cm.sendStyle("Using the SPECIAL coupon you can choose the style your hair will become. Pick the style that best provides you delight...", hairnew);
                cm.sendStyle("选择你喜欢的样子吧：", newStyle);
            }
            else if (selection == 1) {
                beauty = 2;
                
                newStyle = Array();
                if (cm.getPlayer().getGender() == 0) {
                    for(var i = 0; i < mhair_v.length; i++) {
                        pushIfItemExists(newStyle, mhair_v[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                else {
                    for(var i = 0; i < fhair_v.length; i++) {
                        pushIfItemExists(newStyle, fhair_v[i] + parseInt(cm.getPlayer().getHair() % 10));
                    }
                }
                
                // cm.sendStyle("Using the SPECIAL coupon you can choose the style your hair will become. Pick the style that best provides you delight...", hairnew);
                cm.sendStyle("皇家阿托在此！", newStyle);
            }
        } else if (status == 2) {
            if (beauty == 1) {
                // if (cm.haveItem(5150040) == true){
                //     newStyle = Array();
                //     if (cm.getPlayer().getGender() == 0) {
                //         for(var i = 0; i < mhair_r.length; i++) {
                //             pushIfItemExists(newStyle, mhair_r[i] + parseInt(cm.getPlayer().getHair() % 10));
                //         }
                //     }
                //     else {
                //         for(var i = 0; i < fhair_r.length; i++) {
                //             pushIfItemExists(newStyle, fhair_r[i] + parseInt(cm.getPlayer().getHair() % 10));
                //         }
                //     }

                //     cm.gainItem(5150040, -1);
                //     cm.setHair(newStyle[Math.floor(Math.random() * newStyle.length)]);
                //     cm.sendOk("Enjoy your new and improved hairstyle!");
                // } else {
                //     cm.sendOk("Hmmm...it looks like you don't have our designated coupon...I'm afraid I can't give you a haircut without it. I'm sorry...");
                // }
                if (cm.haveItem(faceCoupon) == true){
                    cm.gainItem(faceCoupon, -1);
                    cm.setFace(newStyle[selection]);
                    cm.sendOk("两个字，精致！");
                } else {
                    // cm.sendOk("Hmmm...it looks like you don't have our designated coupon...I'm afraid I can't give you a haircut without it. I'm sorry...");
                    cm.sendOk("怎么？你还想白嫖我？！！办卡！！！");
                }
            } else if (beauty == 2) {
                if (cm.haveItem(hariCoupon) == true){
                    cm.gainItem(hariCoupon, -1);
                    cm.setHair(newStyle[selection]);
                    cm.sendOk("记住以后都不能洗头！");
                } else {
                    // cm.sendOk("Hmmm...it looks like you don't have our designated coupon...I'm afraid I can't give you a haircut without it. I'm sorry...");
                    cm.sendOk("怎么？你还想白嫖我？！！办卡！！！");
                }
            }
            
            cm.dispose();
        }
    }
}