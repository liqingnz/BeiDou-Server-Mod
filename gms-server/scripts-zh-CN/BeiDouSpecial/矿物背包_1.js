/**
 * @description 矿物/卷轴背包
 * @author hzh
 */
var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var iip = ItemInformationProvider.getInstance();
var text;
var sel;
var selSet;
var flag = false;

function start() {
    levelStart();
}

// 对话开始
function levelStart() {
    text = "#e选择背包#n\r\n\r\n";
	text += "#L4#矿物背包#l\r\n";
	text += "#L2#卷轴背包#l\r\n";
	cm.sendNextSelectLevel("Perform", text);
}

function levelPerform(choose) {
	if (choose == 0){
		start();
		return;
	}
	var inv_z = cm.getPlayer().getInventory(InventoryType.UNDEFINED);
	if (inv_z.getSlotLimit() != 127) 
		inv_z.setSlotLimit(127);
	// 处理普通背包与矿物背包之间的物品移动逻辑
	if(choose == 88888) { // 一键存入(背包 -> 隐藏背包)
		cm.dropMessage(0, "一键存入(背包 -> 隐藏背包)");
		for (let i = 0; i <= 96; i++) {
			let item = cm.getInventory(sel).getItem(i);
			if (check(item)) 
				move(-item.getItemId(), inv_z);
		}
	} else if (choose == 99999) { // 一键取出(隐藏背包 -> 背包)
		cm.dropMessage(0, "一键取出(隐藏背包 -> 背包)");
		var items_z = inv_z.list().toArray();
		for (let i = items_z.length - 1; i >= 0; i--) {
			var item_z = items_z[i];
			if (check(item_z)) 
				move(item_z.getItemId(), inv_z);
		}
	} else {
		// 单个物品的移动
		move(choose, inv_z);
	}
	
	
	text = "\t\t\t#e#r#L0#返回#l#k#n \t\t #L88888#一键存入#l \t\t #L99999#一键取出#l \r\n\r\n";
	text += "";
    text +=  "\t===普通背包===\r\n";
    let hasVal = false;
	// 打印普通背包矿物/卷轴
	var rn = 0;
    for (let i = 0; i < 96; i++) {
        let item = cm.getInventory(sel).getItem(i);
        if (check(item)) {
			rn += 1;
            hasVal = true;
            text += "#L" + (-item.getItemId()) + "##i" + item.getItemId() + "#(" + item.getQuantity() +")#l";
			if (rn % 4 == 0) {
				text += "\r\n";
			}
        }
    }
	
	// 打印隐藏背包矿物/卷轴
	text += "\r\n\r\n\r\n\t===" + (sel == 2 ? "卷轴": (sel == 4 ? "矿物" : "-")) + "背包===\r\n";
	var rn_z = 0;
	
	var sortData = inv_z.list().stream().sorted((s1, s2) => {
		return s2.getItemId() - s1.getItemId();
	}).toList();
	var items_z = sortData.iterator();
	while (items_z.hasNext()) {
		var item_z = items_z.next();
		hasVal = true;
		if (check(item_z)) {
			rn_z += 1;
			text += "#L" + item_z.getItemId() + "##i" + item_z.getItemId() + (sel == 2 ? ("#" + iip.getName(item_z.getItemId()) + "(") : "#(") + item_z.getQuantity() +")#l";
			if (rn_z % (sel == 2 ? 1 : 4) == 0) 
				text += "\r\n";
		}
	}
    if (!hasVal) {
        // 回到levelStart
        cm.sendNextLevel("Start", "背包栏下没有道具！");
        return;
    }
    // 回调
	cm.sendNextSelectLevel("Perform", text);
}

function move(choose, inv_z) {
	if (choose == 2 || choose == 4) {
		sel = choose;
		selSet = (sel == 2 ? juan : (sel == 4 ? kuang : null));
	} else if (choose <= -1000000) { // 背包 -> 矿物背包
		choose = -choose;
		// 判断矿物背包是否满了
		if (inv_z.isFull()) {
			cm.dropMessage(0, "矿物背包已经满了!");
			return;
		}
		var freeSlot = inv_z.getNextFreeSlot();
		var selItem = cm.getInventory(sel).findById(choose);
		var kuangItem = inv_z.findById(choose);
		var copy = selItem.copy();
		copy.setPosition(freeSlot);
		if (kuangItem != null) {
			copy.setQuantity(kuangItem.getQuantity() + selItem.getQuantity());
			inv_z.removeItem(kuangItem.getPosition(), kuangItem.getQuantity(), false);
		}
		cm.gainItem(choose, -selItem.getQuantity(), false);
		inv_z.addItemFromDB(copy);
	} else if (choose >= 1000000) { // 矿物背包 -> 背包
		// 判断普通背包是否满了
		if(cm.getInventory(sel).isFull()){
			if(sel == 2)
				cm.dropMessage(0, "消耗栏已经满了!");
			if(sel == 4)
				cm.dropMessage(0, "其他栏已经满了!");
			return;
		}
		var selItem = inv_z.findById(choose);
		var packageItem = cm.getInventory(sel).findById(choose);
		var copy = selItem.copy();
		// 移除矿物背包物品
		inv_z.removeItem(selItem.getPosition(), selItem.getQuantity(), false);
		// 添加到普通背包物品
		cm.gainItem(copy.getItemId(), copy.getQuantity(), false);
	}
	cm.dropMessage(0, "隐藏背包总空间:" + inv_z.getSlotLimit() + ", 剩余空间: " + inv_z.getNumFreeSlot());
}

// 检查当前物品是否在指定的可移动的范围内
function check(item) {
	if (sel == 2) 
		flag = item && ((item.getItemId() >= 2040000 && item.getItemId() <= 2049999) || selSet.has(item.getItemId()));
	if (sel == 4) 
		flag = item && selSet.has(item.getItemId());
	return flag;
}

var kuang = new Set([
	4004000, 4004001, 4004002, 4004003, 4004004,
	4010000, 4010001, 4010002, 4010003, 4010004, 4010005, 4010006, 4010007, 
	4020000, 4020001, 4020002, 4020003, 4020004, 4020005, 4020006, 4020007, 4020008, 
	4005000, 4005001, 4005002, 4005003, 4005004, 
	4007000, 4007001, 4007002, 4007003, 4007004, 4007005, 4007006, 4007007, 
	4011000, 4011001, 4011002, 4011003, 4011004, 4011005, 4011006, 4011007, 4011008, 
	4021000, 4021001, 4021002, 4021003, 4021004, 4021005, 4021006, 4021007, 4021008, 4021009 
]);

var juan = new Set([
	2340000
]);