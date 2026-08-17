function enter(pi) {
        var eim = pi.getEventInstance();
        var map = pi.getMap(802000801);
        var monster1 = map.countMonster(9400288);
    if (monster1 > 0) {
        pi.playerMessage(5, "※ 当前路径已被封锁！");
        return false;

    } else {
        pi.playPortalSound();
        pi.warp(802000802, 0);
        return true;
    }
}

