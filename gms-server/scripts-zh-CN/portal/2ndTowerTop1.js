// 狮子王城各个塔的传送脚本

function enter(pi) {
    // 1. 检查前置任务是否已完成
    if (!pi.isQuestStarted(3167) && !pi.isQuestCompleted(3191)) {
        pi.message("你不能继续前进。");
        return false;
	}

    pi.warp(211060410, 1);
    pi.playPortalSound();
    return true;
}