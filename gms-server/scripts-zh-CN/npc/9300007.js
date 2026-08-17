/*
	红鸾店 - 守卫兵 天长
*/

var status = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {

    if (status >= 0 && mode == 0) {
        cm.dispose();
        return;
    }
    if (mode == 1) {
        status++;
    } else {
        status--;
    }
    if (status == 0) {
        cm.sendSimple("这里是结婚的红鸾宫门口...但目前不承接婚庆业务。\r\n你想做什么？\r\n#l\r\n#b#L0#我想进去红鸾宫。\r\n#L4#我想进去孤星殿。#l");  // \r\n#L5#我想回家。
    } else if (status == 1) {
        if (selection == 0) { //我想进去红鸾宫
                cm.sendYesNo("哦……你想进去红鸾殿吗？结婚乃人生大事。");
        } else if (selection == 4) { //我想进去孤星殿。
            status = 11;
            cm.sendYesNo("你想去孤星殿吗？");
        } else if (selection == 5) { 
            status = 15;
            cm.sendNext("你想回去吗？你这次下去再次上来的时候还要付费。");
        }
    } else if (status == 2) {
        cm.sendNext("好！我现在送你到宫殿里。");
    } else if (status == 3) {
            cm.warp(700000100);
            cm.dispose();
    } else if (status == 11) {
        cm.sendNext("好！我现在送你到孤星殿。");
    } else if (status == 12) {
            cm.warp(700000101);
            cm.dispose();
    } else if (status == 16) {
        var map = cm.getPlayer().getSavedLocation("WORLDTOUR");
        if (map == -1) {
            map = 250000000;
        }
            cm.warp(map, 0);
            cm.dispose();
 } else {
        cm.dispose();
}
}
