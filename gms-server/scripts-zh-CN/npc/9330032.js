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
            cm.sendYesNo("你找到黑轮王了吗？不管怎么说，先回去吧？");
        } else if (status == 1) {
	if(cm.getMeso() < cost) {
	cm.sendOk("没钱还要去吗?");
	cm.dispose();
	} else {
	cm.gainMeso(-cost);
	cm.warp(741020100, 4);
	cm.dispose();
	    }

        } else {
        //cm.sendOk("等你想回去时，再来找我。");
        cm.dispose();
	}
    }
} 
