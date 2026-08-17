/**
注意：仅“scripts-zh-CN\BeiDouSpecial\手册导航”目录下的本文件生效，外面的本文件不生效
 * @description 怪物手册, 查询怪物掉落以及出现的地图
 * @author hzh
 * @modified 新增GM权限校验：非GM菜单显示不变，点击功能时提示"仅对GM开放"并可返回
 * @fixed 修复搜索阶段LifeFactory.getMonster触发SEVERE报错：搜索和详情页都先检查怪物数据是否存在
 */
 
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var MonsterInformationProvider = Java.type('org.gms.server.life.MonsterInformationProvider');
var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var LifeFactory = Java.type('org.gms.server.life.LifeFactory');
var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);
var mobProvider = DataProviderFactory.getDataProvider(WZFiles.MOB);
var iip = ItemInformationProvider.getInstance();
var mip = MonsterInformationProvider.getInstance();

var msgText, dropText, mapText;
var mobCardId;
var sb, inputText;
var equipDrop = [], useDrop = [], etcDrop = [];
var currentMobId;	// 保存当前查看的怪物ID，用于非GM提示页返回

// 辅助：怪物ID补零为7位
function padMobId(mobId) {
	var s = "" + mobId;
	while (s.length < 7) s = "0" + s;
	return s;
}

// 辅助：检查 Mob.wz 中怪物数据是否完整（info/level节点存在才认为有效）
function mobExists(mobId) {
	var mobImg = mobProvider.getData(padMobId(mobId) + ".img");
	if (mobImg == null) return false;
	if (mobImg.getChildByPath("info") == null) return false;
	if (mobImg.getChildByPath("info/level") == null) return false;
	return true;
}

function start() {
	cm.getInputTextLevel("SearchMobData", "请输入怪物名称");
}

function levelSearchMobData() {
	inputText = (inputText == null ? cm.getText() : inputText);
	if (inputText.trim() == "") {
		inputText = null;
		cm.getInputTextLevel("SearchMobData", "请输入怪物名称");
		return;
	}
	if (sb == null)
		sb = new StringBuilder(4096);
	sb.append("#d当前检索内容: #r[ " + inputText + " ]#d, 请选择怪物以查看信息.#n\r\n\r\n#n");
	var zero = true, monster;
	var mobData = dataProvider.getData("Mob.img");
	mobData.getChildren().forEach(function(mob) {
		var id = parseInt(mob.getName()), ms;
		var mobName = DataTool.getString(mob.getChildByPath("name"), "NO-NAME");
		if (mobName.includes(inputText.toLowerCase())) {
			// 修复：搜索阶段先检查怪物数据是否存在，不存在就不调用LifeFactory.getMonster，避免SEVERE报错
			if (mobExists(id)) {
				zero = false;
				if ((monster = LifeFactory.getMonster(id)) != null) ms = monster.getStats();
				sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(mobName).append(ms == null ? "" : ` - Lv.${ms.getLevel()}`).append("\r\n");
			}
		}
	});
	if (zero) {
		inputText = null;
		cm.getInputTextLevel("SearchMobData", "#r未检测到怪物, 请重新输入怪物名称:");
	} else
		cm.sendNextSelectLevel("Perform", sb.toString(), 2);
	sb = null;
}

function levelPerform(mobId) {
	currentMobId = mobId;
	
	// 修复：详情页也先检查，不通过直接返回，不调用LifeFactory
	if (!mobExists(mobId)) {
		sb = new StringBuilder(4096);
		sb.append("#r该怪物数据不存在.#n\r\n\r\n#n");
		levelSearchMobData();
		return;
	}
	
	var mob = LifeFactory.getMonster(mobId);
	if (mob == null) {
		sb = new StringBuilder(4096);
		sb.append("#r由于数据原因, 刚刚选择的怪物不存在.#n\r\n\r\n#n");
		levelSearchMobData();
		return;
	}
	// 怪物掉落数据
	dropText = "\r\n#e#d===战利品(点击可获取物品,仅限GM)===#k#n\r\n";
	var dropDatas = mip.retrieveDrop(mobId);
	if (dropDatas.size() == 0)
		dropText += "\r\n\t\t#e#r掉落信息缺失 或 无任何掉落#k#n\r\n";

	dropDatas.forEach((d) => {
		var itemId = d.itemId;
		if (itemId <= 0) return;
		var it = iip.getEquipById(itemId).getInventoryType().name();
		if (it == "EQUIP")
			equipDrop.push(itemId);
		else if (it == "USE")
			useDrop.push(itemId);
		else if (it == "ETC")
			etcDrop.push(itemId);
	});
	printData(etcDrop, "#e其他物品#k#n", 6, false);
	printData(equipDrop, "#e装备物品#k#n", 6, false);
	printData(useDrop, "#e消耗物品#k#n", -1, false);
	// 怪物地图数据
	mapText = "\r\n#e#d===出没地区(点击可跳转,仅限GM)===#k#n\r\n";
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
	
	// 怪物基本数据
	var stats = mob.getStats();
	msgText = `${getMobImage(mob)} \t #eLv.#n${stats.getLevel()}\r\n`;
	msgText += `[ #e#d${mob.getName()}#n ${mob.isBoss() ? "#r#eBOSS怪物#n#k" : "#d普通怪物#n#k"} ]  #e#rHP：${numFormat(mob.getMaxHp())}  #e#bMP：${numFormat(mob.getMaxMp())}\r\n#k#n`;
    msgText += `物攻:${stats.getPADamage().toString()}\t物防:${stats.getPDDamage()}\t`;
    msgText += `魔攻:${stats.getMADamage().toString()}\t魔防:${stats.getMDDamage()}\r\n`;
		
	equipDrop = [];
	useDrop = [];
	etcDrop = [];
	var end = "#e#r#L0#返回#l\r\n";
	cm.sendNextSelectLevel("Process", (msgText + mapText + dropText+ end), 2);
}

