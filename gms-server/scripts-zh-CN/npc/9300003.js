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
		cm.sendYesNo("我可以送您去宴客堂，现在去吗?");
	} else if(status == 2){
		cm.warp(700000200, 0);
		cm.dispose();	
	} else {
		cm.dispose();
	}
}