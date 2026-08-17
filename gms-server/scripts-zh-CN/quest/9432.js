var status = -1;

function start(mode, type, selection) {
    qm.dispose();
}

function end(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
        return;
    }
    if (mode == 0) {
        qm.dispose();
        return;
    }
    status++;
    if (status == 0) {
        qm.sendNext("非常感谢你，这样我就能制作美味的可乐给哥哥了!");
    } else if (status == 1) {
        // 随机获得一件物品，可乐耳环或零度可乐耳环
        var rand = Math.floor(Math.random() * 2);
        var itemId = (rand == 0) ? 1032047 : 1032059;
        if (qm.canHold(itemId, 1)) {
            qm.gainItem(4000216, -50);
            qm.gainItem(4031322, -1);
            qm.gainItem(4031323, -1);
            qm.gainItem(itemId, 1);
            qm.gainItem(2020031, 100);
            qm.forceCompleteQuest();
            qm.sendOk("这是我送给你的礼物~ #i" + itemId + "# #b#z" + itemId + "##k 和 #i" + 2020031 + "##b#z" + 2020031 + "##k");
        } else {
            qm.sendOk("背包空间不足，请整理一下背包吧。");
        }
        qm.dispose();
    }
}