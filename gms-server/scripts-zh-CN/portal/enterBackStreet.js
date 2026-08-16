function enter(pi) {
    // 完成 21745「如果想见到武公」后永久放行。原先的「21744 进行中 && 21745 已完成」
    // 会在最要命的时候把人关在外面：21744 是进洞交给武公（2091007）的，而后续的
    // 21746「武公的考试」起止都在同一个 NPC、21747 又要等 21746 完成才开始——
    // 交掉 21744 到接上 21747 这段时间门是关的，一旦离开地图或掉线任务链就废了。
    if (pi.isQuestActive(21747) || pi.isQuestCompleted(21745)) {
        pi.playPortalSound();
        pi.warp(925040000, 0);
        return true;
    } else {
        pi.message("你无权访问该区域。");
        return false;
    }
}