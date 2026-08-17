// 狮子王城玫瑰花园的传送脚本2
// 检查BOSS是否被击败；击败后可进入秘密庭院

function enter(pi) {
    var player = pi.getPlayer();
    var eim = player.getEventInstance();

    if (eim == null) {
        pi.message("你不在副本中，无法使用此传送口。");
        return false;
    }

    var checkMap = eim.getInstanceMap(211080300);

    // 直接统计 BOSS（ID: 8211004）在地图上的数量
    var bossCount = checkMap.countMonster(8211004);
    if (bossCount > 0) {
        pi.message("你需要击败城堡石头人王才能进入秘密庭院。");
        return false;
    }

    // BOSS 已被击败，传送至 211080400 的 portal 2
    pi.warp(211080400, 2);
    pi.playPortalSound();
    return true;
}