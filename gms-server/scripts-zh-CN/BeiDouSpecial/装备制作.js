/**
-- Odin JavaScript --------------------------------------------------------------------------------
	VIP Cab - Victoria Road : Lith Harbor (104000000)
-- By ---------------------------------------------------------------------------------------------
	Xterminator
-- Version Info -----------------------------------------------------------------------------------
	1.0 - First Version by Xterminator
---------------------------------------------------------------------------------------------------
**/
var status = 0;
var selectedType = -1;
var selectedItem = -1;
var stimulator = false;
var item;
var mats;
var matQty;
var cost;
var stimID;

var cd_item = 4001078;
var cd_mats = new Array(4011001,4011002,4001079);
var cd_matQty = new Array(1,1,1);
var cd_cost = 25000;

function start() {
    cm.getPlayer().setCS(true);
    var text = "你想要什么装备?#b";
    var options = new Array("什么是超级武器?","战士武器","弓弩武器","法师武器","飞侠武器","海盗武器",
        "强化战士武器","强化弓弩武器","强化法师武器","强化飞侠武器","强化海盗武器");
        
    if(cm.isQuestStarted(7301) || cm.isQuestStarted(7303)) options.push("Make #t4001078#");
    
    for (var i = 0; i < options.length; i++){
        text += "\r\n#L" + i + "# " + options[i] + "#l";
    }
    cm.sendSimple(text);
}

