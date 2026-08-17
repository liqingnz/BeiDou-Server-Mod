/**
 * @description 任务追踪, 查看进行中的任务详情, 关联NPC/道具/怪物可点击详情
 *               需求道具支持一键获得, 怪物击杀支持一键满进度
 * @author hzh
 */

var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var StringBuilder = Java.type('java.lang.StringBuilder');
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var MonsterInformationProvider = Java.type('org.gms.server.life.MonsterInformationProvider');
var LifeFactory = Java.type('org.gms.server.life.LifeFactory');
var Quest = Java.type('org.gms.server.quest.Quest');

var questProvider = DataProviderFactory.getDataProvider(WZFiles.QUEST);
var stringProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var etcProvider = DataProviderFactory.getDataProvider(WZFiles.ETC);
var iip = ItemInformationProvider.getInstance();
var mip = MonsterInformationProvider.getInstance();

var currentQuestId;
var currentDetailId;
var pendingQuestItems;
var pendingQuestMobs;
var mobCardId;
var sb;

function encodeNpc(npcId)   { return 100000000 + npcId; }
function encodeItem(itemId) { return 200000000 + itemId; }
function encodeMob(mobId)   { return 300000000 + mobId; }

function start() {
    var started = cm.getPlayer().getStartedQuests();
    if (started == null || started.isEmpty()) {
        cm.sendOk("当前没有进行中的任务。");
        cm.dispose();
        return;
    }
    sb = new StringBuilder(4096);
    sb.append("#e#d===== 进行中的任务 =====#k#n\r\n\r\n");
    var it = started.iterator();
    while (it.hasNext()) {
        var qs = it.next();
        var qid = qs.getQuestID();
        var qname = getQuestName(qid);
        if (qname == null) continue;
        sb.append("#L").append(qid).append("##b").append(qid).append("#k - #r").append(qname).append("#l\r\n");
    }
    cm.sendNextSelectLevel("QuestDetail", sb.toString(), 2);
    sb = null;
}

function levelQuestDetail(qid) {
    currentQuestId = qid;
    var quest = Quest.getInstance(qid);
    if (quest == null) {
        cm.sendOkLevel("SearchQuestData", "任务数据不存在。");
        return;
    }

    var qname = getQuestName(qid);
    sb = new StringBuilder(4096);
    sb.append("#e#d=== 任务详情 ===#k#n\r\n\r\n");
    sb.append("任务: #b").append(qid).append("#k - #r").append(qname).append("#k\r\n\r\n");

    var startNpc = quest.getNpcRequirement(false);
    if (startNpc > 0) {
        var npcName = getNpcName(startNpc);
        sb.append("#e#d[起始NPC]#k#n\r\n");
        sb.append("  #L").append(encodeNpc(startNpc)).append("##b").append(startNpc).append("#k - #r").append(npcName).append("#l\r\n\r\n");
    }

    pendingQuestItems = [];
    pendingQuestMobs = [];
    var checkData = questProvider.getData("Check.img");
    var questCheck = checkData.getChildByPath(String(qid));
    if (questCheck != null) {
        for (var stage = 0; stage <= 1; stage++) {
            var stageNode = questCheck.getChildByPath(String(stage));
            if (stageNode == null) continue;
            var itemNode = stageNode.getChildByPath("item");
            if (itemNode == null) continue;
            var itemChildren = itemNode.getChildren();
            if (itemChildren.isEmpty()) continue;
            var label = (stage == 0) ? "[需求道具]" : "[获得道具]";
            sb.append("#e#d").append(label).append("#k#n\r\n");
            for (var j = 0; j < itemChildren.size(); j++) {
                var entry = itemChildren.get(j);
                var itemId = DataTool.getInt(entry.getChildByPath("id"), 0);
                var count = DataTool.getInt(entry.getChildByPath("count"), 0);
                sb.append("  #L").append(encodeItem(itemId)).append("##v").append(itemId).append(":# #z").append(itemId).append("# x").append(count).append("#l\r\n");
                pendingQuestItems.push({itemId: itemId, count: count, stage: stage});
            }
            sb.append("\r\n");
        }

        var endNode = questCheck.getChildByPath("1");
        if (endNode != null) {
            var mobNode = endNode.getChildByPath("mob");
            if (mobNode != null && !mobNode.getChildren().isEmpty()) {
                sb.append("#e#d[需求怪物]#k#n\r\n");
                var mobChildren = mobNode.getChildren();
                for (var j = 0; j < mobChildren.size(); j++) {
                    var entry = mobChildren.get(j);
                    var mobId = DataTool.getInt(entry.getChildByPath("id"), 0);
                    var count = DataTool.getInt(entry.getChildByPath("count"), 0);
                    var mobName = getMobName(mobId);
                    sb.append("  #L").append(encodeMob(mobId)).append("##b").append(mobId).append("#k - #r").append(mobName).append("#k x").append(count).append("#l\r\n");
                    pendingQuestMobs.push({mobId: mobId, count: count});
                }
                sb.append("\r\n");
            }
        }

        if (cm.getPlayer().isGM()) {
            if (pendingQuestItems.length > 0) {
                sb.append("#e#g#L99999997#直接获得全部需求道具#l\r\n");
            }
            sb.append("#e#g#L99999998#满进度/直接完成#l\r\n");
        }
        sb.append("\r\n");
    }

    var endNpc = quest.getNpcRequirement(true);
    if (endNpc > 0) {
        var npcName = getNpcName(endNpc);
        sb.append("#e#d[完成NPC]#k#n\r\n");
        sb.append("  #L").append(encodeNpc(endNpc)).append("##b").append(endNpc).append("#k - #r").append(npcName).append("#l\r\n\r\n");
    }

    var questStatus = cm.getQuestStatus(qid);
    if (cm.getPlayer().isGM()) {
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
        sb.append("#L99999994##b开始任务#k#l  ");
        sb.append("#L99999995##g完成任务#k#l  ");
        sb.append("#L99999996##r重置任务#k#l\r\n\r\n");
    }

    sb.append("#e#r#L0#返回#l\r\n");
    cm.sendNextSelectLevel("Process", sb.toString(), 2);
    sb = null;
}

