/*
	NPC Name: 		Dida
	Description: 		Quest - Break of Blaze
*/
var status = -1;

function start(mode, type, selection) {
    if (mode == -1) {
	qm.dispose();
    } else {
	if (mode == 1) {
	    status++;
	}
	if (status == 0) {
	    qm.sendNext("本来应该我来给你带路...可是我这伤口，只会妨碍你。 你先去吧。 我之后再去...找个东西。");
	} else if (status == 1) {
	    qm.forceStartQuest();
	    qm.warp(802000800, 0);
	    qm.dispose();
	}
    }
}

function end(mode, type, selection) {
}