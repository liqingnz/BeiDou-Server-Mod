var status = 0

function start(){
	action(1, 0, 0);
}

function action(mode, type ,selection){
	if(mode == 1) {
		status++;
	} else if(mode == 0) {
		status--;
	} else {
		cm.dispose();
		return;
	}
	if(status == 1){
		cm.sendYesNo("您要回到红鸾殿吗?");
	} else if(status == 2){
		cm.warp(700000100, 0);
		cm.dispose();	
	} else {
		cm.dispose();
	}
}