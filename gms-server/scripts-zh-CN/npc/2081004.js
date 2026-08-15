/**
 * 帕姆(2081004) - 悠久之地：龙之森林(240000004)
 * 用三种断奶食材料合成浓缩断奶食。
 * 移植自 LichKingMod scripts/npc/2081004.js。
 */
var status = -1;
var selected = -1;

var cost = 1000000;
var resultItemBase = 4032196;
var questItems = [[4000236, 4000237, 4000238], [4000239, 4000241, 4000242], [4000262, 4000263, 4000265]];
var quantity = 30;

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
        var selStr = "哈喽啊，你想制作浓缩断奶食吗？";
        for (var i = 0; i < questItems.length; i++) {
            selStr += "\r\n#L" + i + "# #i" + (resultItemBase + i) + "# #z" + (resultItemBase + i) + "##l";
        }
        cm.sendSimple(selStr);
    } else if (status == 1) {
        selected = selection;
        // 原实现按 selection 分了三个 if 分支，三段文案逐字相同，合并成一段
        var selStr = "制作 #i" + (resultItemBase + selected) + "# #z" + (resultItemBase + selected) + "# 所需：";
        for (var i = 0; i < questItems[selected].length; i++) {
            selStr += "\r\n#k#i" + questItems[selected][i] + "# #z" + questItems[selected][i] + "# x #b" + quantity;
        }
        selStr += "\r\n#i4031138# " + cost + " 金币";
        cm.sendYesNo(selStr);
    } else if (status == 2) {
        if (cm.getMeso() < cost) {
            cm.sendOk("等发工资了再来吧。");
            cm.dispose();
            return;
        }
        // 原实现把材料校验写在循环体里，第一件材料够了就直接走 else 分支收材料发成品，
        // 后面两种材料一件都不用有。这里改成先整批校验再一次性扣除。
        for (var i = 0; i < questItems[selected].length; i++) {
            if (!cm.haveItem(questItems[selected][i], quantity)) {
                cm.sendOk("材料不足？你再看看！");
                cm.dispose();
                return;
            }
        }
        if (!cm.canHold(resultItemBase + selected, 1)) {
            cm.sendOk("背包空间不足。");
            cm.dispose();
            return;
        }
        for (var i = 0; i < questItems[selected].length; i++) {
            cm.gainItem(questItems[selected][i], -quantity);
        }
        cm.gainMeso(-cost);
        cm.gainItem(resultItemBase + selected, 1);
        cm.sendOk("拿去吧！");
        cm.dispose();
    }
}
