function enter(pi) {
    //pi.warp(910320000, 2); event not implemented

    pi.playPortalSound();
    pi.getPlayer().saveLocation("MIRROR");  
    pi.warp(221024500, 2);
    return true;
}