/**
 * @description 道具手册, 查询道具对应的掉落怪物
 * @author hzh
 * @fixed 非GM权限控制：传送功能仅对GM开放，非GM点击提示并返回
 */

var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var MonsterInformationProvider = Java.type('org.gms.server.life.MonsterInformationProvider');
var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var LifeFactory = Java.type('org.gms.server.life.LifeFactory');

var stringProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var iip = ItemInformationProvider.getInstance();
var mip = MonsterInformationProvider.getInstance();

var sb;
var inputText;
var mobCardId;
var currentMobId;
var currentItemId;
var searchedById = false;

function start() {
	var text = "请输入道具名称或道具ID:";
	cm.getInputTextLevel("SearchItemData", text);
}

function levelSearchItemData() {
	inputText = (inputText == null ? cm.getText() : inputText);
	if (inputText.trim() == "") {
		inputText = null;
		cm.getInputTextLevel("SearchItemData", "请输入道具名称或道具ID:");
		return;
	}

	// 纯数字按道具ID精确查询
	var searchValue = inputText.trim();
	if (/^\d+$/.test(searchValue)) {
		var inputItemId = parseInt(searchValue);
		if (cm.itemExists(inputItemId)) {
			searchedById = true;
			levelShowMobs(inputItemId);
			return;
		}
		inputText = null;
		cm.getInputTextLevel("SearchItemData", "#r未检测到道具ID " + inputItemId + "，请重新输入:");
		return;
	}
	searchedById = false;

	if (sb == null)
		sb = new StringBuilder(4096);
	sb.append("#r请选择道具以查看掉落怪物.#n\r\n\r\n#n");
	var zero = true;

	// 搜索 Consume.img (消耗物品 - 扁平结构)
	var consumeData = stringProvider.getData("Consume.img");
	if (consumeData != null) {
		consumeData.getChildren().forEach(function(item) {
			if (checkItem(item, "[消耗]")) zero = false;
		});
	}

	// 搜索 Eqp.img (装备物品 - 嵌套结构: Eqp → 分类 → 道具)
	var eqpData = stringProvider.getData("Eqp.img");
	if (eqpData != null) {
		var eqpRoot = eqpData.getChildByPath("Eqp");
		if (eqpRoot != null) {
			eqpRoot.getChildren().forEach(function(category) {
				category.getChildren().forEach(function(item) {
					if (checkItem(item, "[装备]")) zero = false;
				});
			});
		}
	}

	// 搜索 Etc.img (其他物品 - 嵌套结构: Etc → 道具)
	var etcData = stringProvider.getData("Etc.img");
	if (etcData != null) {
		var etcRoot = etcData.getChildByPath("Etc");
		if (etcRoot != null) {
			etcRoot.getChildren().forEach(function(item) {
				if (checkItem(item, "[其他]")) zero = false;
			});
		}
	}

	// 搜索 Ins.img (设置物品 - 扁平结构)
	var insData = stringProvider.getData("Ins.img");
	if (insData != null) {
		insData.getChildren().forEach(function(item) {
			if (checkItem(item, "[设置]")) zero = false;
		});
	}

	// 搜索 Cash.img (现金物品)
	var cashData = stringProvider.getData("Cash.img");
	if (cashData != null) {
		cashData.getChildren().forEach(function(item) {
			if (checkItem(item, "[现金]")) zero = false;
		});
	}

	if (zero) {
		inputText = null;
		cm.getInputTextLevel("SearchItemData", "#r未检测到道具, 请重新输入道具名称:");
	} else
		cm.sendNextSelectLevel("ShowMobs", sb.toString(), 2);
	sb = null;
}

function checkItem(item, tag) {
	var id = parseInt(item.getName());
	if (isNaN(id)) return false;
	var itemName = DataTool.getString(item.getChildByPath("name"), "NO-NAME");
	if (itemName.toLowerCase().includes(inputText.toLowerCase())) {
		sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(itemName).append("#k").append(tag).append("\r\n");
		return true;
	}
	return false;
}

