// 狮子王城第四座塔楼
// 北斗GMS083 专属进传送点后召唤怪物写法（无任何外部依赖）

function enter(pi) {
    // 1. 检查任务3194是否已开始
    if (!pi.isQuestStarted(3194)) {
        pi.message("你不能进入这里。");
        return false;
    }

    // 2. 检查背包钥匙 4032840（不扣除，仅检查）
    if (!pi.hasItem(4032840)) {
        pi.message("如果你把钥匙弄丢了，可以放弃并重新接任务。");
        return false;
    }

    // 3. 检查地图211060801是否有人
    var bossMap = pi.getMap(211060801);
    if (bossMap.getCharacters().size() > 0) {
        pi.message("已经有人在挑战了");
        return false;
    }

    // 4. 队伍&队长权限检查
    var party = pi.getParty();
    if (party != null) {
        if (!pi.isLeader()) {
            pi.message("请让队长来进入。");
            return false;
        }
        var members = party.getPartyMembers();
        if (members.size() != pi.getPlayer().getPartyMembersOnSameMap().size()) {
            pi.message("队伍里有人不在当前地图，无法开始挑战。");
            return false;
        }
    }

    // 5. 重置目标地图
    var battleMap = pi.getMap(211060801);
    battleMap.resetFully();

    // 6. 先传送玩家/队伍到目标地图（解决只能在当前地图生成怪物的限制）
    if (party != null) {
        pi.warpParty(211060801, 2);
    } else {
        pi.warp(211060801, 2);
    }

    // ======================
    // 北斗083 唯一正确3参数召唤方式（怪物ID, X, Y）
    // 传送后当前地图就是211060801，直接生成怪物
    // ======================
    // 召唤6只 8210006（分散X坐标）
    for (var i = 0; i < 6; i++) {
        pi.spawnMonster(8210006, 600 + i * 100, -150);
    }

    // 召唤6只 8210007
    for (var j = 0; j < 6; j++) {
        pi.spawnMonster(8210007, 600 + j * 100, -150);
    }

    // 召唤1只 8210013 
    pi.spawnMonster(8210013, 900, -150);

    pi.playPortalSound();
    return true;
}