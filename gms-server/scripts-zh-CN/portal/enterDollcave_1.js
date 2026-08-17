function enter(pi) {
    if (pi.isQuestCompleted(20730) || pi.isQuestCompleted(21734)) {  // puppeteer defeated, newfound secret path
        pi.playPortalSound();
        pi.warp(105040201, 2);
        return true;
    } 
        if (!pi.canHold(5060001, 1)) {
        pi.playerMessage(5, "进入传送门前，请给背包的 特殊栏或者消耗栏 空出至少1个空格子。");
            return false;
        } else {
            if (!pi.haveItem(5060001)) {
                pi.gainItem(5060001, 1); //进入后赠送封印之锁，根据封印之锁来判断是否来过
            }
        
        pi.openNpc(1063011, "PupeteerPassword");
            return false;
        }
    
    
}