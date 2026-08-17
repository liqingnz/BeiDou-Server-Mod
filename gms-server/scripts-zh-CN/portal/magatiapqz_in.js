function enter(pi) {

    pi.playPortalSound();
    pi.getPlayer().saveLocation("MIRROR");  
    pi.warp(261000011, 1);
    return true;
}