function start(mode, type, selection) {
    if (qm.getPlayer().getJob().getId() > 1000 && qm.getPlayer().getJob().getId() < 2000) {
        qm.forceStartQuest();
    }
    qm.dispose();
}

function end(mode, type, selection) {
    if (qm.canHold(1142066) && !qm.hasItem(1142066) && (qm.getPlayer().getJob().getId() > 1000 && qm.getPlayer().getJob().getId() < 2000)) {
        qm.gainItem(1142066, 1);
        qm.forceStartQuest();
        qm.forceCompleteQuest();
        qm.sendOk("恭喜获得#b#t1142066##k。祝你一切顺利");
    }
    qm.dispose();
}