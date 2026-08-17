var status = 0;
var cost = 1000000;
function start() {
    cm.sendYesNo("付我" + (cost/10000) + "万金币，我可以送你到对面。");
}

function action(mode, type, selection) {
    if (mode != 1) {
        if (mode == 0)
        cm.sendOk("苦海无涯，回头是岸~~~");
        cm.dispose();
        return;
    }
    status++;
    if (status == 1) {
		if(cm.getMeso() < cost) {
		cm.sendOk("没钱还要去吗?");
		cm.dispose();
		} else {
		cm.gainMeso(-cost);
		cm.warp(800040210, 6);
        		cm.dispose();
    		}
 	 }
}