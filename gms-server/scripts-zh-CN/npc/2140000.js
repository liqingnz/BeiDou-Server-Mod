/**
 * 神殿管理者(2140000) - 时间神殿(270000000)
 * 花钱重置已完成的指定任务，让它可以重做。
 * 移植自 LichKingMod scripts/npc/2140000.js。
 *
 * 加任务只需往 questList 里追加 [显示名, 任务id]，重置走 cm.startQuestPro，
 * 起始NPC由任务数据自己决定，不必在这里填。
 */
var status = -1;
var questList = [["巴勒图的请求（霍夫卡）", 2208]];
var selected = -1;
var cost = 10000000;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }
    status++;

    if (status == 0) {
        var questStr = "";
        for (var i = 0; i < questList.length; i++) {
            questStr += "\r\n#L" + i + "#" + questList[i][0] + "#l";
        }
        cm.sendSimple("我可以走后门找时间女神帮你回到任务完成前。\r\n目前支持重置的任务：#b" + questStr);
    } else if (status == 1) {
        selected = selection;
        if (!cm.isQuestCompleted(questList[selected][1])) {
            cm.sendOk("你还未完成任务：#b" + questList[selected][0]);
            cm.dispose();
            return;
        }
        cm.sendYesNo("你确定要重置任务：#b" + questList[selected][0] + "#k？\r\n这将花费你#r一千万#k金币。\r\n#i4031138# " + cost + " 金币");
    } else if (status == 2) {
        if (cm.getMeso() < cost) {
            cm.sendOk("对时间女神这点钱都拿不出来？");
            cm.dispose();
            return;
        }
        // 原实现先扣钱再重置，不看重置结果。重置失败（任务数据缺失等）钱就白扣了，改成先重置后扣钱。
        if (!cm.startQuestPro(questList[selected][1])) {
            cm.sendOk("时间女神今天不太乐意，这个任务重置不了。");
            cm.dispose();
            return;
        }
        cm.gainMeso(-cost);
        cm.sendOk("好了，任务#b" + questList[selected][0] + "#k已经回到完成之前的状态。");
        cm.dispose();
    }
}
