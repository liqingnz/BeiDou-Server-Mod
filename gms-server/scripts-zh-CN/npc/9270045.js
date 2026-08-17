function start() {
	cm.sendYesNo("你想离开这个地方？但是出去后无法返回战场...");
}

function action(mode, type, selection) {
    	if (mode == 1) {
		cm.warp(541020700,6);
	}
	cm.dispose();
}