function levelShowMobs(itemId) {
	currentItemId = itemId;
	// 获取道具名称
	var itemName = "未知道具";
	try {
		var nameObj = iip.getName(itemId);
		if (nameObj != null) itemName = nameObj.toString();
	} catch (e) {}

	var msgText = "\r\n#e#d=== 道具信息 ===#k#n\r\n";
	msgText += "道具: #v" + itemId + ":# #b" + itemId + "#k - #r#z" + itemId + "##k\r\n";

	// 遍历所有怪物, 查找掉落该道具的怪物
	var mobText = "\r\n#e#d=== 掉落该道具的怪物(点击可查看详情) ===#k#n\r\n";
	var mobList = [];
	var mobData = stringProvider.getData("Mob.img");
	mobData.getChildren().forEach(function(mob) {
		var mobId = parseInt(mob.getName());
		if (isNaN(mobId)) return;
		try {
			var drops = mip.retrieveDrop(mobId);
			if (drops != null) {
				var found = false;
				drops.forEach(function(d) {
					if (d.itemId == itemId) {
						found = true;
					}
				});
				if (found) {
					var name = DataTool.getString(mob.getChildByPath("name"), "NO-NAME");
					mobList.push({id: mobId, name: name});
				}
			}
		} catch (e) {}
	});

	if (mobList.length == 0) {
		mobText += "\r\n\t\t#e#r没有怪物掉落该道具#k#n\r\n";
	} else {
		mobList.forEach(function(m) {
			mobText += "#L" + m.id + "##b" + m.id + "#k - #r" + m.name + "#l\r\n";
		});
	}

	var end = "";
	if (cm.getPlayer().isGM()) {
		end += "\r\n#e#g#L77777778#刷该道具（输入数量）#l\r\n";
	}
	end += "#e#r#L0#返回#l\r\n";
	cm.sendNextSelectLevel("Perform", (msgText + mobText + end), 2);
}

function levelPerform(mobId) {
	if (mobId == 0) {
		if (searchedById) {
			searchedById = false;
			inputText = null;
			cm.getInputTextLevel("SearchItemData", "请输入道具名称或道具ID:");
			return;
		}
		levelSearchItemData();
		return;
	}
	if (mobId == 77777778) {
		cm.getInputTextLevel("SpawnItem", "请输入要获得的数量 (1~200):");
		return;
	}
	currentMobId = mobId;
	var mob = LifeFactory.getMonster(mobId);
	if (mob == null) {
		sb = new StringBuilder(4096);
		sb.append("#r由于数据原因, 刚刚选择的怪物不存在.#n\r\n\r\n#n");
		levelSearchItemData();
		return;
	}

	// 检测怪物卡片ID (用于图片展示)
	mobCardId = null;
	try {
		var dropDatas = mip.retrieveDrop(mobId);
		if (dropDatas != null) {
			dropDatas.forEach(function(d) {
				if (d.itemId > 0) {
					try {
						var it = iip.getEquipById(d.itemId).getInventoryType().name();
						if (it == "USE") {
							var itemName = iip.getName(d.itemId).toString();
							if (itemName.indexOf("卡片") > 0)
								mobCardId = d.itemId;
						}
					} catch (e) {}
				}
			});
		}
	} catch (e) {}

	// 怪物基本数据
	var stats = mob.getStats();
	msgText = getMobImage(mob) + " \t #eLv.#n" + stats.getLevel() + "\r\n";
	msgText += "[ #e#d" + mob.getName() + "#n " + (mob.isBoss() ? "#r#eBOSS怪物#n#k" : "#d普通怪物#n#k") + " ]  #e#rHP：" + mob.getMaxHp().toString() + "  #e#bMP：" + mob.getMaxMp() + "\r\n#k#n";
	msgText += "物攻：" + stats.getPADamage().toString() + "\t 物防：" + stats.getPDDamage() + "\t";
	msgText += "魔攻：" + stats.getMADamage().toString() + "\t 魔防：" + stats.getMDDamage() + "\r\n";

	// 怪物地图数据（先查MonsterBook，查不到则扫描Map.wz）
	var mapText = "\r\n#e#d=== 出没地区(点击可传送,仅限GM) ===#k#n\r\n";
	var mapsWithCount = getMobMaps(mobId);
	if (mapsWithCount.length == 0) {
		mapText += "\r\n\t\t#e无法获取怪物的出没地区#n\r\n";
		mapText += "\t\t#e#r(有概率搜索不到，可去怪物手册搜索)#k#n\r\n";
	} else {
		mapsWithCount.sort(function(a, b) { return b.count - a.count; });
		for (var i = 0; i < mapsWithCount.length; i++) {
			var m = mapsWithCount[i];
			var countStr = m.count > 0 ? " ×" + m.count : "";
			mapText += "#L" + (-m.mapId) + "##b" + m.mapId + "#k - #r#m" + m.mapId + "#" + countStr + "#l\r\n";
		}
	}

	var end = "";
	if (cm.getPlayer().isGM()) {
		end += "\r\n#e#g#L77777777#原地召唤怪物#l\r\n";
	}
	end += "#e#r#L0#返回列表#l\r\n";
	cm.sendNextSelectLevel("Process", (msgText + mapText + end), 2);
}

