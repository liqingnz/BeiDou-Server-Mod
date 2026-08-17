/*
	NPC Name: 		Ponicher
	Description: 		Quest - A Battle Against Vergamot
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
            qm.sendNext("挑战贝尔加莫特是很不容易的，这些需要你和伙伴们的努力奋斗，才能打败它！我将送你到贝尔加莫特的基地，准备好了的话，就再次与我对话，开启贝尔加莫特远征！");
        } else if (status == 1) {
            qm.forceStartQuest();
            qm.dispose();
        }
    }
}

function end(mode, type, selection) {
}