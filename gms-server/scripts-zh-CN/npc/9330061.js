var status = 0;
var cost = 0;
function start() {
    cm.sendSimple("选择你的目的地。\r\n#L0##b101大厦#b#l\r\n#L1#废弃都市#l");

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
		cm.message("请往前走，地铁通向101大厦...");
		cm.warp(742000104,5);
       		cm.dispose();
    		}
	} else if (selection == 1) {
		if(cm.getMeso() < cost) {
		cm.sendOk("没钱不能让你乘车。");
		cm.dispose();
		} else {
		//cm.gainMeso(-cost);
		//cm.warp(103000100);  //直接传送回废都
       		//cm.dispose();
       		var em = cm.getEventManager("KerningTrain2");
       		if (!em.startInstance(cm.getPlayer())) {
       		cm.sendOk("客运车已经满了。稍后再试一次。");
       		}
       		cm.dispose();

    		}
	} 
}
}