function levelProcess(id) {
	if (id == 0) {
		mobCardId = null;
		levelSearchItemData();
		return;
	}
	if (id == 77777777) {
		cm.getInputTextLevel("SpawnMobs", "请输入要召唤的数量 (1~100):");
		return;
	}
	// 非GM权限校验 —— 传送功能仅对GM开放，菜单显示不变，点击后才提示
	if (id < 0 && !cm.getPlayer().isGM()) {
		cm.sendNextSelectLevel("GMNotAllow", "#e#d  该功能仅对GM开放#k#n\r\n\r\n#e#r#L0#返回#l\r\n", 2);
		return;
	}
	if (id < 0) {
		cm.getPlayer().changeMap(-id);
	} else {
		var p = cm.getPlayer();
		var item = iip.getEquipById(id);
		p.getMap().spawnItemDrop(p, p, item, p.getPosition(), false, false);
	}
	cm.dispose();
}

// 处理非GM提示页的返回按钮
function levelGMNotAllow(id) {
	if (id == 0) {
		levelPerform(currentMobId);
	}
}

function levelSpawnMobs() {
	var input = cm.getText();
	var count = parseInt(input);
	if (isNaN(count) || count <= 0) {
		cm.sendOkLevel("SpawnMobs", "请输入有效的正整数！");
		return;
	}
	var map = cm.getPlayer().getMap();
	var pos = cm.getPlayer().getPosition();
	for (var i = 0; i < count; i++) {
		map.spawnMonsterOnGroundBelow(currentMobId, pos.x, pos.y);
	}
	cm.sendOk("已在原地召唤 #b" + count + "#k 只怪物（ID: " + currentMobId + "）。");
	cm.dispose();
}

function levelSpawnItem() {
	var input = cm.getText();
	var count = parseInt(input);
	if (isNaN(count) || count <= 0) {
		cm.sendOkLevel("SpawnItem", "请输入有效的正整数！");
		return;
	}
	if (count > 200) {
		count = 200;
	}
	if (cm.canHold(currentItemId, count)) {
		cm.gainItem(currentItemId, count);
		cm.sendOk("已获得 #b" + count + "#k 个 #v" + currentItemId + ":# #z" + currentItemId + "#。");
	} else {
		cm.sendOk("背包空间不足！");
	}
	cm.dispose();
}

// ========== 获取怪物出没地图（先查MonsterBook，查不到则仅GM扫描Map.wz） ==========
function getMobMaps(mobId) {
	var mobBook = stringProvider.getData("MonsterBook.img");
	var mobData = mobBook.getChildByPath(String(mobId));
	if (mobData != null) {
		var maps = [];
		var mapNode = mobData.getChildByPath("map");
		if (mapNode != null && !mapNode.getChildren().isEmpty()) {
			mapNode.getChildren().forEach(function(map) {
				var mid = map.getData();
				var count = getMobCountInMap(mobId, mid);
				maps.push({mapId: mid, count: count});
			});
			if (maps.length > 0) {
				return maps;
			}
		}
	}
	// MonsterBook 无有效数据 → 仅GM才扫描地图，非GM直接返回空
	if (!cm.getPlayer().isGM()) {
		return [];
	}
	cm.dropMessage(0, "MonsterBook无数据，正在扫描地图文件...");
	return scanMapsForLife(mobId, "m");
}


// ===========================
// 解析 Map.wz XML，统计指定怪物在指定地图上的出现数量
// ===========================
function getMobCountInMap(mobId, mapId) {
	try {
		var padded = String(mapId).padStart(9, '0');
		var filePath = "wz/Map.wz/Map/Map" + padded.charAt(0) + "/" + padded + ".img.xml";

		var file = new java.io.File(filePath);
		if (!file.exists()) return 0;

		var dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance();
		var builder = dbf.newDocumentBuilder();
		var doc = builder.parse(file);

		var count = 0;
		var lifeList = doc.getElementsByTagName("imgdir");
		for (var i = 0; i < lifeList.getLength(); i++) {
			var node = lifeList.item(i);
			var parentAttr = node.getParentNode().getAttributes();
			if (parentAttr == null) continue;
			var nameAttr = parentAttr.getNamedItem("name");
			if (nameAttr == null || nameAttr.getNodeValue() != "life") continue;

			var childNodes = node.getChildNodes();
			var entryType = null;
			var entryId = 0;
			for (var j = 0; j < childNodes.getLength(); j++) {
				var child = childNodes.item(j);
				if (child.getNodeType() != 1) continue;
				var attr = child.getAttributes();
				if (attr == null) continue;
				var cn = attr.getNamedItem("name");
				var cv = attr.getNamedItem("value");
				if (cn == null || cv == null) continue;
				var cname = cn.getNodeValue();
				var cval = cv.getNodeValue();
				if (cname == "type") entryType = cval;
				else if (cname == "id") entryId = parseInt(cval);
			}
			if (entryType == "m" && entryId == mobId) {
				count++;
			}
		}
		return count;
	} catch (e) {
		return 0;
	}
}

