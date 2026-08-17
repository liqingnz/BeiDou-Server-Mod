/**
 * @description 任务手册, 搜索任务并查看关联NPC，NPC详情同NPC手册
 * @author hzh
 * @fixed 非GM权限控制：跳转地图功能仅对GM开放
 */

var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var StringBuilder = Java.type('java.lang.StringBuilder');
var Quest = Java.type('org.gms.server.quest.Quest');

var questProvider = DataProviderFactory.getDataProvider(WZFiles.QUEST);
var stringProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);

var sb;
var inputText;
var currentQuestId;
var currentNpcId;
var searchedById = false;

function start() {
    cm.getInputTextLevel("SearchQuestData", "请输入任务名称关键字或任务ID:");
}

function levelSearchQuestData() {
    inputText = (inputText == null ? cm.getText() : inputText);
    if (inputText.trim() == "") {
        inputText = null;
        cm.getInputTextLevel("SearchQuestData", "请输入任务名称关键字或任务ID:");
        return;
    }

    // 纯数字按任务ID精确查询
    var searchValue = inputText.trim();
    if (/^\d+$/.test(searchValue)) {
        var inputQuestId = parseInt(searchValue);
        var questName = getQuestName(inputQuestId);
        if (questName != "未知任务") {
            searchedById = true;
            levelQuestDetail(inputQuestId);
            return;
        }
        inputText = null;
        cm.getInputTextLevel("SearchQuestData", "#r未检测到任务ID " + inputQuestId + "，请重新输入:");
        return;
    }
    searchedById = false;

    if (sb == null) sb = new StringBuilder(4096);
    sb.append("#r请选择任务以查看详情.#n\r\n\r\n#n");
    var zero = true;

    // 搜索 QuestInfo.img
    var infoData = questProvider.getData("QuestInfo.img");
    if (infoData != null) {
        var children = infoData.getChildren();
        for (var i = 0; i < children.size(); i++) {
            var questNode = children.get(i);
            var qid = parseInt(questNode.getName());
            if (isNaN(qid)) continue;
            var qname = DataTool.getString(questNode.getChildByPath("name"), null);
            if (qname == null) continue;
            if (qname.toLowerCase().indexOf(inputText.toLowerCase()) >= 0) {
                zero = false;
                sb.append("#L").append(qid).append("##b").append(qid).append("#k - #r").append(qname).append("#l\r\n");
            }
        }
    }

    if (zero) {
        inputText = null;
        cm.getInputTextLevel("SearchQuestData", "#r未检测到任务, 请重新输入关键字:");
    } else {
        cm.sendNextSelectLevel("QuestDetail", sb.toString(), 2);
    }
    sb = null;
}

// ========== 任务详情 ==========
function levelQuestDetail(qid) {
    currentQuestId = qid;
    var quest = Quest.getInstance(qid);

    var qname = getQuestName(qid);
    sb = new StringBuilder(4096);
    sb.append("#e#d=== 任务详情 ===#k#n\r\n\r\n");
    sb.append("任务: #b").append(qid).append("#k - #r").append(qname).append("#k\r\n\r\n");

    // 起始NPC
    var startNpc = 0;
    var endNpc = 0;
    if (quest != null) {
        startNpc = quest.getNpcRequirement(false);
        endNpc = quest.getNpcRequirement(true);
    }

    if (startNpc > 0) {
        var npcName = getNpcName(startNpc);
        sb.append("#e#d[起始NPC]#k#n\r\n");
        sb.append("  #L").append(100000000 + startNpc).append("##b").append(startNpc).append("#k - #r").append(npcName).append("#l\r\n\r\n");
    } else {
        sb.append("#e#d[起始NPC]#k#n\r\n  无\r\n\r\n");
    }

    if (endNpc > 0) {
        var npcName = getNpcName(endNpc);
        sb.append("#e#d[完成NPC]#k#n\r\n");
        sb.append("  #L").append(100000000 + endNpc).append("##b").append(endNpc).append("#k - #r").append(npcName).append("#l\r\n\r\n");
    } else {
        sb.append("#e#d[完成NPC]#k#n\r\n  无\r\n\r\n");
    }

    var questStatus = cm.getQuestStatus(qid);
    sb.append("#e#d[任务管理]#k#n 当前状态: ");
    if (questStatus == 0) {
        sb.append("#r未开始#k\r\n");
    } else if (questStatus == 1) {
        sb.append("#b进行中#k\r\n");
    } else if (questStatus == 2) {
        sb.append("#g已完成#k\r\n");
    } else {
        sb.append("#r未知(").append(questStatus).append(")#k\r\n");
    }
    if (cm.getPlayer().isGM()) { //仅对GM开放
    sb.append("#L99999994##b开始任务#k#l  ");
    sb.append("#L99999995##g完成任务#k#l  ");
    sb.append("#L99999996##r重置任务#k#l\r\n\r\n");
    }
    sb.append("#e#r#L0#返回列表#l\r\n");
    cm.sendNextSelectLevel("Process", sb.toString(), 2);
    sb = null;
}

