/*
	NPC Name: 		Asia
	Description: 		Quest - Magic, Science and space
*/

function start(mode, type, selection) {
    qm.dispose();
}

function end(mode, type, selection) {
    if (qm.getQuestStatus(50012) == 0) {
	qm.forceStartQuest();
    } else {
	qm.sendOk("先到2102年的核心商业区，通过地下通道潜入商贸中心内部吧。 \r\n因为是敌人的根据地，商贸中心内部可能还有很多没见过的新的敌人...绝对，不能大意啊。总之，务必要保重 ...！");
	qm.forceCompleteQuest(50015);
	qm.forceCompleteQuest();
    }
    qm.dispose();
}