// ===========================
// 扫描所有 Map.wz XML 文件，查找指定 life 出现的地图
// ===========================
var MAP_DIRS = ["Map0", "Map1", "Map2", "Map3", "Map5", "Map6", "Map7", "Map8", "Map9"];

function scanMapsForLife(lifeId, lifeType) {
	var results = [];
	var searchStr = 'value="' + lifeId + '"';
	for (var d = 0; d < MAP_DIRS.length; d++) {
		var dir = new java.io.File("wz/Map.wz/Map/" + MAP_DIRS[d]);
		if (!dir.exists()) continue;
		var files = dir.listFiles();
		if (files == null) continue;
		for (var f = 0; f < files.length; f++) {
			var file = files[f];
			if (!file.getName().endsWith(".img.xml")) continue;
			try {
				var scanner = new java.util.Scanner(file);
				var found = scanner.findWithinHorizon(searchStr, 0);
				scanner.close();
				if (found == null) continue;
				var count = countLifeInMapFile(file, lifeId, lifeType);
				if (count > 0) {
					var mapId = parseInt(file.getName().replace(".img.xml", ""));
					if (!isNaN(mapId)) results.push({mapId: mapId, count: count});
				}
			} catch (e) {}
		}
	}
	return results;
}

function countLifeInMapFile(file, lifeId, lifeType) {
	var dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance();
	var builder = dbf.newDocumentBuilder();
	var doc = builder.parse(file);
	var count = 0;
	var lifeList = doc.getElementsByTagName("imgdir");
	for (var i = 0; i < lifeList.getLength(); i++) {
		var node = lifeList.item(i);
		var parentAttr = node.getParentNode().getAttributes();
		if (parentAttr == null) continue;
		var nameAttr = parentAttr.getNamedItem("name");
		if (nameAttr == null || nameAttr.getNodeValue() != "life") continue;
		var childNodes = node.getChildNodes();
		var entryType = null;
		var entryId = 0;
		for (var j = 0; j < childNodes.getLength(); j++) {
			var child = childNodes.item(j);
			if (child.getNodeType() != 1) continue;
			var attr = child.getAttributes();
			if (attr == null) continue;
			var cn = attr.getNamedItem("name");
			var cv = attr.getNamedItem("value");
			if (cn == null || cv == null) continue;
			if (cn.getNodeValue() == "type") entryType = cv.getNodeValue();
			else if (cn.getNodeValue() == "id") entryId = parseInt(cv.getNodeValue());
		}
		if (entryType == lifeType && entryId == lifeId) count++;
	}
	return count;
}

function getMobImage(mob) {
	var def = "#fUI/UIWindow.img/Maker/randomRecipe#  (怪物缺少图片，无法展示)\r\n";
	if (mobCardId != null)
		def = "#fItem/Consume/0238/0" + mobCardId + "/info/iconRaw#";
	var type = [null, 'stand', 'fly'];
	type = type[mob.getStats().getMovetype() + 1];
	if (type == null)
		return def;
	var mp = DataProviderFactory.getDataProvider(WZFiles.MOB);
	var mobImg = mp.getData(mob.getId().toString().padStart(7, '0') + ".img");
	if (mobImg == null)
		return def;
	if (mobImg.getChildByPath(type) == null)
		return def;
	if (mob.getStats().getImgwidth() > 160 && mob.getStats().getImgheight() > 250) {
		if (mobCardId != null)
			return "#fItem/Consume/0238/0" + mobCardId + "/info/iconRaw#  (形象过大，无法展示)\r\n";
		else
			return "#fMob/1210102.img/stand/0#  (形象过大，无法展示)";
	} else if (mob.getStats().getImgwidth() < 5 && mob.getStats().getImgheight() < 5) {
		return def;
	} else {
		return "#fMob/" + mob.getId().toString().padStart(7, '0') + ".img/" + type + "/0#";
	}
}
