/*
	名字:	不承認的王
	地圖:	第五座塔樓
	描述:	211061001
	适配:	北斗GMS083 任务脚本（纯qm原生API）
*/

var status = -1;
// 提前获取InventoryType枚举（解决类型转换错误）
var InventoryType = Java.type("org.gms.client.inventory.InventoryType");

function start(mode, type, selection) {
    switch (mode) {
        case -1:
            qm.dispose();
            return;
        case 0:
            if (status < 1) {
                qm.sendOk("抱歉…是否要求过多了？");
                qm.dispose();
                return;
            }
            status--;
            break;
        case 1:
            status++;
            break;
    }

    switch (status) {
        case 0:
            qm.sendYesNo("这本花谱是雷昂与我在玫瑰花园共同制作。当时我们都不擅手工，却是爱情的见证。或许能唤醒他尘封的情感。");
            break;
        case 1:
            // ✅ 北斗083 正确的ETC栏空格检查（使用枚举类型）
            if (qm.getPlayer().getInventory(InventoryType.ETC).getNumFreeSlot() < 1) {
                qm.sendPrev("你的其他栏位已过于拥挤。请整理出空间后再来找我。");
                qm.dispose();
                return;
            }
            qm.sendNext("若将花谱带给雷昂，或许他会明白我仍在此守候。尽管希望渺茫，但请你务必尝试。把书带去#b谒见室#k……");
            break;
        case 2:
            // 完全参考3173的任务启动逻辑
            if (!qm.isQuestStarted(3175) && !qm.isQuestCompleted(3175)) {
                qm.forceStartQuest(3175);
            }
            // ✅ 北斗083 正确的物品数量检查（避免重复发放）
            var itemCount = qm.getPlayer().getItemQuantity(4032837, true);
            qm.gainItem(4032837, itemCount > 0 ? 0 : 1);
            
            qm.dispose();
            break;
    }
}

// 北斗083任务脚本必需的end函数
function end() {
    qm.dispose();
}