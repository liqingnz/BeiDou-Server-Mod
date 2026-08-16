function enter(pi) {
    // Completing 21745 (How to Meet Mu Gong) grants access for good. The old
    // "21744 active && 21745 completed" locked the player out at the worst moment:
    // 21744 is handed in to Mu Gong (2091007) *inside* this area, and the follow-up
    // 21746 both starts and ends at that same NPC while 21747 only begins once 21746
    // is done -- so between handing in 21744 and starting 21747 the portal shut, and
    // leaving the map (or disconnecting) made the quest chain unfinishable.
    if (pi.isQuestActive(21747) || pi.isQuestCompleted(21745)) {
        pi.playPortalSound();
        pi.warp(925040000, 0);
        return true;
    } else {
        pi.message("You don't have permission to access this area.");
        return false;
    }
}