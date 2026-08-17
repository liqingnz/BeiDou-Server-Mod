function start() {
	cm.sendNext("这里是卡姆那，是一个没有时间概念的地方...\r\n正因于此才能将#b努克斯#k，这个可以在时间的洪流中无限转生的魔兽封印在此处。\r\n我可以送你到他的所在地...");
}

function action(mode, type, selection) {
    	if (mode == 1 && cm.getQuestStatus(4697) == 2) {
		cm.warp(802000110,1);
	} else if (mode == 1) {
	cm.sendOk("你还没有完成前面的挑战，我不能送你过去...");
	}
	cm.dispose();
}