function levelProcess(action) {
    if (action == 0) {
        start();
        return;
    }
    if (action == 99999997) {
        var gained = 0;
        for (var i = 0; i < pendingQuestItems.length; i++) {
            var itm = pendingQuestItems[i];
            if (cm.canHold(itm.itemId, itm.count)) {
                cm.gainItem(itm.itemId, itm.count);
                gained++;
            } else {
                cm.dropMessage(1, "背包空间不足，无法获得 #z" + itm.itemId + "# x" + itm.count);
            }
        }
        cm.sendOkLevel("QuestDetailRefresh", "已获得 " + gained + "/" + pendingQuestItems.length + " 种需求道具！\r\n\r\n请返回查看任务进度。");
        return;
    }
    if (action == 99999994) {
        if (cm.getQuestStatus(currentQuestId) != 0) {
            cm.sendOkLevel("QuestDetailRefresh", "该任务当前不是未开始状态，无法开始。");
            return;
        }
        var startQuest = Quest.getInstance(currentQuestId);
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
        resetQuest.reset(cm.getPlayer());
        cm.sendOkLevel("QuestDetailRefresh", "任务已重置为未开始状态，任务进度已清除。");
        return;
    }
    if (action == 99999998) {
        if (pendingQuestMobs.length > 0) {
            var quest = Quest.getInstance(currentQuestId);
            var qs = cm.getPlayer().getQuest(quest);
            var filled = 0;
            for (var i = 0; i < pendingQuestMobs.length; i++) {
                var mob = pendingQuestMobs[i];
                qs.setProgress(mob.mobId, String(mob.count));
                filled++;
            }
            cm.getPlayer().updateQuestStatus(qs);
            cm.sendOkLevel("QuestDetailRefresh", "Filled " + filled + " mob kill progress entries.");
        } else {
            // No mob requirement: try info-number progress first, then generic progress, then completion.
            var q = Quest.getInstance(currentQuestId);
            var qs = cm.getPlayer().getQuest(q);
            var anyFilled = false;

            var startedStatus = Java.type("org.gms.client.QuestStatus$Status").STARTED;
            var startedInfoNum = 0;
            var startedExpVal = "";
            try { startedInfoNum = q.getInfoNumber(startedStatus); } catch (e) {}
            try { startedExpVal = q.getInfoEx(startedStatus, 0); } catch (e) {}
            if (startedInfoNum > 0 && startedExpVal != "") {
                cm.setQuestProgress(currentQuestId, startedInfoNum, startedExpVal);
                var startedNpc = q.getNpcRequirement(false);
                q.complete(cm.getPlayer(), startedNpc > 0 ? startedNpc : 0);
                var startedCheck = cm.getPlayer().getQuest(q);
                if (startedCheck != null && startedCheck.getStatus().toString() == "COMPLETED") {
                    cm.sendOkLevel("QuestDetailRefresh", "Progress filled and quest completed. Rewards claimed.");
                } else {
                    cm.sendOkLevel("QuestDetailRefresh", "Progress filled to " + startedExpVal + " (infoNumber=" + startedInfoNum + ").");
                }
                return;
            }

            // 1) 补齐需求道具(stage 0)
            for (var i = 0; i < pendingQuestItems.length; i++) {
                var itm = pendingQuestItems[i];
                if (itm.stage == 0) {
                    if (itm.count <= 0) {
                        continue;
                    }
                    if (cm.canHold(itm.itemId, itm.count)) {
                        cm.gainItem(itm.itemId, itm.count);
                        anyFilled = true;
                    } else {
                        cm.dropMessage(1, "背包空间不足，无法获得 #z" + itm.itemId + "# x" + itm.count);
                    }
                }
            }

            // 2) 遍历Check.img所有阶段的全部需求类型(mob/info/quest/等)，填满QuestStatus进度
            if (qs != null) {
                var ckData = questProvider.getData("Check.img");
                var ckQuest = ckData.getChildByPath(String(currentQuestId));
                if (ckQuest != null) {
                    for (var stage = 0; stage <= 1; stage++) {
                        var stageNode = ckQuest.getChildByPath(String(stage));
                        if (stageNode == null) continue;
                        var stageChildren = stageNode.getChildren();
                        for (var c = 0; c < stageChildren.size(); c++) {
                            var typeNode = stageChildren.get(c);
                            var typeName = typeNode.getName();
                            if (typeName == "item") continue;  // 道具已在上面处理
                            var reqChildren = typeNode.getChildren();
                            for (var r = 0; r < reqChildren.size(); r++) {
                                var req = reqChildren.get(r);
                                var reqId = DataTool.getInt(req.getChildByPath("id"), 0);
                                var reqCount = DataTool.getInt(req.getChildByPath("count"), 0);
                                if (reqId > 0 && reqCount > 0) {
                                    qs.setProgress(reqId, String(reqCount));
                                    anyFilled = true;
                                }
                            }
                        }
                    }
                }
                if (anyFilled) {
                    cm.getPlayer().updateQuestStatus(qs);
                }
            }

            // 3) 尝试完成任务
            var st = Java.type("org.gms.client.QuestStatus$Status").COMPLETED;
            var infoNum = 0;
            var expVal = "";
            try { infoNum = q.getInfoNumber(st); } catch (e) {}
            try { expVal = q.getInfoEx(st, 0); } catch (e) {}
            if (infoNum > 0 && expVal != "") {
                cm.setQuestProgress(currentQuestId, infoNum, expVal);
                cm.sendOkLevel("QuestDetailRefresh", "Progress filled to " + expVal + " (infoNumber=" + infoNum + ").");
            } else {
                var npc = q.getNpcRequirement(false);
                q.complete(cm.getPlayer(), npc > 0 ? npc : 0);
                // 校验是否真正完成
                var qsCheck = cm.getPlayer().getQuest(q);
                if (qsCheck != null && qsCheck.getStatus().toString() == "COMPLETED") {
                    cm.sendOkLevel("QuestDetailRefresh", "Quest completed and rewards claimed.");
                } else {
                    var medalId = -1;
                    try { medalId = q.getMedalRequirement(); } catch (e) {}
                    if (medalId > 0) {
                        if (!cm.haveItemWithId(medalId, true)) {
                            if (!cm.canHold(medalId, 1)) {
                                cm.sendOkLevel("QuestDetailRefresh", "Could not complete this medal quest. Please free one EQUIP slot.");
                                return;
                            }
                            cm.gainItem(medalId, 1);
                        }
                        q.forceComplete(cm.getPlayer(), npc > 0 ? npc : 0);
                        cm.sendOkLevel("QuestDetailRefresh", "Medal quest force-completed. Medal item: " + medalId + ".");
                    } else {
                        cm.sendOkLevel("QuestDetailRefresh", "Could not complete this quest. Some requirements may still be unmet.");
                    }
                }
            }
        }
        return;
    }
    if (action >= 300000000) {
        currentDetailId = action - 300000000;
        showMobDetail();
    } else if (action >= 200000000) {
        currentDetailId = action - 200000000;
        showItemDetail();
    } else if (action >= 100000000) {
        currentDetailId = action - 100000000;
        showNpcDetail();
    }
}

