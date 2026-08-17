/**
 * @description 获取各种物品, 比如任务道具, 怪物掉落, 点装等
 * @author hzh
 * @fixed 修复搜索“枫叶”时，点击装备分页报错：isCash读取WZ数据时Short转Integer失败，用try-catch兜底
这是服务端代码的 bug：DataTool.getInt() 方法读取 WZ 装备属性时，直接 (Integer) data 强转，但部分 WZ 节点的数据是以 Short 类型存储的，强转失败。
 */
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var StringBuilder = Java.type('java.lang.StringBuilder');
var LifeFactory = Java.type('org.gms.server.life.LifeFactory');
var ItemConstants = Java.type('org.gms.constants.inventory.ItemConstants');
var conn = Java.type('org.gms.util.DatabaseConnection');
var ServerManager = Java.type('org.gms.manager.ServerManager');
var dropService = ServerManager.getApplicationContext().getBean("dropService");
var DropSearchReq = Java.type('org.gms.model.dto.DropSearchReqDTO');
var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);
var iip = ItemInformationProvider.getInstance();
var text, sb, inputText;
var page = 1, sizeLimit = 60;
var firstSearch = true;
var searchItems, searchType = -1;
var itemType = [["未知"],["装备", "点装"],["消耗"],["设置"],["其他"],["商城", "宠物"]];

function start() {
	text = "请输入物品名称: \r\n #r(检索成功后将消耗10000金币)";
	cm.getInputTextLevel("SearchItem", text);
}

function levelSearchItem() {
	inputText = (inputText == null ? cm.getText() : inputText);
	if (inputText.trim() == "") {
		inputText = null;
		cm.getInputTextLevel("SearchItem", text);
		return;
	}
	if (searchItems == null || searchItems.size() <= 0) {
		searchItems = ItemInformationProvider.getItemsIDsFromName(inputText);
		// 排除发型与脸饰数据
		searchItems = searchItems.stream()
			.filter((item) => !(ItemConstants.isFace(item.getLeft()) || ItemConstants.isHair(item.getLeft()))).toList();
	}
	// 根据类型筛选道具
	var resultData = searchItems;
	if (searchType >= 1 && searchType <= 5)
		resultData = searchItems.stream()
			.filter((item) => Math.floor(item.getLeft() / 1000000) == searchType).toList();
	var itemSize = resultData.size();
	sb = new StringBuilder(4096);
	sb.append(`#e检索到物品 #r${itemSize}#k 个, 当前页: #r${page}#k, 当前栏目: #r${searchType==-1?"全部":itemType[searchType][0]}#k\r\n#r#n[ 装备/消耗/其他 ] 物品, 点击左侧ID可查看掉落该道具的怪物#n\r\n#n`);
	sb.append(`#e#r#L0#返回#l#n #k#L1000#装备#l #k#L2000#消耗#l #k#L3000#设置#l #k#L4000#其他#l #k#L5000#商城#l\r\n\r\n`);
	var pageText = "";
	for (var i = 1; i <= Math.ceil(itemSize/sizeLimit); i++) {
		if (i < Math.ceil(itemSize/sizeLimit))
			pageText += `#b#L${i}#${i}#l#n`;
		else 
			pageText += `#b#L${i}#${i}#l#n\r\n\r\n`;
	}
	var zero = true;
	var result = resultData.stream().skip(sizeLimit * (page - 1)).limit(sizeLimit).toList();
	sb.append(pageText);
	result.forEach(function(item) {
		var itemId = item.getLeft();
		var itemName = item.getRight().toLowerCase();
		var t = Math.floor(itemId / 1000000);
		var isCashItem = false;
		try { isCashItem = iip.isCash(itemId); } catch(e) {}	// 修复：isCash内部读WZ数据时可能Short转Integer失败，兜底按非点装处理
		if ((t == 1 && !isCashItem) || t == 2 || t == 4)
			sb.append(`#L${itemId+1000000000}##b${itemId}#k#L${itemId}##d[${getItemType(itemId)}] #r#z${itemId}##l#l`);
		else
			sb.append(`#L${itemId}##b${itemId}#k      #d[${getItemType(itemId)}] #r#z${itemId}##l`);			
		sb.append("\r\n");
		zero = false;
	});
	sb.append("\r\n" + pageText);
	if (zero && searchType == -1) {
		inputText = null;
		cm.getInputTextLevel("SearchItem", "#r未检测到物品, 请重新输入物品名称:");
	} else if (zero && searchType != -1){
		sb.append("\r\n\t\t#e#r无相关数据#k#n\r\n");
		cm.sendNextSelectLevel("Perform", sb.toString());
	} else {
		if (firstSearch) {
			firstSearch = false;
			cm.gainMeso(-10000);
		}
		cm.sendNextSelectLevel("Perform", sb.toString());
	}
}

function levelPerform(selection) {
	if (selection == 0) { // 处理返回
		searchType = -1;
		firstSearch = true;
		inputText = null; searchItems = null;
		start();
		return;
	} else if (selection < 1000) { // 处理页面跳转
		page = selection;
		levelSearchItem();
		return;
	} else if (selection >= 1000 && selection <= 5000) { // 处理栏目搜索
		page = 1; searchType = selection / 1000;
		levelSearchItem();
		return;
	}  else if (selection >= 1000000000) { // 查询掉落该道具的怪物
		selection = selection - 1000000000;
		levelShowMobs(selection);
	} else { // 获取物品
		getItem(selection);
		cm.dispose(); // 结束对话，避免卡NPC
	}
}