// ========== 分发 ==========
function levelProcess(action) {
    if (action == 0) {
        if (searchedById) {
            searchedById = false;
            inputText = null;
            cm.getInputTextLevel("SearchQuestData", "请输入任务名称关键字或任务ID:");
            return;
        }
        levelSearchQuestData();
        return;
    }
    if (action == 99999994) {
        if (cm.getQuestStatus(currentQuestId) != 0) {
            cm.sendOkLevel("QuestDetailRefresh", "该任务当前不是未开始状态，无法开始。");
            return;
        }
        var startQuest = Quest.getInstance(currentQuestId);
        if (startQuest == null) {
            cm.sendOkLevel("QuestDetailRefresh", "任务数据不存在，无法开始。");
            return;
        }
        var startNpcId = startQuest.getNpcRequirement(false);
        var started = cm.forceStartQuest(currentQuestId, startNpcId > 0 ? startNpcId : 9010000);
        cm.sendOkLevel("QuestDetailRefresh", started ? "任务已开始。" : "开始任务失败。");
        return;
    }
    if (action == 99999995) {
        if (cm.getQuestStatus(currentQuestId) != 1) {
            cm.sendOkLevel("QuestDetailRefresh", "该任务当前不是进行中状态，无法完成。");
            return;
        }
        var completeQuest = Quest.getInstance(currentQuestId);
        if (completeQuest == null) {
            cm.sendOkLevel("QuestDetailRefresh", "任务数据不存在，无法完成。");
            return;
        }
        var completeNpcId = completeQuest.getNpcRequirement(true);
        var completed = cm.forceCompleteQuest(currentQuestId, completeNpcId > 0 ? completeNpcId : 9010000);
        cm.sendOkLevel("QuestDetailRefresh", completed ? "任务已完成（仅修改任务状态，不发放任务奖励）。" : "完成任务失败。");
        return;
    }
    if (action == 99999996) {
        if (cm.getQuestStatus(currentQuestId) == 0) {
            cm.sendOkLevel("QuestDetailRefresh", "该任务已经是未开始状态，无需重置。");
            return;
        }
        var resetQuest = Quest.getInstance(currentQuestId);
        if (resetQuest == null) {
            cm.sendOkLevel("QuestDetailRefresh", "任务数据不存在，无法重置。");
            return;
        }
        resetQuest.reset(cm.getPlayer());
        cm.sendOkLevel("QuestDetailRefresh", "任务已重置为未开始状态，任务进度已清除。");
        return;
    }
    if (action >= 100000000) {
        currentNpcId = action - 100000000;
        showNpcDetail();
        return;
    }
}

function levelQuestDetailRefresh() {
    levelQuestDetail(currentQuestId);
}

// ========== NPC详情（同NPC手册） ==========
function showNpcDetail() {
    var npcId = currentNpcId;
    var npcName = getNpcName(npcId);

    var msgText = "#e#d=== NPC信息 ===#k#n\r\n\r\n";
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
    end = "\r\n#e#g#L99999999#原地召唤NPC#l\r\n";
    }    
    end += "#e#r#L0#返回任务详情#l\r\n";
    cm.sendNextSelectLevel("NpcDetailAction", (msgText + mapText + end), 2);
}

function levelNpcDetailAction(action) {
    if (action == 0) {
        levelQuestDetail(currentQuestId);
        return;
    }
    if (action == 99999999) {
        cm.spawnNpc(currentNpcId, cm.getPlayer().getPosition(), cm.getMap());
        cm.dispose();
        return;
    }
    // 非GM权限校验 —— 跳转地图功能仅对GM开放
    if (!cm.getPlayer().isGM()) {
        cm.sendNextSelectLevel("GMNotAllow", "  跳转地图功能#r仅对GM开放#n\r\n\r\n#e#r#L0#返回#l\r\n", 2);
        return;
    }
    var mapId = action;
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
        showNpcDetail();
    }
}

// ========== 获取NPC出没地图 ==========
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
    cm.dropMessage(0, "NpcLocation无数据，正在扫描地图文件...");
    return scanMapsForLife(npcId, "n");
}

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
// Map.wz XML 扫描
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

// ========== 辅助 ==========
function getQuestName(qid) {
    try {
        var infoData = questProvider.getData("QuestInfo.img");
        var questNode = infoData.getChildByPath(String(qid));
        if (questNode == null) return "未知任务";
        return DataTool.getString(questNode.getChildByPath("name"), "未知任务");
    } catch (e) { return "未知任务"; }
}

function getNpcName(npcId) {
    try {
        var node = stringProvider.getData("Npc.img").getChildByPath(String(npcId));
        if (node == null) return "未知NPC";
        return DataTool.getString(node.getChildByPath("name"), "未知NPC");
    } catch (e) { return "未知NPC"; }
}
