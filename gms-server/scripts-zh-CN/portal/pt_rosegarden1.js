// 狮子王城玫瑰花园的传送脚本：地图1

function enter(pi) {
    var player = pi.getPlayer();
    var eim = player.getEventInstance();

    if (eim == null) {
        pi.message("你不在副本中，无法使用此传送口。");
        return false;
    }

    // 检查玩家背包中玫瑰种子（4030036）的数量，需要5个
    var seedCount = player.getItemQuantity(4030036, true);
    if (seedCount < 5) {
        pi.message("你需要收集5个玫瑰种子才能继续前进。当前：" + seedCount + "/5个");
        return false;
    }

    // 满足条件，传送至 211080200 的 portal 1
    pi.gainItem(4030036, -5);
    pi.warp(211080200, 1);
    pi.playPortalSound();
    return true;
}