// 狮子王城各个塔的传送脚本 第二座塔楼

function enter(pi) {
    // 1. 检查任务3191是否已开始
    if (!pi.isQuestStarted(3191)) {
        pi.message("你不能进入这里。");
        return false;
    }

    // 2. 检查背包钥匙 4032833
    if (!pi.hasItem(4032833)) {
        pi.message("如果你把钥匙弄丢了，可以放弃并重新接任务。");
        return false;
    }

    // 3. 检查地图211060401是否有人
    var bossMap = pi.getMap(211060401);
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

    //if(pi.hasItem(4032833)) {
    //pi.gainItem(4032833, -1);}  // 不扣掉第二座塔的钥匙


    // ======================
    // 核心修复：TD_MC_enterboss2 原版组队判断（无任何报错）
    // ======================
    if (party != null) {
        var Map1 = pi.getMap(211060401);
        Map1.resetFully();
        pi.warpParty(211060401, 1); // 组队传送全队
    } else {
        var Map2 = pi.getMap(211060401);
        Map2.resetFully();
        pi.warp(211060401, 1); // 单人传送自己
    }

    pi.playPortalSound();
    return true;
}