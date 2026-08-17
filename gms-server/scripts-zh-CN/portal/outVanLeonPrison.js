// 狮子王城监狱钥匙传送脚本：

function enter(pi) {
    var player = pi.getPlayer();
    // 检查玩家背包中钥匙（4032860）的数量，需要1个
    var seedCount = player.getItemQuantity(4032860, true);
    if (seedCount < 1) {
        pi.message("你需要从箱子中获取监狱钥匙才能离开。");
        return false;
    }

    // 满足条件，传送至 211070100 的 portal 1
    pi.gainItem(4032860, -1);
    pi.playPortalSound();
    pi.warp(211070100, 1);
    return true;
}