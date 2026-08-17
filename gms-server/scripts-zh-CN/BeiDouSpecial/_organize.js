/**
 * @description 背包矿物/卷轴自动整理脚本, 自动将物品放入隐藏背包, 以及丢弃背包中不要的物品。此外还可以自动回收装备。
 * @author hzh
 * @fixed 修复整理后无文字提示：删除物品触发flag + 修复隐藏背包空间获取报错导致提示不显示
 * @fixed 修复现金装备（点装）被自动回收的bug
 */
var ItemId = Java.type('org.gms.constants.id.ItemId');
var ItemConstants = Java.type('org.gms.constants.inventory.ItemConstants');
var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var InventoryManipulator = Java.type('org.gms.client.inventory.manipulator.InventoryManipulator');
var player, cm, iip, inv_z;
var flag = false;
var juan = new Set([ 2340000 ]); // 卷轴配置
var kuang = new Set([ // 矿物配置
	[4004000, 4004004], [4005000, 4005004], [4007000, 4007007],
	[4010000, 4010007], [4011000, 4011008], [4020000, 4020008], [4021000, 4021009],
	[4250000, 4251402], [4260000, 4260008]
]);
var sel = {2 : juan, 4 : kuang};

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

// ================= 以下为卖装备相关配置 =================
var itemGender, jobType, sellCount = 0, sumtMeso = 0;
var checkRepeat = {};
var jobData = {
	1: new Set([100,110,111,112,120,121,122,130,131,132,1100,1110,1111,2100,2110,2111,2112]), // 战
	2: new Set([200,210,211,212,220,221,222,230,231,232,1200,1210,1211]), // 法
	4: new Set([300,310,311,312,320,321,322,1300,1310,1311]), // 弓
	8: new Set([400,410,411,412,420,421,422,1400,1410,1411]), // 飞
	16: new Set([500,510,511,512,520,521,522,1500,1510,1511]) // 海
};
// autoSell: 自动卖装备, 请填写为正整数, (自动贩卖背包第[autoSell]格之后的装备, 以此类推)
var autoSell = 20;
// exJob : 贩卖非当前职业的装备(false: 否, true : 是)
var exJob = true;
// exLev : 直接贩卖比角色等级小多少级的装备, 但是大于等于108级的装备不卖
var exLev = 20, exLevMax = 108;
// exLevlimit: 直接贩卖低于多少级的装备
var exLevlimit = 40;
// exGender: 是否贩卖非当前性别的装备(false: 否, true : 是)
var exGender = true; 

function start(chr, itemInformationProvider) {
	if (!((player = chr) != null && (cm = chr.getAbstractPlayerInteraction()) != null))
		return;
	iip = itemInformationProvider;
	inv_z = player.getInventory(InventoryType.UNDEFINED);
	// 整理卷/矿
	process();
	// 删除背包中的物品
	deleteItem();
	// 贩卖装备
	sellEquip();
	if(flag || sellCount > 0) {
		// 修复：提前计算隐藏背包剩余空间，用try-catch兜底，算不出来也不影响整体提示显示
		var freeSlot = "?";
		try {
			freeSlot = inv_z.getNumFreeSlot();
		} catch (e) {}
		var slotLimit = "";
		try {
			slotLimit = inv_z.getSlotLimit();
		} catch (e) { slotLimit = "?"; }
		player.showHint(`背包整理完毕 ~ \r\n` +
		(!flag ? "" : `当前隐藏背包剩余空间 : #b${freeSlot}#k / #e${slotLimit}#n\r\n`) + 
		(sellCount == 0 ? "" : `装备回收 #e#b${sellCount}#n#k 件 , 回收获得金币 :  #e#b${sumtMeso}#n`) , 280);
	}
	//player.message();  
}

