function enter(pi) {

    pi.playPortalSound();
    pi.getPlayer().saveLocation("MIRROR");  
    pi.warp(261000021, 4);
    return true;
}