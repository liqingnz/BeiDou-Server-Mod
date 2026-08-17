/**
 * @description 背包矿物/卷轴自动整理脚本, 自动将物品放入隐藏背包, 以及丢弃背包中不要的物品
 * @author hzh
 */
var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var iip;
var sel;
var selSet;
var flag = false;
var player;
var cm;
var inv_z;
var delSet = new Set([ // 这里配置你<<<随时随地, 任何时候>>>都想从背包中移除的物品ID, 有需要的话自行添加, 注意请使用英文逗号, 以免脚本出错且不容易发现问题
	2060000, /*2060001, 2060002, 2060003,*//*弓矢*/ 2061000, /*2061001, 2061002, 2061003,*//*弩矢*/
	/*怪物卡(保留)*//*子弹*//*眼药*//*回旋镖*//*补药*//*木陀螺*//*手枪弹*//*雪花镖*//*黑色利刃*/
	/*4030012,*/ 2330000, 2050001, 2070001, 2050002, 2070009, 2330001, 2070003, 2070002, 
	// 速度药水之类的，保留：强效魔力水2002003
	2002000, 2002001, 2002002, /*2002003,*/ 2002004, 2002005,
	2070000, 2070008, 2070004, // 飞镖
	2330002, 2330000, 2330003 // 子弹
]);
var exNames = [ // 物品名称中带有以下关键字的物品, 也将会被删除, 包括隐藏背包 (由于隐藏背包中只放矿与卷, 一般只针对卷轴进行名称匹配且批量清理)
	"命中率卷轴", "防御卷轴", "体力卷轴", "制作卷轴", "魔防卷轴"
];

function start(chr, itemInformationProvider) {
	if (chr == null || chr.getAbstractPlayerInteraction() == null)
		return;
	player = chr;
	iip = itemInformationProvider;
	cm = player.getAbstractPlayerInteraction();
	inv_z = player.getInventory(InventoryType.UNDEFINED);
	// 整理矿
	sel = 4;
	selSet = kuang;
	process(chr, inv_z);
	// 整理券
	sel = 2;
	selSet = juan;
	process(chr, inv_z);
	// 直接删除背包中的物品
	deleteItem();
	
	player.message("整理完毕~(无用物品已删除)");
	player.message("当前隐藏背包总空间:" + inv_z.getSlotLimit() + ", 剩余空间: " + inv_z.getNumFreeSlot());
}

function process(chr, inv_z) {
	if (inv_z.getSlotLimit() != 127) 
		inv_z.setSlotLimit(127);
	for (let i = 0; i <= 96; i++) {
		let item = cm.getInventory(sel).getItem(i);
		if (check(item)) 
			move(item.getItemId(), inv_z);
	}
}

// 只扫描装备栏, 消耗栏, 其他栏, 也扫描隐藏背包
function deleteItem() {
	var inventorys = [0, 1, 2, 4];
	for (let i = 0; i < inventorys.length; i++) {
		var inventory = inventorys[i] == 0 ? inv_z : cm.getInventory(inventorys[i]);
		for (let j = 0; j <= 96; j++) {
			let item = inventory.getItem(j);
			if (item == null) continue;
			for (var k = 0; k < exNames.length; k++) {
				if(iip.getName(item.getItemId()).toString().indexOf(exNames[k]) > 0) {
					if (inventorys[i] == 0)
						inventory.removeItem(item.getPosition(), item.getQuantity(), false);
					else 
						cm.gainItem(item.getItemId(), -item.getQuantity(), true);
					continue;
				}
			}
			if (delSet.has(item.getItemId())) 
				cm.gainItem(item.getItemId(), -item.getQuantity(), true);
		}
	}
}

function move(choose, inv_z) {
	// 判断矿物背包是否满了
	if (inv_z.isFull()) {
		player.message("矿物背包已经满了!");
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
}

function check(item) {
	if (sel == 2) 
		flag = item && ((item.getItemId() >= 2040000 && item.getItemId() <= 2049999) || selSet.has(item.getItemId()));
	if (sel == 4) 
		flag = item && selSet.has(item.getItemId());
	return flag;
}

var kuang = new Set([ // 矿物
	4004000, 4004001, 4004002, 4004003, 4004004,
	4010000, 4010001, 4010002, 4010003, 4010004, 4010005, 4010006, 4010007, 
	4020000, 4020001, 4020002, 4020003, 4020004, 4020005, 4020006, 4020007, 4020008, 
	4005000, 4005001, 4005002, 4005003, 4005004, 
	4007000, 4007001, 4007002, 4007003, 4007004, 4007005, 4007006, 4007007, 
	4011000, 4011001, 4011002, 4011003, 4011004, 4011005, 4011006, 4011007, 4011008, 
	4021000, 4021001, 4021002, 4021003, 4021004, 4021005, 4021006, 4021007, 4021008, 4021009 
]);

var juan = new Set([ // 卷轴
	2340000
]);