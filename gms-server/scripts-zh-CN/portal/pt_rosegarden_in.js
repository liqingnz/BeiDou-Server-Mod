// 狮子王城玫瑰花园的传送脚本
// 检查前置任务、等级、单人状态，并确保所有战斗地图均为空

function enter(pi) {
    var em = pi.getEventManager("rosegardenBattle");
    var player = pi.getPlayer();

    // 1. 检查等级是否达到170
    if (player.getLevel() < 170) {
        pi.message("你的等级不足170，不能继续前进。");
        return false;
    }

    // 2. 必须为单人（不可组队）
    var party = player.getParty();
    if (party != null) {
        pi.message("只允许单人进入玫瑰花园。");
        return false;
    }

    // 3. 检查六张战斗地图是否全部为空
    var mapIds = [211080100, 211080200, 211080300, 211080400, 211080500, 211080600];
    for (var i = 0; i < mapIds.length; i++) {
        if (pi.getPlayerCount(mapIds[i]) > 0) {
            pi.message("有其它人正在此频道挑战玫瑰花园。");
            return false;
        }
    }

    // 4. 所有地图为空，启动事件实例（传送将由事件脚本的 playerEntry 处理）
    if (em.startInstance(player)) {
        pi.playPortalSound();   // 播放音效以示成功
        return true;
    } else {
        pi.message("目前无法进入，可能是里面有人了。");
        return false;
    }
}