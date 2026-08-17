function enter(pi) {

    pi.playPortalSound();
    pi.getPlayer().saveLocation("MIRROR");  
    pi.warp(251010404, 1);
    return true;
}