// 狮子王城各个塔的传送脚本

function enter(pi) {
    // 1. 检查任务3164或3190是否已开始
    if (!pi.isQuestStarted(3164) && !pi.isQuestStarted(3190)) {
        pi.message("你不能进入这里。");
        return false;
    }

    // 2. 检查背包钥匙 4032858 或4032832
    if (!pi.hasItem(4032858) && !pi.hasItem(4032832)) {
        pi.message("如果你把钥匙弄丢了，可以放弃并重新接任务。");
        return false;
    }

    // 3. 检查地图211060201是否有人
    var bossMap = pi.getMap(211060201);
    if (bossMap.getCharacters().size() > 0) {
        pi.message("已经有人在挑战了");
        return false;
    }

    // 4. 检查队伍及队长权限（核心修改：完善无组队状态处理）
    var party = pi.getParty(); // 官方原生获取队伍
    if (party != null) {
        // 有队伍时：验证当前玩家是否为队长
        if (!pi.isLeader()) {
            pi.message("请让队长来进入。");
            return false;
        }
        // 检查所有队员是否在当前地图
        var members = party.getPartyMembers();
        if (members.size() != pi.getPlayer().getPartyMembersOnSameMap().size()) {
            pi.message("队伍里有人不在当前地图，无法开始挑战。");
            return false;
        }
    }
    // 无队伍时：跳过上述检查，直接允许单人进入

    // 5. 扣除钥匙（验证通过后再扣，避免无效扣钥匙）
    if(pi.hasItem(4032858)) {
    pi.gainItem(4032858, -1);}   //扣掉第一座塔的临时钥匙
    //else if(pi.hasItem(4032832)) {
    //pi.gainItem(4032832, -1);}  // 不扣掉第一座塔的钥匙
    //else {
    //	}

    // ======================
    // 核心修复：TD_MC_enterboss2 原版组队判断（无任何报错）
    // ======================
    if (party != null) {
        var Map1 = pi.getMap(211060201);
        Map1.resetFully();
        pi.warpParty(211060201, 1); // 组队传送全队
    } else {
        var Map2 = pi.getMap(211060201);
        Map2.resetFully();
        pi.warp(211060201, 1); // 单人传送自己
    }

    pi.playPortalSound();
    return true;
}