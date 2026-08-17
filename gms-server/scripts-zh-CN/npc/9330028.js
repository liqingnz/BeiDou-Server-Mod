// 水果店爷爷，位于台湾不夜城741020100 //

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
            cm.sendYesNo("你想去挑战黑轮王吗？不过它可能不在那里哦，还是要去吗？");
        } else if (status == 1) {
	if(cm.getMeso() < cost) {
	cm.sendOk("没钱还要去吗?");
	cm.dispose();
	} else {
	cm.gainMeso(-cost);
	//cm.warp(105090310, 0); //金银岛黑轮王所在地
	cm.warp(741020101, 1); 
	cm.dispose();
	    }

        } else {
        //cm.sendOk("如果你改变主意了，再与我交谈。");
        cm.dispose();
	}
    }
} 