var selItemId, selMobId;
function levelShowMobs(selection) {
	if (selItemId == null)
		selItemId = selection;
	var mapText = "";
	if (selection == 0) { // 处理返回
		selItemId = null; selMobId = null;
		levelSearchItem();
		return;
	} else if (selection == 1) { // 重选怪物
		selMobId = null;
	} else if (selection < 0) {// 地图传送
		cm.getPlayer().changeMap(-selection);
		cm.dispose();
	} else if (selection > 1000000000) {
		selMobId = selection - 1000000000;
		mapText = getMapsStrByMobId(selMobId);
	}
	var msgText = "\r\n#e#d=== 道具信息(鼠标悬浮在道具名称上可查看详情) ===#k#n\r\n";
	msgText += `\r\n#L${selItemId}#道具: #i${selItemId}:# ID: #b${selItemId}#k - #d[${getItemType(selItemId)}] #r#z${selItemId}##l\r\n`;
	var mobText = "\r\n\r\n#e#d=== 掉落该道具的怪物(点击可查看怪物出没地区) ===#k#n\r\n";
	var mobIds = getDroppers(selItemId);
	// 遍历怪物ID
	if (mobIds.length > 0) {
		mobIds.forEach(function(x) {
			var stats, mob = LifeFactory.getMonster(x[0]);
			if (mob != null)
				stats = mob.getStats();
			if (selMobId == null || (selMobId != null && selMobId == x[0]))
				mobText += "#L" + (x[0] + 1000000000) + "##b" + x[0] + "#k - #r#o" + x[0] + "# " + ((stats == null || stats.getLevel() == null) ? "" : ("#e - Lv.#n" + stats.getLevel())) + " #d [ " + (x[1]/10000) + "% ]" + "#l\r\n";
		});
	} else
		mobText += "\r\n\t\t#e#r没有怪物掉落该道具#k#n\r\n";
	var end = "#e#r#L0#返回#l#n #k#L1#怪物重选#l\r\n\r\n";
	cm.sendNextSelectLevel("ShowMobs", (end + msgText + mobText + mapText), 2);
}

// 根据怪物ID查询该怪物出没地图
function getMapsStrByMobId(mobId) {
	var mapText = `\r\n\r\n#e#d===#r#o${mobId}##d的出没地区(点击可传送)===#k#n\r\n`;
	var mobBook = dataProvider.getData("MonsterBook.img");
	var mobData = mobBook.getChildByPath(String(mobId));
	var mapIds, found = false;
	// MonsterBook 找不到地图信息就去MobLocation中找
	if (mobData == null || mobData.getChildByPath("map") == null)
		mapIds = getMobMaps(mobId);
	else
		mapIds = mobData.getChildByPath("map").getChildren().stream().map((x) => x.getData()).toArray();
	if(mapIds.length > 0) {
		for (var i = 0; i < mapIds.length; i++) {
			try { var mapId = mapIds[i], mapData = cm.getMap(mapId), mobCountInMap; } catch(e) { continue; }
			if (mapData == null || (mobCountInMap = mapData.countMonster(mobId)) == 0) continue;
			mapText += `#L${-mapId}##b${mapId}#k - #r#m${mapId}# (${mobCountInMap} 只)#l\r\n`;
			found = true;
		}
	}
	if (!found)
		mapText += "\r\n\t\t#e#r无法获取怪物的出没地区#k#n\r\n";
	return mapText;
}

// 获取怪物出没地图（查MobLocation）
function getMobMaps(mobId) {
	var maps = [];
    var mobLocNode = etcProvider.getData("MobLocation.img").getChildByPath(String(mobId));
    if (mobLocNode != null && !mobLocNode.getChildren().isEmpty()) {
        var children = mobLocNode.getChildren();
        for (var i = 0; i < children.size(); i++) {
            var mapId = children.get(i).getData();
            if (mapId > 0) maps.push(mapId);
        }
    }
    return maps;
}

// 根据物品id查询掉落该物品的怪物数据
function getDroppers(itemId) {
	var returnData = [];
	var data = new DropSearchReq();
	data.setItemId(itemId);
	data.setPageNo(1);
	data.setPageSize(1000);
	var droppers = dropService.getDropList(data, false).getRecords();
	droppers.stream().forEach((x) => returnData.push([x.getDropperId(), x.getChance()]));
	return returnData;
}

function getItem(itemId) { 
	// 必须是丢出 , 不能直接生成到背包, 假如物品有问题, 到背包后游戏会直接崩溃, 这类有问题的物品无法丢出/拾取.
	var p = cm.getPlayer();
	var item = iip.getEquipById(itemId);
	p.getMap().spawnItemDrop(p, p, item, p.getPosition(), false, false);
}

// 判断物品类型
function getItemType(itemId) {
	try {
		var type = Math.floor(itemId / 1000000);
		if (itemId < 1000000 || type < 1 || type > 5)
			return itemType[0][0];
		if (type == 1 && iip.isCash(itemId))
			return itemType[type][1];
		if (type == 5 && ItemConstants.isPet(itemId))
			return itemType[type][1];
		return itemType[type][0];
	} catch (e) {
		return "#r异常#d";
	}
}

/** 备用代码: 根据物品ID生成物品到背包
var itemType = iip.getEquipById(selection).getInventoryType();
if (cm.getPlayer().getInventory(itemType).isFull()) {
	cm.dropMessage(1, itemType.getName() + "栏已满, 请腾出位置后再尝试!~");
} else {
	cm.dropMessage(0, iip.getItemData(selection) + "");
	cm.gainItem(selection,1);
	cm.dispose(); // 结束对话，避免卡NPC
}
*/