function levelQuestDetailRefresh() {
    levelQuestDetail(currentQuestId);
}

function showNpcDetail() {
    var npcId = currentDetailId;
    var npcName = getNpcName(npcId);
    var msgText = "#e#d=== NPC详情 ===#k#n\r\n\r\n";
    msgText += "ID: #b" + npcId + "#k\t名称: #r" + npcName + "#k\r\n\r\n";
    var mapText = "#e#d=== 出没地区(点击传送到NPC位置) ===#k#n\r\n";
    var mapList = getNpcMaps(npcId);
    if (mapList.length == 0) {
        mapText += "\t\t#e#r无法获取出没地区#k#n\r\n";
    } else {
        for (var i = 0; i < mapList.length; i++) {
            var mapId = mapList[i];
            mapText += "#L" + mapId + "##b" + mapId + "#k - #r#m" + mapId + "#l\r\n";
        }
    }
    var end = "";
    if (cm.getPlayer().isGM()) {
        end += "\r\n#e#g#L99999999#原地召唤NPC#l\r\n";
    }
    end += "#e#r#L0#返回任务详情#l\r\n";
    cm.sendNextSelectLevel("NpcDetailAction", (msgText + mapText + end), 2);
}

function levelNpcDetailAction(action) {
    if (action == 0) { levelQuestDetail(currentQuestId); return; }
    if (action == 99999999) { cm.spawnNpc(currentDetailId, cm.getPlayer().getPosition(), cm.getMap()); cm.dispose(); return; }
    var mapId = action;
    var pos = getNpcPositionInMap(currentDetailId, mapId);
    var mapObj = cm.getWarpMap(mapId);
    if (mapObj != null) {
        if (pos != null) { cm.getPlayer().changeMap(mapObj, pos); }
        else { cm.getPlayer().changeMap(mapObj); }
    }
    cm.dispose();
}

