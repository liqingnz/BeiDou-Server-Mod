var status;
var sel1, sel2, sel3, sel4;
var menu = Array("攻击药水","必成卷1", "瞬移之石", "宠物商店", "喇叭商店", "椅子商店", "点装戒指","表情饰品","点装商店","必成卷2","高级装备");

function start() {
	status = -1;
	sel1 = -1;
	if(cm.getJobId() == 910 || cm.getJobId() == 900 || cm.getJobId() == 800 ) {
	var text = "检测到你是GM管理员(代码910/900/800),是否使用GM商店？\r\n";
	text += generateSelectionMenu(menu);
	cm.sendSimple(text);
	}
	else {
   		cm.openShopNPC(9201101);  //新叶城攻击药水商店
		cm.dispose();
	}
}

function action(mode, type, selection) {
	status++;
	 if(mode != 1) {
		if(mode == 0 && type != 4)
			status -= 2;
		else {
			cm.dispose();
			return;
		}
	}
	if(status == 0) {
		if(sel1 == -1)
			sel1 = selection;
		 if(sel1 == 0) { 
			cm.openShopNPC(9201101); 
			cm.dispose();
		} else if(sel1 == 1) { 
			cm.openShopNPC(1337); 
			cm.dispose();
		} else if(sel1 == 2) { 
			cm.openShopNPC(1338); 
			cm.dispose();
              		} else if(sel1 == 3) { 
			cm.openShopNPC(9999992);
			cm.dispose();
                                } else if(sel1 == 4) {
			cm.openShopNPC(9999993);
			cm.dispose();
                                } else if(sel1 == 5) {
			cm.openShopNPC(9999994);
			cm.dispose();
                                } else if(sel1 == 6) {
			cm.openShopNPC(9999995);
			cm.dispose();
		} else if(sel1 == 7) {
			cm.openShopNPC(9999996);
			cm.dispose();
		} else if(sel1 == 8) {
			cm.openShopNPC(9999997);
			cm.dispose();
		} else if(sel1 == 9) {
			cm.openShopNPC(9999998);
			cm.dispose();
		} else if(sel1 == 10) {
			cm.openShopNPC(9999999);
			cm.dispose();
                                } 
	} else if(status == 1) {
		if(sel1 == 2) {
			var item1 = cm.getEquipInSlot(1);
			var item2 = cm.getEquipInSlot(2);
			if(item1 == null || item2 == null) {
				cm.sendOk("请把装备放好");
				cm.dispose();
			} else {
				cm.eatEquip(cm.getPlayer(), item2, item1);
				cm.removeItem(2, 1, 1);
			}
		}
	}
}

function generateSelectionMenu(array) { // nice tool for generating a string for the sendSimple functionality
	var menu = "";
	for(var i = 0; i < array.length; i++) {
		menu += "#L" + i + "##r" + array[i] + "#k#l";
		if(i % 4 == 3) {
			menu += "\r\n";
		} else {
			menu += "\t";
		}
	}
	return menu;
}

//    cm.openShopNPC(11100);    //打开杂货商店（火焰的眼、万能、魔法石等，价格贵）
//    cm.openShopNPC(9201058);    //打开新叶城防具商店
//    cm.openShopNPC(9201059);    //打开新叶城武器商店
//    cm.openShopNPC(9201060);    //打开新叶城药水商店
//    cm.openShopNPC(9201099);    //打开新叶城隐藏商店1（万能、雪碧、钻石弓弩箭矢等，价格便宜）
//    cm.openShopNPC(9201101);    //打开新叶城隐藏商店2（各种变态加属性药水，价格贵）
//    cm.openShopNPC(1337);    //打开GM专用商店1（GM套装、白色必成卷、高级装备等，全部1金币）
//    cm.openShopNPC(1338);    //打开类似新叶城商店（干姜水+高级瞬移之石）
//    cm.openShopNPC(9999992);    //打开GM宠物商店（宠物和宠物用品全部1金币）
//    cm.openShopNPC(9999993);    //打开GM喇叭商店（全部1金币）
//    cm.openShopNPC(9999994);    //打开GM椅子商店（全部1金币）
//    cm.openShopNPC(9999995);    //打开GM点装戒指商店（全部1金币）
//    cm.openShopNPC(9999996);    //打开GM表情、眼饰、脸饰商店（全部1金币）
//    cm.openShopNPC(9999997);    //打开GM点装武器帽子耳环衣服鞋子商店（全部1金币，种类不是很多）
//    cm.openShopNPC(9999998);    //打开GM专用商店2（100%武器必成卷轴、混沌祝福、暗黑龙王石，全部1金币）
//    cm.openShopNPC(9999999);    //打开GM专用商店3（GM套装、高级装备等，全部1金币）