function process() {
	if (inv_z.getSlotLimit() != 127) 
		inv_z.setSlotLimit(127);
	for (s in sel) {
		var inventory = cm.getInventory(parseInt(s));
		for (let i = 1; i <= inventory.getSlotLimit(); i++) {
			let item = inventory.getItem(i);
			if (check(item, s, sel[s])) 
				move(item, inventory);
		}
	}
}
// 只扫描消耗栏, 其他栏, 也扫描隐藏背包
function deleteItem() {
	var inventorys = [0, 2, 4];
	for (let i = 0; i < inventorys.length; i++) {
		var inventory = inventorys[i] == 0 ? inv_z : cm.getInventory(inventorys[i]);
		for (let j = 1; j <= inventory.getSlotLimit(); j++) {
			let item = inventory.getItem(j);
			if (item == null) continue;
			for (var k = 0; k < exNames.length; k++) {
				if(iip.getName(item.getItemId()).indexOf(exNames[k]) > 0) {
					if (inventorys[i] == 0)
						inventory.removeItem(item.getPosition(), item.getQuantity(), false);
					else 
						cm.gainItem(item.getItemId(), -item.getQuantity(), true);
					flag = true;	// 删除物品也设置标记，触发整理完毕提示
					continue;
				}
			}
			if (delSet.has(item.getItemId())) {
				cm.gainItem(item.getItemId(), -item.getQuantity(), true);
				flag = true;	// 删除物品也设置标记，触发整理完毕提示
			}
		}
	}
}
// 装备自动贩卖
function sellEquip() {
	var ie = player.getInventory(InventoryType.EQUIP);
	if (autoSell >= ie.getSlotLimit()) return; 
	if (autoSell <= 0) autoSell = 1; 
	for (var i = 1; i <= ie.getSlotLimit(); i++) {
		var equip = ie.getItem(i);
		if (equip == null) continue;
		var itemId = equip.getItemId(), index = i;

		// 现金装备（点装）不卖
		if (iip.isCash(itemId)) {
			continue;
		}

		if (i <= autoSell) {
			if (checkRepeat[itemId] == null) checkRepeat[itemId] = equip;
			if (checkRepeat[getName(itemId)] == null) checkRepeat[getName(itemId)] = equip;
			continue;
		}
		var sell = false, job0 = false, reqJob;
		if (exJob && !(job0 = ((reqJob = iip.getEquipStats(itemId).get("reqJob")) == 0))) {
			for (j in jobData) { // 判断此装备是不是当前角色职业可佩戴的装备
				if (jobData[j].has(player.getJob().getId())) {
					sell = (reqJob != j);
					jobType = j;
					break;
				}
			}
		}
		if (job0 && (iip.isUntradeableRestricted(itemId) || iip.isQuestItem(itemId) || equip.isUntradeable()))
			continue; // 任务装备或者不可交换的装备不卖
		if (exLev > 0 && (player.getLevel() - iip.getEquipLevelReq(itemId) >= exLev) && iip.getEquipLevelReq(itemId) < exLevMax)
			sell = true; // 比角色等级小[exLev]级的装备直接卖, 不考虑职业种类
		if (!sell && iip.getEquipLevelReq(itemId) < exLevlimit)
			sell = true; // 低于[exLevlimit]级的装备卖掉
		if (!sell && exGender && (itemGender = ItemId.getGender(itemId)) != 2)
			if (player.getGender() != itemGender)
				sell = true; // 性别不一样的装备卖掉
		// 最终被保留下来的多个相同装备只留一个
		if (!sell) {
			var oEquip;
			if ((oEquip = checkRepeat[itemId]) != null) {
				index = equipCompare(oEquip, equip, 1);
				sell = true;
			} else if ((oEquip = checkRepeat[getName(itemId)]) != null){
				index = equipCompare(oEquip, equip, 2);
				sell = true;
			} else {
				checkRepeat[itemId] = equip;
				checkRepeat[getName(itemId)] = equip;
			}
		}
		if (sell) {
			InventoryManipulator.removeFromSlot(player.getClient(), InventoryType.EQUIP, index, 1, false);
			var price = iip.getPrice(itemId, 1);
			sellCount += 1; 
			sumtMeso += price;
			if (price > 0)
				player.gainMeso(price, false);
		}
		
	}
}

