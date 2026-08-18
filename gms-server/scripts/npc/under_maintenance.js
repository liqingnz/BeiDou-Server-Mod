/* Placeholder shown by NPCs whose feature is switched off.

   Ported from LichKingMod. The daily royal-card reward branch of the original was dropped:
   it calls cm.redeemDailyRoyalReward(), part of the royal system that was rejected as a whole.
*/

function start() {
    cm.sendOk("This feature is under maintenance...");
    cm.dispose();
}

function action(mode, type, selection) {
    cm.dispose();
}
