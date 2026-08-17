/*
	Cody
*/

function start() {
    // cm.sendSimple("你想去别的地方吗？\r\n#b#L0#Beer Tent#l\r\n#L1#Mal Volence#l#k");
    cm.sendSimple("你想去探索宝藏吗？\r\n#L1#Mal Volence#l#k");
}

function action(mode,type,selection) {
    if (mode == 1) {
	//cm.saveReturnLocation("CHRISTMAS");
	//cm.warp(selection == 0 ? 674020000 : 674030100,0);
	cm.warp(674030100)
    }
    cm.dispose();
}