function levelProcess(id) {
	if (id == 0) {
		mobCardId = null;
		levelSearchMobData();
		return;
	}
	// 非GM权限校验 —— 菜单显示不变，点击后才提示
	if (!cm.getPlayer().isGM()) {
		cm.sendNextSelectLevel("GMNotAllow", "  点击获取物品 / 跳转地图功能#r仅对GM开放#n\r\n\r\n#e#r#L0#返回#l\r\n", 2);
		return;
	}
	if(id < 0) {
		cm.getPlayer().changeMap(-id);
	} else {
		var p = cm.getPlayer();
		var item = iip.getEquipById(id);
		p.getMap().spawnItemDrop(p, p, item, p.getPosition(), false, false);
	}
	cm.dispose();
}

// 处理非GM提示页的返回按钮，回到刚才的怪物详情页
function levelGMNotAllow(id) {
	if (id == 0) {
		levelPerform(currentMobId);
	}
}

function printData(drop, desc, rn, printName) {
	if (drop.length <= 0) return;
	if (desc != null)
		dropText += `\r\n${desc}: \r\n`;
	if (rn == -1) {
		var useDropBooK = [], useDropOther = [];
		for (var i = 0; i < drop.length; i++) {
			var itemName = iip.getName(drop[i]).toString();
			if (itemName.indexOf("卷轴") > 0 || itemName.indexOf("技能册") > 0 || itemName.indexOf("能手册") > 0)
				useDropBooK.push(drop[i]);
			else
				useDropOther.push(drop[i]);
			if (itemName.indexOf("卡片") > 0)
				mobCardId = drop[i];
		}
		printData(useDropOther, null, 6, false);
		printData(useDropBooK, null, 1, true);
	} else {
		for (var i = 0; i < drop.length; i++) {
			if (printName)
				dropText += `#L${drop[i]}##v${drop[i]}:# #d#z${drop[i]}##l`;
			else 
				dropText += `#L${drop[i]}##v${drop[i]}:##l`;
			if ((i + 1) % rn == 0)
				dropText += "\r\n";
		}
	}
	dropText += "\r\n";
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

function numFormat(num) {
	return num >= 100000000 ? (num/100000000.00 + "亿") : (num >= 10000 ? (num/10000.00 + "万") : num)
}
function getMobImage(mob) {
	var def = `#fUI/UIWindow.img/Maker/randomRecipe#  (怪物缺少图片，无法展示)`;
	if (mobCardId != null)
		def = `#fItem/Consume/0238/0${mobCardId}/info/iconRaw#`;
	var type = [null, "stand", "fly"];
        type = type[mob.getStats().getMovetype() + 1];    //-1=未知类型，0=陆地类型，1=飞天类型
	if(type == null) 
		return def;
	var mobImg = mobProvider.getData(padMobId(mob.getId()) + ".img");
	if (mobImg == null || mobImg.getChildByPath(type) == null)
		return def;
	if (mob.getStats().getImgwidth() > 311 || mob.getStats().getImgheight() > 311) {
        if (mobCardId != null)
			return `${def}  (形象过大，无法展示)`;
		else 
			return `#fMob/1210102.img/stand/0#  (形象过大，无法展示)`;
    } else if (mob.getStats().getImgwidth() <= 6 && mob.getStats().getImgheight() <= 6) {
		return def;
	} else {
        return `#fMob/${padMobId(mob.getId())}.img/${type}/0#`;
    }
}