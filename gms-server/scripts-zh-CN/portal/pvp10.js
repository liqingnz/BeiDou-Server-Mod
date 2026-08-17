function enter(pi) {

    pi.playPortalSound();
    pi.getPlayer().saveLocation("MIRROR");  
    pi.warp(701000210, 0);
    return true;
}