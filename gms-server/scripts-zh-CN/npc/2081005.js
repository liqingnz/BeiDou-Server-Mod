/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation version 3 as published by
    the Free Software Foundation. You may not use, modify or distribute
    this program under any other version of the GNU Affero General Public
    License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
//@Author Moogra, Ronan
//Fixed grammar, javascript syntax

var status = 0;

function isTransformed(ch) {
    const BuffStat = Java.type('org.gms.client.BuffStat');
    return ch.getBuffSource(BuffStat.MORPH) == 2210003;
}

function start() {
    if (!(isTransformed(cm.getPlayer()) || cm.haveItem(4001086))) {
        cm.sendOk("这是强大的霍恩尾巴龙的洞穴，他是利弗雷峡谷的至高统治者。只有那些被认为值得见他的人才能通过这里，外来者是不受欢迎的。滚开！");
        cm.dispose();
        return;
    }

    cm.sendAcceptDecline("欢迎来到生命之穴的入口！你想进去挑战#r暗黑龙王#k吗？");
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }

    if (cm.getLevel() > 99) {
        cm.warp(240050000, 0);
    } else {
        cm.sendOk("对不起，您需要至少达到100级或以上才能进入。");
    }
    cm.dispose();
}