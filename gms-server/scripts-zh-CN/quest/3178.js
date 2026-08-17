/*
	名字:	會有希望嗎
	地圖:	第五座塔樓
	描述:	211061001
*/

var status = -1;

function start(mode, type, selection) {
	switch (mode) {
	case -1:
		qm.dispose();
		return;
	case 0:
		if (status > 6) {
		qm.sendNext("我知道这看似无望。或许确实如此。但我们还不能放弃！");
		qm.dispose();
		return;
		}
		status--;
		break;
	case 1:
		status++;
		break;
		}
	switch (status) {
	case 0:
		qm.sendNext("你遇到知晓当年详情的人了？谁？#p2161002#…他曾是国王骑士团长。不知他仍在此地…#p2161002#说了什么？可弄清雷昂巨变的缘由？");
		break;
	case 1:
		qm.sendNextPrev("#b(你转述了#p2161002#告知的一切。)");
		break;
	case 2:
		qm.sendNextPrev("是了…那天浓黑乌云蔽空，敌军突袭王国。城墙崩塌，万物焚燃。而我就在塔楼里…被浓烟包围…原来如此。");
		break;
	case 3:
		qm.sendNextPrev("#b(从#p2161001#的反应来看，#p2161002#所言属实。)");
		break;
	case 4:
		qm.sendNextPrev("原来这就是雷昂改变的缘由。我曾为发生的一切埋怨过他，但现在我明白了。绝不会让他继续沉沦。");
		break;
	case 5:
		qm.sendNextPrev("#b看来你已有计划。");
		break;
	case 6:
		qm.sendNextPrev("城堡有条#p2161002#不知的密道。本应永守秘密…但现已无关紧要。我要…亲自与他对话。");
		break;
	case 7:
		qm.sendYesNo("我要当面见他。此前因魔物阻挠未能成行，但若有你相助…请随我同往接见室。能倚仗你吗？");
		break;
	case 8:
		// 修改：提示护送任务暂未修复，提供强制完成选项
		qm.sendAcceptDecline("非常抱歉，护送伊帕娅的任务暂未修复，且暂无后续任务。\r\n是否强制完成当前任务？\r\n(任务ID 3178)");
		break;
	case 9:
		if (mode == 1) {
			// 玩家选择“是”，强制完成任务
			qm.forceCompleteQuest();
			qm.sendOk("任务已强制完成。请继续你的冒险。\r\n(任务ID 3178)");
		} else {
			// 玩家选择“否”或取消
			qm.sendOk("好吧，等修复后再来吧。");
		}
		qm.dispose();
		break;
	}
}