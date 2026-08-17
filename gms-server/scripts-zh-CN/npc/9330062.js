var status = 0;
var cost = 0;
function start() {
    cm.sendSimple("选择你的目的地。\r\n#L0##b西门町#b#l");

}

function action(mode, type, selection) {

    if (mode == -1) {
        cm.dispose();
        return;
    } else if (mode == 0) {
        cm.dispose();
        return;
    } else {
        status++;
    }
    if (status == 1) {
        if (selection == 0) {
		if(cm.getMeso() < cost) {
		cm.sendOk("没钱不能让你乘车。");
		cm.dispose();
		} else {
		cm.gainMeso(-cost);
		cm.message("请往前走，地铁通向西门町...");
		cm.warp(742000101,4);
       		cm.dispose();
    		}
	}
}
}