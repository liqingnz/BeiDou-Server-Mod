/**
 * @description 矿物/卷轴背包
 * @author hzh
 */
var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var iip = ItemInformationProvider.getInstance();
var inv_z;
var text;
var sel;
var selSet;

function start() {
    levelStart();
}

// 对话开始
function levelStart() {
    text = "#e选择背包#n\r\n\r\n";
	text += "#L4#矿物背包#l\r\n";
	text += "#L2#卷轴背包#l\r\n";
	inv_z = cm.getPlayer().getInventory(InventoryType.UNDEFINED);
	cm.sendNextSelectLevel("Perform", text);
}

function levelPerform(choose) {
	if (choose == 2 || choose == 4) {
		sel = choose;
		selSet = (sel == 2 ? juan : (sel == 4 ? kuang : null));
	}
	text = "\t\t\t#e#r#L0#返回#l#k#n \t\t #L888#一键存入#l \t\t #L999#一键取出#l \r\n\r\n";
    text += "\t===普通背包===\r\n";
    let hasVal = false;
	// 打印普通背包矿物/卷轴
	var rn = 0;
	var inventory = cm.getInventory(sel);
    for (let i = 1; i <= inventory.getSlotLimit(); i++) {
        let item = inventory.getItem(i);
        if (check(item)) {
			rn += 1;
            hasVal = true;
            text += "#L" + (-item.getItemId()) + "##i" + item.getItemId() + "#(" + item.getQuantity() +")#l";
			if (rn % 4 == 0)
				text += "\r\n";
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
	cm.sendNextSelectLevel("Move", text);
}

function levelMove(choose) {
	if (inv_z.getSlotLimit() != 127) 
		inv_z.setSlotLimit(127);
	// 处理普通背包与矿物背包之间的物品移动逻辑
	if(choose == 888) { // 一键存入(背包 -> 隐藏背包)
		//cm.dropMessage(0, "一键存入(背包 -> 隐藏背包)");
		for (let i = 0; i <= 96; i++) {
			let item = cm.getInventory(sel).getItem(i);
			if (check(item)) 
				if(!move(-item.getItemId())) break; 
		}
	} else if (choose == 999) { // 一键取出(隐藏背包 -> 背包)
		//cm.dropMessage(0, "一键取出(隐藏背包 -> 背包)");
		var items_z = inv_z.list().toArray();
		for (let i = items_z.length - 1; i >= 0; i--) {
			var item_z = items_z[i];
			if (check(item_z)) 
				if(!move(item_z.getItemId())) break; 
		}
	} else if (Math.abs(choose) >= 1000000){
		// 单个物品的移动
		 move(choose);
	} else {
		start();
		return;
	}
	// 回调
	levelPerform(sel);
	// cm.sendNextSelectLevel("Perform", text);
}
	
function move(choose) {
	if (choose <= -1000000) { // 背包 -> 矿物背包
		choose = -choose;
		// 判断矿物背包是否满了
		if (inv_z.isFull()) {
			cm.dropMessage(0, "矿物背包已经满了!");
			return false;
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
			return false;
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
	return true;
}

// 检查当前物品是否在指定的可移动的范围内
function check(item) {
	var flag = false;
	if (item == null)
		return flag;
	var itemId = item.getItemId();
	if (sel == 2) 
		flag =  ((itemId >= 2040000 && itemId <= 2049999) || selSet.has(item.getItemId()));
	if (sel == 4) {
		for (var arr of kuang) {
			if (itemId >= arr[0] && itemId <= arr[1]) {
				flag = true;
				break;
			}
		}
	}
	return flag;
}

var kuang = new Set([
	[4004000, 4004004], [4005000, 4005004], [4007000, 4007007],
	[4010000, 4010007], [4011000, 4011008], [4020000, 4020008], [4021000, 4021009],
	[4250000, 4251402], [4260000, 4260008]
]);
var juan = new Set([
	2340000
]);