/* 
 *  NPC     Naosuke
 *  Maps ;  Ninja Castle Hallway
 *
 */
var status = -1

function start() {
    cm.sendNext("哇！你是谁？！");
}

function action(mode, type, selection) {
    if (mode == 1) {
	status++
    } else {
	if (status == 0) {
	    cm.sendOk("看吧，前方是一条危险的道路，众所周知，这条道路会吞噬所有敢于去那里的人。如果我是你，现在就转身离开，好好把握我的生活。");
	}
	cm.dispose();
	return;
    }
    if (status == 0) {
	cm.sendYesNo("什么你想继续吗？还是说你知道那里发生了什么？");
    } else if (status == 1) {
	cm.sendNext("好吧，如果你知道到底发生了什么，那么我不会阻止你。我真的希望你能安全地到达天守阁...打败那些家伙！")
    } else if (status == 2) {
	cm.warp(800040306, 0);
	cm.dispose();
    }
}