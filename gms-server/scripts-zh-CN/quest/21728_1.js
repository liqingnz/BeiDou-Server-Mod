var status = -1;

function start(mode, type, selection) {

}

function end(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
    } else {
        if (mode == 0 && type > 0) {
            qm.dispose();
            return;
        }

        if (mode == 1) {
            status++;
        } else {
            status--;
        }
        if (status == 0) {
            qm.sendNext("你调查回来了？情况如何！");
        } else if (status == 1) {
            if (!qm.haveItem(5060001)) { //根据是否有封印之锁来判断是否去过傀儡师洞穴
                qm.sendOk("你应该去火独眼兽洞穴看看..");
                qm.dispose();
            } else {
                qm.sendNextPrev("你在洞穴深处发现了奇怪的符文和能量波动...");
            }
        } else if (status == 2) {
            qm.gainExp(5000);
            qm.forceCompleteQuest();
            qm.forceStartQuest(21729);
            qm.sendOk("这些发现太重要了！现在去找#b奇怪的石像#k，他是个大师，应该能解读这些符文。");
            qm.dispose();
        }
    }
}