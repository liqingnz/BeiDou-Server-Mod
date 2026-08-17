/*
	名字:	莫特（狮子王任务NPC）
	地图:	任意
	描述:	完成任务3182后，可使用代币兑换装备
		代币4000630 → 随机兑换（属性随机，与怪物掉落完全一致）
		代币4310010 → 指定兑换武器（属性随机，与怪物掉落完全一致）
		代币4310009 → 指定兑换防具（属性随机，与怪物掉落完全一致）
	适配:	北斗GMS083 零Java类导入 纯原生四参数API
*/
// 随机兑换物品池（代币4000630, 净化图腾）: [物品ID, 获取数量]  
var randomList = [
    [1032030, 1],
    [1142500, 1],
    [3010188, 1],
    [1132105, 1],
    [1132106, 1],
    [1132108, 1],
    [1102713, 1],
    [1102714, 1],
    [1102715, 1],
    [1102716, 1],
    [1102717, 1],
    [1082613, 1],
    [1082614, 1],
    [1082615, 1],
    [1082616, 1],
    [1082617, 1],
    [1052804, 1],
    [1052805, 1],
    [1052806, 1],
    [1052807, 1],
    [1052808, 1],
    [1072972, 1],
    [1072973, 1],
    [1072974, 1],
    [1072975, 1],
    [1072976, 1],
    [1302316, 1],
    [1312186, 1],
    [1322237, 1],
    [1332261, 1],
    [1372208, 1],
    [1382246, 1],
    [1402237, 1],
    [1412179, 1],
    [1422186, 1],
    [1432201, 1],
    [1442255, 1],
    [1452239, 1],
    [1462226, 1],
    [1472248, 1],
    [1482203, 1],
    [1492213, 1],
    [1072679, 1]
];
// 指定兑换物品池1（代币4310010，皇家币）: [物品ID, 所需代币数量]
var selectList = [
    [1302316, 2],
    [1312186, 1],
    [1322237, 1],
    [1332261, 2],
    [1372208, 1],
    [1382246, 1],
    [1402237, 2],
    [1412179, 1],
    [1422186, 1],
    [1432201, 2],
    [1442255, 2],
    [1452239, 2],
    [1462226, 2],
    [1472248, 2],
    [1482203, 2],
    [1492213, 2]
];
// 指定兑换物品池2（代币4310009，贵族币）: [物品ID, 所需代币数量]
var selectList2 = [
    [1032030, 3],
    [1142500, 2],
    [3010188, 1],
    [1132105, 2],
    [1132106, 2],
    [1132108, 2],
    [1102713, 1],
    [1102714, 1],
    [1102715, 1],
    [1102716, 1],
    [1102717, 1],
    [1082613, 1],
    [1082614, 1],
    [1082615, 1],
    [1082616, 1],
    [1082617, 1],
    [1052804, 1],
    [1052805, 1],
    [1052806, 1],
    [1052807, 1],
    [1052808, 1],
    [1072972, 2],
    [1072973, 2],
    [1072974, 2],
    [1072975, 2],
    [1072976, 2],
    [1072679, 1]
];
var randomCost = 100;
var step = 0;
var pending = {
    tokenId: 0,
    tokenCost: 0,
    itemId: 0,
    quantity: 0,
    isRandom: false,
    // 新增1行：标记当前使用的兑换列表
    useList2: false
};
// 零Java类导入 纯cm原生四参数API实现
function start() {
    step = 0;
    if (!cm.isQuestCompleted(3182)) {
        cm.sendNext("我现在被诅咒困扰，什么都做不了......\r\n如果你帮我解除诅咒，我可以和你交换物品。");
        cm.dispose();
        return;
    }
    var menu = "感谢你帮我解除诅咒，英勇的冒险家！请选择兑换方式：\r\n";
    menu += "#L0#使用 #i4000630#   兑换随机武器防具#l\r\n";
    // 修复1：补充分隔符，避免菜单排版错乱
    menu += "#L1#使用 #i4310010#   兑换指定武器#l\r\n";
    menu += "#L2#使用 #i4310009#   兑换指定防具#l";
    cm.sendSimple(menu);
}
function action(mode, type, selection) {
    if (mode != 1) {
        cm.dispose();
        return;
    }
    if (step == 0) {
        if (selection == 0) {
            doRandomExchange();
        } else if (selection == 1) {
            step = 1;
            pending.useList2 = false;
            showSelectMenu();
        // 修复2：新增防具兑换分支
        } else if (selection == 2) {
            step = 1;
            pending.useList2 = true;
            showSelectMenu();
        } else {
            cm.dispose();
        }
    } else if (step == 1) {
        handleSelectExchange(selection);
    } else if (step == 2) {
        if (selection == 0) {
            cm.sendNext("兑换已取消。");
            cm.dispose();
        } else {
            performExchange();
        }
    }
}
function doRandomExchange() {
    if (!cm.haveItem(4000630, randomCost)) {
        cm.sendNext("你没有足够的 #i4000630#，需要 " + randomCost + " 个。");
        cm.dispose();
        return;
    }
    pending.tokenId = 4000630;
    pending.tokenCost = randomCost;
    pending.isRandom = true;
    pending.itemId = 0;
    pending.quantity = 0;
    cm.sendYesNo("使用 #i4000630#  x " + randomCost + "\r\n兑换随机一件装备（属性也随机），是否兑换？");
    step = 2;
}
function showSelectMenu() {
    var menu = "请选择你要兑换的物品：\r\n";
    // 修复3：动态切换兑换列表和代币
    var targetList = pending.useList2 ? selectList2 : selectList;
    var tokenId = pending.useList2 ? 4310009 : 4310010;
    for (var i = 0; i < targetList.length; i++) {
        var itemId = targetList[i][0];
        var cost = targetList[i][1];
        menu += "#L" + i + "##v" + itemId + "# #z" + itemId + "#     需要 #i" + tokenId + "# " + cost + " 个#l\r\n";
    }
    cm.sendSimple(menu);
}
function handleSelectExchange(selection) {
    // 修复4：动态切换兑换列表和代币检查
    var targetList = pending.useList2 ? selectList2 : selectList;
    var tokenId = pending.useList2 ? 4310009 : 4310010;
    if (selection < 0 || selection >= targetList.length) {
        cm.dispose();
        return;
    }
    var itemId = targetList[selection][0];
    var cost = targetList[selection][1];
    if (!cm.haveItem(tokenId, cost)) {
        cm.sendNext("你没有足够的 #i" + tokenId + "#，需要 " + cost + " 个。");
        cm.dispose();
        return;
    }
    if (!cm.canHold(itemId)) {
        cm.sendNext("背包空间不足，或该物品只能持有一个，请清理后再来。");
        cm.dispose();
        return;
    }
    pending.tokenId = tokenId;
    pending.tokenCost = cost;
    pending.isRandom = false;
    pending.itemId = itemId;
    pending.quantity = 1;
    cm.sendYesNo("使用 #i" + tokenId + "#  x " + cost + " 兑换 #v" + itemId + "# #z" + itemId + "#（属性随机），是否兑换？");
    step = 2;
}
// ✅ 核心：北斗GMS083 唯一正确的随机属性生成方式
// 四参数说明：cm.gainItem(物品ID, 数量, 是否显示获得提示, 是否生成随机属性)
function performExchange() {
    if (pending.isRandom) {
        if (!cm.haveItem(pending.tokenId, pending.tokenCost)) {
            cm.sendNext("你的材料不足，兑换失败。");
            cm.dispose();
            return;
        }
        
        // 随机抽取物品
        var idx = Math.floor(Math.random() * randomList.length);
        var item = randomList[idx];
        var itemId = item[0];
        var quantity = item[1] || 1;
        
        if (!cm.canHold(itemId)) {
            cm.sendNext("背包空间不足，或随机到的物品只能持有一个，无法兑换。");
            cm.dispose();
            return;
        }
        
        // 扣除代币
        cm.gainItem(pending.tokenId, -pending.tokenCost);
        
        // 所有装备统一生成随机属性（无任何例外）
        // 第四个参数true = 与怪物掉落完全一致的随机属性
        cm.gainItem(itemId, quantity, true, true);
        cm.sendNext("恭喜！你获得了 #v" + itemId + "# #t" + itemId + "# x" + quantity);
        
        cm.dispose();
    } else {
        // 指定兑换也全部生成随机属性
        if (!cm.haveItem(pending.tokenId, pending.tokenCost)) {
            cm.sendNext("你的材料不足，兑换失败。");
            cm.dispose();
            return;
        }
        if (!cm.canHold(pending.itemId)) {
            cm.sendNext("背包空间不足，或该物品只能持有一个，请清理后再来。");
            cm.dispose();
            return;
        }
        
        // 扣除代币
        cm.gainItem(pending.tokenId, -pending.tokenCost);
        
        // 所有装备统一生成随机属性
        // 第四个参数true = 与怪物掉落完全一致的随机属性
        cm.gainItem(pending.itemId, pending.quantity, true, true);
        cm.sendNext("恭喜！你获得了 #v" + pending.itemId + "# #t" + pending.itemId + "# x" + pending.quantity);
        
        cm.dispose();
    }
}