function action(mode, type, selection) {
    if (mode > 0)
        status++;
    else {
        cm.dispose();
        return;
    }
    if (status == 1) {
        selectedType = selection;
        if (selectedType > 5 && selectedType < 11) {
            stimulator = true;
            selectedType -= 5;
        }
        else
            stimulator = false;
        if (selectedType == 0) { //What's a stim?
            cm.sendNext("只有强化才会变得更强！超级武器就是最强的武器，能够给武器增加神秘力量~")
            cm.dispose();
        } else if (selectedType == 1){ //warrior weapon
            var selStr = "很好，那哪一种战士武器能得到更强的力量?#b";
            var weapon = new Array ("Lv. 110 单手剑#b","Lv. 110 单手斧#b","Lv. 110 单手钝器#b","Lv. 110 双手剑#b","Lv. 110 双手斧#b","Lv. 110 双手钝器#b",
                "Lv. 110 枪#b","Lv. 110 矛#b");
            for (var i = 0; i < weapon.length; i++){
                selStr += "\r\n#L" + i + "# " + weapon[i] + "#l";
            }
            cm.sendSimple(selStr);
        } else if (selectedType == 2){ //bowman weapon
            var selStr = "很好，那哪一件弓箭手的武器会得到更强的力量?#b";
            var weapon = new Array ("Lv. 110 弓#b","Lv. 110 弩#b");
            for (var i = 0; i < weapon.length; i++){
                selStr += "\r\n#L" + i + "# " + weapon[i] + "#l";
            }
            cm.sendSimple(selStr);
        } else if (selectedType == 3){ //magician weapon
            var selStr = "很好，那么哪一种魔法武器将会得到更强的力量?#b";
            var weapon = new Array ("Lv. 70 火法杖#b","Lv. 70 毒法杖#b","Lv. 70 冰法杖#b","Lv. 70 雷法杖#b","Lv. 103 火法杖#b","Lv. 103 毒法杖#b","Lv. 103 冰法杖#b","Lv. 103 雷法杖#b");
            for (var i = 0; i < weapon.length; i++){
                selStr += "\r\n#L" + i + "# " + weapon[i] + "#l";
            }
            cm.sendSimple(selStr);
        } else if (selectedType == 4){ //thief weapon
            var selStr = "很好，那哪个飞侠的武器会得到更强的力量?#b";
            var weapon = new Array ("Lv. 110 STR 短刀#b","Lv. 110 LUK 短刀#b","Lv. 110 拳套#b");
            for (var i = 0; i < weapon.length; i++){
                selStr += "\r\n#L" + i + "# " + weapon[i] + "#l";
            }
            cm.sendSimple(selStr);
        } else if (selectedType == 5){ //pirate weapon
            var selStr = "很好，那哪件海盗武器能得到更强的力量?#b";
            var weapon = new Array ("Lv. 110 指节#b","Lv. 110 短枪#b");
            for (var i = 0; i < weapon.length; i++){
                    selStr += "\r\n#L" + i + "# " + weapon[i] + "#l";
            }
            cm.sendSimple(selStr);
	}
        else if (selectedType == 11){ //cornian's dagger
            var selStr = "你是想溜进这些蜥蜴里救莫伊拉吗?我会尽我所能支持你的事业。给我一些资源我会给你做一模一样的 #t4001078#.";
            cm.sendNext(selStr);
	}
    } else if (status == 2) {
        selectedItem = selection;
        
        if (selectedType == 1){ //warrior weapon
            var itemSet = new Array(1302059,1312031,1322052,1402037,1412026,1422028,1432038,1442045,
1302285,1402204,1432176,1442232);    //巨匠
            var matSet = new Array(new Array(1302056,4000244,4000245,4005000),new Array(1312030,4000244,4000245,4005000),new Array(1322045,4000244,4000245,4005000),new Array(1402035,4000244,4000245,4005000),new Array(1412021,4000244,4000245,4005000),new Array(1422027,4000244,4000245,4005000),new Array(1432030,4000244,4000245,4005000),new Array(1442044,4000244,4000245,4005000),
new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313));     //巨匠
            var matQtySet = new Array(new Array(1,20,20,8),new Array(1,20,20,8),new Array(1,20,20,8),new Array(1,20,20,8),new Array(1,20,20,8),new Array(1,20,20,8),new Array(1,20,20,8),new Array(10,20,20,8),
new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2));     //巨匠
            var costSet = new Array(12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000,
12000000,12000000,12000000,12000000);     //巨匠
            item = itemSet[selectedItem];
            mats = matSet[selectedItem];
            matQty = matQtySet[selectedItem];
            cost = costSet[selectedItem];
        } else if (selectedType == 2){ //bowman weapon
            var itemSet = new Array(1452044,1462039,
1452214,1462202);
            var matSet = new Array(new Array(1452019,4000244,4000245,4005000,4005002),new Array(1462015,4000244,4000245,4005000,4005002),
new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313));
            var matQtySet = new Array(new Array(1,20,20,3,5),new Array(1,20,20,5,3),
new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2));
            var costSet = new Array(12000000,12000000,
12000000,12000000);
            item = itemSet[selectedItem];
            mats = matSet[selectedItem];
            matQty = matQtySet[selectedItem];
            cost = costSet[selectedItem];
        } else if (selectedType == 3){ //magician weapon
            var itemSet = new Array(1372035,1372036,1372037,1372038,1382045,1382046,1382047,1382048);
            var matSet = new Array(new Array(1372034,4005000,4005001,4005002,4005003,4005004),new Array(1382039,4005000,4005001,4005002,4005003,4005004),new Array(1372034,4005000,4005001,4005002,4005003,4005004),new Array(1382039,4005000,4005001,4005002,4005003,4005004),new Array(1372035,4000244,4000245,4005001,4005003),new Array(1372036,4000244,4000245,4005001,4005003),new Array(1372037,4000244,4000245,4005001,4005003),new Array(1372038,4000244,4000245,4005001,4005003),
new Array(4001242,4001241,4001094,1122000,4001006,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4000313));
            var matQtySet = new Array(new Array(1,2,2,2,2,2),new Array(1,2,2,2,2,2),new Array(1,2,2,2,2,2),new Array(1,2,2,2,2,2),new Array(1,20,20,5,2),new Array(1,20,20,5,2),new Array(1,20,20,5,2),new Array(1,20,20,5,2),new Array(1,1,1,1,10,2),new Array(1,1,1,1,10,2),new Array(1,1,1,1,10,2),new Array(1,1,1,1,10,2));
            var costSet = new Array(12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000,12000000);
            item = itemSet[selectedItem];
            mats = matSet[selectedItem];
            matQty = matQtySet[selectedItem];
            cost = costSet[selectedItem];
        } else if (selectedType == 4){ //thief weapon
            var itemSet = new Array(1332049,1332050,1472051,
1472223,1332225);
            var matSet = new Array(new Array(1332051,4000244,4000245,4005000,4005002),new Array(1332052,4000244,4000245,4005002,4005003),new Array(1472053,4000244,4000245,4005002,4005003),
new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313));
            var matQtySet = new Array(new Array(1,20,20,5,3),new Array(1,20,20,3,5),new Array(1,20,20,2,6),
new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2));
            var costSet = new Array(12000000,12000000,12000000,
12000000,12000000);
            item = itemSet[selectedItem];
            mats = matSet[selectedItem];
            matQty = matQtySet[selectedItem];
            cost = costSet[selectedItem];
        } else if (selectedType == 5){ //pirate weapon
            var itemSet = new Array(1482013,1492013,
1482177,1492188);
            var matSet = new Array(new Array(1482012,4000244,4000245,4005000,4005002),new Array(1492012,4000244,4000245,4005000,4005002),
new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313),new Array(4001242,4001241,4001094,1122000,4001006,4310003,4000313));
            var matQtySet = new Array(new Array(1,20,20,5,3),new Array(1,20,20,3,5),
new Array(1,1,1,1,10,5,2),new Array(1,1,1,1,10,5,2));
            var costSet = new Array(12000000,12000000,
12000000,12000000);
            item = itemSet[selectedItem];
            mats = matSet[selectedItem];
            matQty = matQtySet[selectedItem];
            cost = costSet[selectedItem];
        } else if (selectedType == 11){ //cornian's dagger
            item = cd_item;
            mats = cd_mats;
            matQty = cd_matQty;
            cost = cd_cost;
        }
        
        var prompt = "你想让我做一个 #t" + item + "#? 在这种情况下，我需要你提供特定的物品来制作它。不过，要确保你的库存有空间!!#b";
        if(stimulator){
            stimID = getStimID(item);
            prompt += "\r\n#i"+stimID+"# 1 #t" + stimID + "#";
        }
        if (mats instanceof Array){
            for(var i = 0; i < mats.length; i++){
                prompt += "\r\n#i"+mats[i]+"# " + matQty[i] + " #t" + mats[i] + "#";
            }
        } else {
            prompt += "\r\n#i"+mats+"# " + matQty + " #t" + mats + "#";
        }
        if (cost > 0)
            prompt += "\r\n#i4031138# " + cost + " meso";
        cm.sendYesNo(prompt);
    } else if (status == 3) {
        var complete = true;
        
        if(!cm.canHold(item, 1)) {
            cm.sendOk("先检查您的背包.");
            cm.dispose();
            return;
        }
        else if (cm.getMeso() < cost) {
            cm.sendOk("我的报酬是为了Leafre的利益。如果你付不起，那就走吧.");
            cm.dispose();
            return;
        } else {
            if (mats instanceof Array) {
                for(var i = 0; complete && i < mats.length; i++)
                    if (!cm.haveItem(mats[i], matQty[i]))
                        complete = false;
            }
            else if (!cm.haveItem(mats, matQty))
                complete = false;
        }
        if (stimulator){ //check for stimulator
            if (!cm.haveItem(stimID)) {
                complete = false;
            }
        }
        if (!complete)
            cm.sendOk("请把正确的东西带来。");
        else {
            if (mats instanceof Array) {
                for (var i = 0; i < mats.length; i++){
                    cm.gainItem(mats[i], -matQty[i]);
                }
            } else
                cm.gainItem(mats, -matQty);
            cm.gainMeso(-cost);
            if (stimulator) { //check for stimulator
                cm.gainItem(stimID, -1);
                var deleted = Math.floor(Math.random() * 5);
                if (deleted != 0) {
                    cm.gainItemBM(item, 1, true, true, 75);
                    cm.sendOk("这个过程完成了。好好对待你的武器。");
                } else {
                    cm.sendOk("不幸的是，本质是…和你的武器发生冲突。对你的损失我深表歉意。");
                }
            }
            else {//just give basic item
                cm.gainItem(item, 1);
                cm.sendOk("这个过程完成了。好好对待你的武器。");
            }
        }
        cm.dispose();
    }
}

function getStimID(equipID){
    var cat = Math.floor(equipID / 10000);
    switch (cat){
        case 130: //1h sword
            return 4130002;
        case 131: //1h axe
            return 4130003;
        case 132: //1h bw
            return 4130004;
        case 140: //2h sword
            return 4130005;
        case 141: //2h axe
            return 4130006;
        case 142: //2h bw
            return 4130007;
        case 143: //spear
            return 4130008;
        case 144: //polearm
            return 4130009;
        case 137: //wand
            return 4130010;
        case 138: //staff
            return 4130011;
        case 145: //bow
            return 4130012;
        case 146: //xbow
            return 4130013;
        case 148: //knuckle
            return 4130016;
        case 149: //pistol
            return 4130017;
        case 133: //dagger
            return 4130014;
        case 147: //claw
            return 4130015;
    }
    return 4130002;
}