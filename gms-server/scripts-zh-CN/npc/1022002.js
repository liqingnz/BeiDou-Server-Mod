/*
勇士部落麦吉
 */
var status = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {

    if (status >= 0 && mode == 0) {
        cm.dispose();
        return;
    }
    if (mode == 1) {
        status++;
    } else {
        status--;
    }

    if (status == 0 && cm.getPlayer().getLevel() >= 50) {
        cm.sendYesNo("你看起来很强的样子，要不要去一趟 #b#m105100100##k 呢 ?");
    	}
     else if (status == 0 && cm.getPlayer().getLevel() < 50) {
        cm.sendOk("在你受伤以前，赶快离开吧.");
        cm.dispose();
        return;

    } else if (status == 1) {
        cm.warp(105100100,2);
        cm.dispose();
    }
    else {
        cm.dispose();
    }
}