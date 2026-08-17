/**
 * @description 查询NPC信息, 可传送到NPC位置
 * @author hzh
 * @fixed 非GM权限控制：传送功能仅对GM开放，非GM点击提示并返回
 */
var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);
var sb, text, inputText;
var currentNpcId;

function start() {
	text = "请输入NPC名称:";
	cm.getInputTextLevel("SearchNpcData", text);
}

function levelSearchNpcData() {
    inputText = (inputText == null ? cm.getText() : inputText);
	if (inputText.trim() == "") {
		cm.getInputTextLevel("SearchNpcData", text);
		return;
	}
	sb = new StringBuilder(4096);
	sb.append("#r请选择NPC以查看信息.#n\r\n\r\n#n");
	var zero = true;
	var npcData = dataProvider.getData("Npc.img");
	var npcs = npcData.getChildren();
	npcs.forEach(function(npc) {
		var id = npc.getName();
		var name = DataTool.getString(npc.getChildByPath("name"), "NO-NAME");
		var func = DataTool.getString(npc.getChildByPath("func"), "");
		if (name.includes(inputText.toLowerCase()) || func.includes(inputText.toLowerCase())) {
			zero = false;
			sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(name).append(func == "" ? "" : " - " + func).append("\r\n");
		}
	});
	if (zero) {
		inputText = null;
		cm.getInputTextLevel("SearchNpcData", "#r未检测到NPC, 请重新输入NPC名称:");
	} else
		cm.sendNextSelectLevel("Perform", sb.toString());
	sb = null;
}

function levelPerform(npcId) {
    currentNpcId = npcId;
    var npcMsg = "\r\n#e#d=== NPC信息 ===#k#n\r\n\r\n";
	npcMsg += `\t${getNpcImage(npcId)}\r\n`;
    npcMsg += "\tID: #b" + npcId + "#k\t名称: #r#p" + npcId + "##k\r\n";

    npcMsg += "\r\n#e#d=== 出没地区(点击传送到NPC位置) ===#k#n\r\n";
    var mapIds = getNpcMaps(npcId);
	if (mapIds.length > 0) {
		for (var i = 0; i < mapIds.length; i++) {
            var mId = mapIds[i];
            npcMsg += "#L" + mId + "##b" + mId + "#k - #r#m" + mId + "##l\r\n";
        }
    } else 
        npcMsg += "\r\n\t\t#e#r无法获取NPC的出没地区#k#n\r\n";
    var end = "\r\n#e#r#L0#返回#l\r\n";
    cm.sendNextSelectLevel("Process", (npcMsg + end), 2);
}

function levelProcess(mapId) {
    if (mapId == 0) {
        currentNpcId = null;
        levelSearchNpcData();
        return;
    }
    // 非GM权限校验 —— 菜单显示不变，点击后才提示
    if (!cm.getPlayer().isGM()) {
        cm.sendNextSelectLevel("GMNotAllow", "#e#d  该功能仅对GM开放#k#n\r\n\r\n#e#r#L0#返回#l\r\n", 2);
        return;
    }
	// 传送到NPC在地图上的位置, 读取内存中的数据
    var pos = cm.getMap(mapId).getNPCById(currentNpcId).getPosition();
	if (pos != null) 
		cm.getPlayer().changeMap(cm.getMap(mapId), pos);
    else 
		cm.getPlayer().changeMap(cm.getMap(mapId));
    cm.dispose();
}

// 处理非GM提示页的返回按钮
function levelGMNotAllow(id) {
    if (id == 0) {
        levelPerform(currentNpcId);
    }
}
// 获取NPC出没地图（查NpcLocation）
function getNpcMaps(npcId) {
	var maps = [];
    var npcLocNode = etcProvider.getData("NpcLocation.img").getChildByPath(String(npcId));
    if (npcLocNode != null && !npcLocNode.getChildren().isEmpty()) {
        var children = npcLocNode.getChildren();
        for (var i = 0; i < children.size(); i++) {
            var mapId = children.get(i).getData();
            if (mapId > 0) maps.push(mapId);
        }
    }
    return maps;
}
// 获取NPC图片
function getNpcImage(npcId) {
	var imageData, def = `#fUI/UIWindow.img/Maker/randomRecipe#  (NPC图片异常)\r\n`;
	var ndp = DataProviderFactory.getDataProvider(WZFiles.NPC);
	var npcImg = ndp.getData(`${String(npcId).padStart(7, '0')}.img`);
	if (npcImg != null && ((imageData = npcImg.getChildByPath("stand/0")) != null)) {
		var width = DataTool.getAttributeValueInt(imageData, "width", 0);
		var high = DataTool.getAttributeValueInt(imageData, "high", 0);
		if(width <= 6 || width > 100 || high > 100)
			return def;
		return `#fNpc/${String(npcId).padStart(7, '0')}.img/stand/0#`;
	}
	return def;
}
