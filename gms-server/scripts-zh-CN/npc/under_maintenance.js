/* 功能已关闭的 NPC 共用的占位脚本。

   自 LichKingMod 移植。原版的皇家月卡每日奖励分支未采纳：
   它调用 cm.redeemDailyRoyalReward()，属于已整批否决的皇家系统。
*/

function start() {
    cm.sendOk("功能维护中。。。");
    cm.dispose();
}

function action(mode, type, selection) {
    cm.dispose();
}