function move(selItem, inventory) {
	// 判断矿物背包是否满了
	if (inv_z.isFull()) {
		player.message("矿物背包已经满了!");
		return;
	}
	var freeSlot = inv_z.getNextFreeSlot();
	var kuangItem = inv_z.findById(selItem.getItemId());
	var copy = selItem.copy();
	copy.setPosition(freeSlot);
	if (kuangItem != null) {
		copy.setQuantity(kuangItem.getQuantity() + selItem.getQuantity());
		inv_z.removeItem(kuangItem.getPosition(), kuangItem.getQuantity(), false);
	}
	cm.gainItem(selItem.getItemId(), -selItem.getQuantity(), false);
	inv_z.addItemFromDB(copy);
	flag = true;
}

function check(item, sel, selSet) {
	if (item == null)
		return false;
	var itemId = item.getItemId();
	if (sel == 2) 
		return ((itemId >= 2040000 && itemId <= 2049999) || selSet.has(item.getItemId()));
	if (sel == 4) {
		for (var arr of selSet) {
			if (itemId >= arr[0] && itemId <= arr[1])
				return true;
		}
	}
	return false;
}
// 给装备评分, 返回分数较低的装备的坐标
function equipCompare(eOld, eNow, type) {
	var strRatio ,dexRatio ,intRatio ,lukRatio;
	switch (parseInt(jobType)) {
		case 1: strRatio=0.3; dexRatio=0.1; intRatio=0; lukRatio=0; break;
		case 2: strRatio=0; dexRatio=0; intRatio=0.3; lukRatio=0.1; break;
		case 4: strRatio=0.1; dexRatio=0.3; intRatio=0; lukRatio=0; break;
		case 8: strRatio=0; dexRatio=0.1; intRatio=0; lukRatio=0.3; break;
		case 16:strRatio=0.2; dexRatio=0.2; intRatio=0; lukRatio=0; break
		default: break;
	}
	var oAtk = (jobType == 2 ? eOld.getMatk() : eOld.getWatk());
	var o = eOld.getStr() * strRatio + eOld.getDex() * dexRatio + eOld.getInt() * intRatio + eOld.getLuk() * lukRatio + 
		eOld.getHp() * 0.03 + eOld.getMp() * 0.02 + eOld.getWdef() * 0.05 + eOld.getMdef() * 0.05 +
		eOld.getAcc() * 0.03 + eOld.getAvoid() * 0.02 + oAtk  * 0.4;
	var eAtk = (jobType == 2 ? eNow.getMatk() : eNow.getWatk());
	var e = eNow.getStr() * strRatio + eNow.getDex() * dexRatio + eNow.getInt() * intRatio + eNow.getLuk() * lukRatio + 
		eNow.getHp() * 0.03 + eNow.getMp() * 0.02 + eNow.getWdef() * 0.05 + eNow.getMdef() * 0.05 +
		eNow.getAcc() * 0.03 + eNow.getAvoid() * 0.02 + eAtk  * 0.4;
	var index = o < e ? eOld.getPosition() : eNow.getPosition(); // 获取需要被删除的装备的坐标
	if (type == 1 && o < e) {
		checkRepeat[eNow.getItemId()] = eNow;
		delete checkRepeat[getName(eOld.getItemId())];
		checkRepeat[getName(eNow.getItemId())] = eNow;
	} else if (type == 2 && o < e) {
		checkRepeat[getName(eNow.getItemId())] = eNow;
		delete checkRepeat[eOld.getItemId()];
		checkRepeat[eNow.getItemId()] = eNow;
	}
	return index;
}
function getName(itemId) {
	var name = iip.getName(itemId);
	return name.length > 4 ? name.substring(2) : (name.length < 4 ? name : name.substring(1));
}
