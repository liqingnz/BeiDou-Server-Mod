// 狮子王城各个塔的传送脚本

function enter(pi) {
    // 1. 检查前置任务是否已完成
    if (!pi.isQuestCompleted(3190) && !pi.isQuestStarted(3166)) {
        pi.message("你不能继续前进。");
        return false;
	}

    pi.warp(211060300, 2);
    pi.playPortalSound();
    return true;
}