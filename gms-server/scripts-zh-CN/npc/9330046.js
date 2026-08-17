var cost = 0;
var status = -1;

function start() {
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 0) {
        cm.dispose();
    } else {
        if (mode == 1) {
            status++;
        } else {
            status--;
        }

        if (status == 0) {
            cm.sendYesNo("很抱歉钓鱼系统暂不开放，你现在要回去吗？");
        } else if (status == 1) {

	if(cm.getMeso() < cost) {
	cm.sendOk("没钱还要去吗?");
	cm.dispose();
	} else {
	var fromMapID = cm.getPlayer().peekSavedLocation("MIRROR");
	cm.gainMeso(-cost);
	cm.warp(fromMapID);
	cm.clearSavedLocation("MIRROR");
	cm.dispose();
	    }

        } else {
        //cm.sendOk("想回去时随时跟我说。");
            cm.dispose();
	}
    }
} 

