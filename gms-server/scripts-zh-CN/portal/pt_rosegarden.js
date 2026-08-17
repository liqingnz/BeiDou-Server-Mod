// 狮子王城玫瑰花园的传送脚本

function enter(pi) {
    // 1. 检查前置任务3174是否已完成
    if (!pi.isQuestCompleted(3174)) {
        pi.message("你不能继续前进。");
        return false;
	}

    pi.warp(211080000, 2);
    pi.playPortalSound();
    return true;
}