/**
 * @description NPC手册_1, 查询NPC出现的地图并传送到NPC位置。
 * @与"NPC手册.js"脚本相比，不显示NPC图片，仅能搜索name(不能搜索func)，但有召唤NPC功能
 * @author hzh
 * @fixed 非GM权限控制：原地召唤和传送功能仅对GM开放，非GM点击提示并返回
 */

var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var StringBuilder = Java.type('java.lang.StringBuilder');

var stringProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);

var sb;
var inputText;
var currentNpcId;

function start() {
    cm.getInputTextLevel("SearchNpcData", "请输入NPC名称:");
}

function levelSearchNpcData() {
    inputText = (inputText == null ? cm.getText() : inputText);
    if (inputText.trim() == "") {
        inputText = null;
        cm.getInputTextLevel("SearchNpcData", "请输入NPC名称:");
        return;
    }
    if (sb == null) sb = new StringBuilder(4096);
    sb.append("#r请选择NPC以查看信息.#n\r\n\r\n#n");
    var zero = true;
    var npcData = stringProvider.getData("Npc.img");
    npcData.getChildren().forEach(function(npc) {
        var id = parseInt(npc.getName());
        var npcName = DataTool.getString(npc.getChildByPath("name"), "NO-NAME");
        if (npcName.toLowerCase().includes(inputText.toLowerCase())) {
            zero = false;
            sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(npcName).append("\r\n");
        }
    });
    if (zero) {
        inputText = null;
        cm.getInputTextLevel("SearchNpcData", "#r未检测到NPC, 请重新输入NPC名称:");
    } else {
        cm.sendNextSelectLevel("Perform", sb.toString(), 2);
    }
    sb = null;
}

function levelPerform(npcId) {
    currentNpcId = npcId;
    var npcName = getNpcName(npcId);

    var msgText = "\r\n#e#d=== NPC信息 ===#k#n\r\n";
    msgText += "ID: #b" + npcId + "#k\t名称: #r" + npcName + "#k\r\n";

    var mapText = "\r\n#e#d=== 出没地区(点击传送到NPC位置,仅限GM) ===#k#n\r\n";
    var mapList = getNpcMaps(npcId);
    if (mapList.length == 0) {
        mapText += "\r\n\t\t#e#r无法获取NPC的出没地区#k#n\r\n";
    } else {
        for (var i = 0; i < mapList.length; i++) {
            var m = mapList[i];
            var countStr = m.count > 0 ? " ×" + m.count : "";
            mapText += "#L" + m.mapId + "##b" + m.mapId + "#k - #r#m" + m.mapId + "#" + countStr + "#l\r\n";
        }
    }

    var end = "";
    if (cm.getPlayer().isGM()) {
    end += "\r\n#e#g#L99999999#原地召唤NPC#l\r\n";
    }
    end += "#e#r#L0#返回#l\r\n";
    cm.sendNextSelectLevel("Process", (msgText + mapText + end), 2);
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
    if (mapId == 99999999) {
        cm.spawnNpc(currentNpcId, cm.getPlayer().getPosition(), cm.getMap());
        cm.dispose();
        return;
    }
    // 传送到NPC在地图上的位置
    var pos = getNpcPositionInMap(currentNpcId, mapId);
    var mapObj = cm.getWarpMap(mapId);
    if (mapObj != null) {
        if (pos != null) {
            cm.getPlayer().changeMap(mapObj, pos);
        } else {
            cm.getPlayer().changeMap(mapObj);
        }
    }
    cm.dispose();
}

// 处理非GM提示页的返回按钮
function levelGMNotAllow(id) {
    if (id == 0) {
        levelPerform(currentNpcId);
    }
}

// ========== 获取NPC出没地图（先查NpcLocation，查不到则扫描Map.wz） ==========
function getNpcMaps(npcId) {
    var npcLocNode = etcProvider.getData("NpcLocation.img").getChildByPath(String(npcId));
    if (npcLocNode != null && !npcLocNode.getChildren().isEmpty()) {
        var maps = [];
        var children = npcLocNode.getChildren();
        for (var i = 0; i < children.size(); i++) {
            var mapId = children.get(i).getData();
            if (mapId > 0) maps.push({mapId: mapId, count: 0});
        }
        if (maps.length > 0) return maps;
    }
    if (cm.getPlayer().isGM()) {
    // NpcLocation 中无有效数据（不存在或全是-1），扫描Map.wz XML文件，但仅对GM开放
    cm.dropMessage(0, "NpcLocation无该NPC数据，正在扫描地图文件...");
    return scanMapsForLife(npcId, "n");
    } else {
    cm.dropMessage(0, "NpcLocation无该NPC数据");
    cm.dispose();
    }
}

// 从Map.wz的life数据中查找NPC在指定地图上的坐标
function getNpcPositionInMap(npcId, mapId) {
    try {
        var padded = String(mapId).padStart(9, '0');
        var filePath = "wz/Map.wz/Map/Map" + padded.charAt(0) + "/" + padded + ".img.xml";

        var file = new java.io.File(filePath);
        if (!file.exists()) return null;

        var dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        var builder = dbf.newDocumentBuilder();
        var doc = builder.parse(file);

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
            var entryX = 0;
            var entryY = 0;
            for (var j = 0; j < childNodes.getLength(); j++) {
                var child = childNodes.item(j);
                if (child.getNodeType() != 1) continue;
                var attr = child.getAttributes();
                if (attr == null) continue;
                var n = attr.getNamedItem("name");
                var v = attr.getNamedItem("value");
                if (n == null || v == null) continue;
                var cname = n.getNodeValue();
                var cval = v.getNodeValue();
                if (cname == "type") entryType = cval;
                else if (cname == "id") entryId = parseInt(cval);
                else if (cname == "x") entryX = parseInt(cval);
                else if (cname == "y") entryY = parseInt(cval);
            }
            if (entryType == "n" && entryId == npcId)
                return new java.awt.Point(entryX, entryY);
        }
    } catch (e) {}
    return null;
}

// ===========================
// 扫描所有 Map.wz XML 文件，查找指定 life (n=NPC/m=怪物) 出现的地图
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
                // 快速预扫: 文本搜索ID
                var scanner = new java.util.Scanner(file);
                var found = scanner.findWithinHorizon(searchStr, 0);
                scanner.close();
                if (found == null) continue;
                // 确认: DOM解析验证
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

function getNpcName(npcId) {
    try {
        var node = stringProvider.getData("Npc.img").getChildByPath(String(npcId));
        if (node == null) return "未知NPC";
        return DataTool.getString(node.getChildByPath("name"), "未知NPC");
    } catch (e) { return "未知NPC"; }
}