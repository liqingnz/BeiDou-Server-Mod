// 狮子王城各个塔的传送脚本

function enter(pi) {
    // 1. 检查前置任务3194是否已完成
    if (!pi.isQuestCompleted(3194)) {
        pi.message("你不能继续前进。");
        return false;
	}

    pi.warp(211060820, 1);
    pi.playPortalSound();
    return true;
}