/*
	NPC Name: 		Asia
	Description: 		Quest - A rush of Core Blaze
*/

var status = -1;

function start(mode, type, selection) {
    qm.dispose();
}

function end(mode, type, selection) {
    if (qm.getQuestStatus(50005) == 0) {
	qm.forceStartQuest();
	qm.dispose();
    } else {
	if (mode == 1) {
	    status++;
	} else {
	    status--;
	}
	if (status == 0) {
	    qm.sendNext("（我重新进入了2102年的涩谷。我看到的下面的是……#p9120033#！）\n……你是……！");
	} else if (status == 1) {
	    qm.sendNextPrev("……啊，所以你被派来打倒#o9400296#。说真的，我很抱歉……\n（他说这些话时，#p9120033#无法直视我的眼睛）");
	} else if (status == 2) {
	    qm.sendNextPrev("敌方总部位于#b六本木商贸中心#k。当然，你无法正面进入。在大厅里，有一支名为#o9400287#的机器人军队驻守，充当警卫。你的第一个任务是潜入大楼，同时骗过那些机器人。\n（他说这些时，#p9120033#递给我一份地图。）");
	} else if (status == 3) {
	    qm.sendNextPrev("事实上，有一条从涩谷通往六本木商贸中心的地下通道。利用它，你可以不被#o9400287#察觉地进入大楼。这是通往那里的地图。路线是笔直的，你应该能顺利进入，但我还是把地图给你。");
	} else if (status == 4) {
	    qm.sendOk("请前往2102年的涩谷，使用地下通道进入商贸中心。由于那里是总部，你可能会遇到许多从未见过的怪物。请千万不要低估它们。祝你好运！");
	    qm.forceCompleteQuest();
	    qm.dispose();
	}
    }
}