function getNpcPositionInMap(npcId, mapId) {
    try {
        var padded = String(mapId).padStart(9, "0");
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
            var entryType = null, entryId = 0, entryX = 0, entryY = 0;
            for (var j = 0; j < childNodes.getLength(); j++) {
                var child = childNodes.item(j);
                if (child.getNodeType() != 1) continue;
                var attr = child.getAttributes();
                if (attr == null) continue;
                var nameNode = attr.getNamedItem("name"), valueNode = attr.getNamedItem("value");
                if (nameNode == null || valueNode == null) continue;
                var cname = nameNode.getNodeValue(), cval = valueNode.getNodeValue();
                if (cname == "type") entryType = cval;
                else if (cname == "id") entryId = parseInt(cval);
                else if (cname == "x") entryX = parseInt(cval);
                else if (cname == "y") entryY = parseInt(cval);
            }
            if (entryType == "n" && entryId == npcId) return new java.awt.Point(entryX, entryY);
        }
    } catch (e) {}
    return null;
}

function showItemDetail() {
    var itemId = currentDetailId;
    var itemName = getItemName(itemId);
    var msgText = "#e#d=== 道具详情 ===#k#n\r\n\r\n";
    msgText += "道具: #v" + itemId + ":# #b" + itemId + "#k - #r" + itemName + "#k\r\n\r\n";
    var mobText = "#e#d=== 掉落怪物(点击查看) ===#k#n\r\n";
    var mobList = [];
    var mobData = stringProvider.getData("Mob.img");
    var mobChildren = mobData.getChildren();
    for (var i = 0; i < mobChildren.size(); i++) {
        var mob = mobChildren.get(i);
        var mobId = parseInt(mob.getName());
        if (isNaN(mobId)) continue;
        try {
            var drops = mip.retrieveDrop(mobId);
            if (drops != null) {
                for (var d = 0; d < drops.size(); d++) {
                    if (drops.get(d).itemId == itemId) {
                        var name = DataTool.getString(mob.getChildByPath("name"), "NO-NAME");
                        mobList.push({id: mobId, name: name});
                        break;
                    }
                }
            }
        } catch (e) {}
    }
    if (mobList.length == 0) { mobText += "\t\t#e#r没有怪物掉落该道具#k#n\r\n"; }
    else {
        for (var m = 0; m < mobList.length; m++) {
            mobText += "#L" + encodeMob(mobList[m].id) + "##b" + mobList[m].id + "#k - #r" + mobList[m].name + "#l\r\n";
        }
    }
    var end = "\r\n#e#r#L0#返回任务详情#l\r\n";
    cm.sendNextSelectLevel("ItemDetailAction", (msgText + mobText + end), 2);
}

