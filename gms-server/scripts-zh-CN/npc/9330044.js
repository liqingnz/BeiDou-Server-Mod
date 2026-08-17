var cost = 1000;
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
            cm.sendYesNo("我可以用魔法送你到不夜城，只需" + cost + "金币，要去吗？爱你哦！");
        } else if (status == 1) {
	if(cm.getMeso() < cost) {
	cm.sendOk("没钱还要去吗?");
	cm.dispose();
	} else {
	cm.gainMeso(-cost);
	cm.warp(741000000, 6);
	cm.dispose();
	    }

        } else {
        cm.sendOk("既然你不想去那就算了~~~");
        cm.dispose();
	}
    }
} 
