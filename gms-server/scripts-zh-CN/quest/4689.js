/*
	NPC Name: 		Dida
	Description: 		Quest - Attack! Maverick Platoon of Robots
	适配: 北斗GMS083 任务脚本（增加队伍检查）
*/

var status = -1;

function start(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
        return;
    }
    if (mode == 0) {
        if (status == 1) {
            qm.sendNext("请抓紧时间准备！");
        }
        qm.dispose();
        return;
    }
    status++;

    if (status == 0) {
        qm.sendNext("我看到机器人军团来袭了！");
    } else if (status == 1) {
        qm.sendYesNo("那样很危险！如果你打算从敌人手中保护我们，建议你组队战斗...敌人来了，你现在想准备战斗吗？");
    } else if (status == 2) {
        // 队伍检查逻辑
        var party = qm.getParty();
        if (party == null) {
            qm.sendOk("必须创建组队，才能开始挑战。");
            qm.dispose();
            return;
        }
        if (!qm.isLeader()) {
            qm.sendOk("请让队长来与我交谈。");
            qm.dispose();
            return;
        }
        var members = party.getPartyMembers();
        if (members.size() != qm.getPlayer().getPartyMembersOnSameMap().size()) {
            qm.sendOk("队伍里有人不在当前地图，无法开始挑战。");
            qm.dispose();
            return;
        }
    if (qm.getPlayerCount(802000309) > 0) {//BOSS地图无人
        qm.sendOk("里面已经有人在战斗了。");
        qm.dispose();
        return;
    }

        // 所有条件满足，传送全队
        var Map1 = qm.getMap(802000309);
        Map1.resetFully();
        qm.warpParty(802000309, 0);
        qm.forceStartQuest();
        qm.dispose();
    }
}

function end(mode, type, selection) {
    qm.dispose();
}