function levelItemDetailAction(action) {
    if (action == 0) { levelQuestDetail(currentQuestId); return; }
    if (action >= 300000000) { currentDetailId = action - 300000000; showMobDetail(); }
}

function showMobDetail() {
    var mobId = currentDetailId;
    var mob = LifeFactory.getMonster(mobId);
    if (mob == null) { cm.sendOkLevel("ItemDetailAction", "怪物数据不存在。"); return; }

    mobCardId = null;
    try {
        var drops = mip.retrieveDrop(mobId);
        if (drops != null) {
            for (var d = 0; d < drops.size(); d++) {
                var did = drops.get(d).itemId;
                if (did > 0) {
                    try {
                        var it = iip.getEquipById(did).getInventoryType().name();
                        if (it == "USE") { var iname = iip.getName(did).toString(); if (iname.indexOf("卡片") > 0) mobCardId = did; }
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}

    var stats = mob.getStats();
    var msgText = getMobImage(mob) + " \t #eLv.#n" + stats.getLevel() + "\r\n";
    msgText += "[ #e#d" + mob.getName() + "#n " + (mob.isBoss() ? "#r#eBOSS怪物#n#k" : "#d普通怪物#n#k") + " ]  #e#rHP：" + mob.getMaxHp().toString() + "  #e#bMP：" + mob.getMaxMp() + "\r\n#k#n";
    msgText += "物攻：" + stats.getPADamage().toString() + "\t物防：" + stats.getPDDamage() + "\t";
    msgText += "魔攻：" + stats.getMADamage().toString() + "\t魔防：" + stats.getMDDamage() + "\r\n\r\n";

    var dropText = "#e#d=== 战利品 ===#k#n\r\n";
    var dropList = [];
    try {
        var drops = mip.retrieveDrop(mobId);
        if (drops != null && !drops.isEmpty()) {
            for (var d = 0; d < drops.size(); d++) { var did = drops.get(d).itemId; if (did > 0) dropList.push(did); }
        }
    } catch (e) {}
    if (dropList.length == 0) { dropText += "\t\t#r无掉落数据#k\r\n"; }
    else {
        for (var d = 0; d < dropList.length; d++) { dropText += "#v" + dropList[d] + ":#"; if ((d + 1) % 8 == 0) dropText += "\r\n"; }
        dropText += "\r\n";
    }

    var mapText = "#e#d=== 出没地区(点击传送) ===#k#n\r\n";
    var mapsWithCount = getMobMaps(mobId);
    if (mapsWithCount.length == 0) { mapText += "\t\t#e#r无法获取出没地区#k#n\r\n"; }
    else {
        mapsWithCount.sort(function(a, b) { return b.count - a.count; });
        for (var k = 0; k < mapsWithCount.length; k++) {
            var m = mapsWithCount[k];
            mapText += "#L" + (-m.mapId) + "##b" + m.mapId + "#k - #r#m" + m.mapId + "#" + (m.count > 0 ? " ×" + m.count : "") + "#l\r\n";
        }
    }

    var end = "";
    if (cm.getPlayer().isGM()) {
        end += "\r\n#e#g#L77777777#原地召唤怪物#l\r\n";
    }
    end += "#e#r#L0#返回#l\r\n";
    cm.sendNextSelectLevel("MobDetailAction", (msgText + dropText + mapText + end), 2);
}

function levelMobDetailAction(action) {
    if (action == 0) { levelQuestDetail(currentQuestId); return; }
    if (action == 77777777) { cm.getInputTextLevel("SpawnMobs", "请输入要召唤的数量:"); return; }
    if (action < 0) { cm.getPlayer().changeMap(-action); cm.dispose(); return; }
}

function levelSpawnMobs() {
    var input = cm.getText();
    var count = parseInt(input);
    if (isNaN(count) || count <= 0) { cm.sendOkLevel("SpawnMobs", "请输入有效的正整数！"); return; }
    var map = cm.getPlayer().getMap();
    var pos = cm.getPlayer().getPosition();
    for (var i = 0; i < count; i++) { map.spawnMonsterOnGroundBelow(currentDetailId, pos.x, pos.y); }
    cm.sendOk("已在原地召唤 #b" + count + "#k 只怪物（ID: " + currentDetailId + "）。");
    cm.dispose();
}

function levelSearchQuestData() { start(); }

function getNpcMaps(npcId) {
    var npcLocData = etcProvider.getData("NpcLocation.img");
    var npcLocNode = npcLocData.getChildByPath(String(npcId));
    if (npcLocNode != null && !npcLocNode.getChildren().isEmpty()) {
        var maps = [];
        var children = npcLocNode.getChildren();
        for (var i = 0; i < children.size(); i++) { var mapId = parseInt(children.get(i).getData()); if (mapId > 0) maps.push(mapId); }
        if (maps.length > 0) return maps;
    }
    cm.dropMessage(0, "NpcLocation无数据，正在扫描地图文件...");
    var results = scanMapsForLife(npcId, "n");
    var maps = [];
    for (var i = 0; i < results.length; i++) { maps.push(results[i].mapId); }
    return maps;
}

function getMobMaps(mobId) {
    var mobBook = stringProvider.getData("MonsterBook.img");
    var mobData = mobBook.getChildByPath(String(mobId));
    if (mobData != null) {
        var maps = [];
        var mapNode = mobData.getChildByPath("map");
        if (mapNode != null) {
            var mapChildren = mapNode.getChildren();
            for (var i = 0; i < mapChildren.size(); i++) { var mid = mapChildren.get(i).getData(); maps.push({mapId: mid, count: getMobCountInMap(mobId, mid)}); }
        }
        return maps;
    }
    cm.dropMessage(0, "MonsterBook无数据，正在扫描地图文件...");
    return scanMapsForLife(mobId, "m");
}

function getMobCountInMap(mobId, mapId) {
    try {
        var padded = String(mapId).padStart(9, "0");
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
            var entryType = null, entryId = 0;
            for (var j = 0; j < childNodes.getLength(); j++) {
                var child = childNodes.item(j);
                if (child.getNodeType() != 1) continue;
                var attr = child.getAttributes();
                if (attr == null) continue;
                var cn = attr.getNamedItem("name"), cv = attr.getNamedItem("value");
                if (cn == null || cv == null) continue;
                if (cn.getNodeValue() == "type") entryType = cv.getNodeValue();
                else if (cn.getNodeValue() == "id") entryId = parseInt(cv.getNodeValue());
            }
            if (entryType == "m" && entryId == mobId) count++;
        }
        return count;
    } catch (e) { return 0; }
}

var MAP_DIRS = ["Map0", "Map1", "Map2", "Map3", "Map5", "Map6", "Map7", "Map8", "Map9"];

function scanMapsForLife(lifeId, lifeType) {
    var results = [];
    var searchStr = "value=\"" + lifeId + "\"";
    for (var d = 0; d < MAP_DIRS.length; d++) {
        var dir = new java.io.File("wz/Map.wz/Map/" + MAP_DIRS[d]);
        if (!dir.exists()) continue;
        var files = dir.listFiles();
        if (files == null) continue;
        for (var f = 0; f < files.length; f++) {
            var file = files[f];
            if (file.getName().indexOf(".img.xml") < 0) continue;
            try {
                var scanner = new java.util.Scanner(file);
                if (scanner.findWithinHorizon(searchStr, 0) == null) { scanner.close(); continue; }
                scanner.close();
                var count = countLifeInMapFile(file, lifeId, lifeType);
                if (count > 0) {
                    var mapId = parseInt(file.getName().replace(".img.xml", ""));
                    if (!isNaN(mapId)) results.push({mapId: mapId, count: count});
                }
            } catch (ex) {}
        }
    }
    return results;
}

function countLifeInMapFile(file, lifeId, lifeType) {
    try {
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
            var entryType = null, entryId = 0;
            for (var j = 0; j < childNodes.getLength(); j++) {
                var child = childNodes.item(j);
                if (child.getNodeType() != 1) continue;
                var attr = child.getAttributes();
                if (attr == null) continue;
                var cn = attr.getNamedItem("name"), cv = attr.getNamedItem("value");
                if (cn == null || cv == null) continue;
                if (cn.getNodeValue() == "type") entryType = cv.getNodeValue();
                else if (cn.getNodeValue() == "id") entryId = parseInt(cv.getNodeValue());
            }
            if (entryType == lifeType && entryId == lifeId) count++;
        }
        return count;
    } catch (ex) { return 0; }
}

function getQuestName(qid) {
    try {
        var infoData = questProvider.getData("QuestInfo.img");
        var questNode = infoData.getChildByPath(String(qid));
        if (questNode == null) return null;
        return DataTool.getString(questNode.getChildByPath("name"), null);
    } catch (e) { return null; }
}

function getNpcName(npcId) {
    try {
        var npcData = stringProvider.getData("Npc.img");
        var node = npcData.getChildByPath(String(npcId));
        if (node == null) return "未知NPC";
        return DataTool.getString(node.getChildByPath("name"), "未知NPC");
    } catch (e) { return "未知NPC"; }
}

function getMobName(mobId) {
    try {
        var mobData = stringProvider.getData("Mob.img");
        var node = mobData.getChildByPath(String(mobId));
        if (node == null) return "未知怪物";
        return DataTool.getString(node.getChildByPath("name"), "未知怪物");
    } catch (e) { return "未知怪物"; }
}

function getItemName(itemId) {
    try { var name = iip.getName(itemId); return (name != null) ? name.toString() : "未知道具"; }
    catch (e) { return "未知道具"; }
}

function getMobImage(mob) {
    var def = "#fUI/UIWindow.img/Maker/randomRecipe#  (缺少图片)\r\n";
    if (mobCardId != null) { def = "#fItem/Consume/0238/0" + mobCardId + "/info/iconRaw#"; }
    var type = [null, "stand", "fly"];
    type = type[mob.getStats().getMovetype() + 1];
    if (type == null) return def;
    var mp = DataProviderFactory.getDataProvider(WZFiles.MOB);
    var mobImg = mp.getData(mob.getId().toString().padStart(7, "0") + ".img");
    if (mobImg == null || mobImg.getChildByPath(type) == null) return def;
    if (mob.getStats().getImgwidth() > 160 && mob.getStats().getImgheight() > 250) {
        if (mobCardId != null) { return "#fItem/Consume/0238/0" + mobCardId + "/info/iconRaw#  (形象过大)\r\n"; }
        else { return "#fMob/1210102.img/stand/0#  (形象过大)"; }
    }
    if (mob.getStats().getImgwidth() < 5 && mob.getStats().getImgheight() < 5) return def;
    return "#fMob/" + mob.getId().toString().padStart(7, "0") + ".img/" + type + "/0#";
}
