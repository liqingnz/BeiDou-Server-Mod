/*
	NPC Name: 		Old Fox Flagship Al
	Description: 		Quest - Battling Nibergen
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
            qm.sendNext("好了，你即将要挑战他了！只是，你要知道，敌人可能是非常強大的。准备好了的话，就再次与我对话，开启尼贝隆远征！");
        } else if (status == 1) {
            qm.forceStartQuest();
            qm.dispose();
        }
    }
}

function end(mode, type, selection) {
}