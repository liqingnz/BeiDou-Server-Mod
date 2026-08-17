function start() {
    // 直接进入action流程
    action(1, 0, 0);
}

function action(mode, type, selection) {
    // 处理取消操作（关闭窗口或按“否”）
    if (mode == -1 || mode == 0) {
        cm.dispose();
        return;
    }

    // 检查任务状态
    if (cm.getQuestStatus(4689) == 2) {
        cm.sendOk("感谢你保护了我们！\r\n(现在返回卡姆那，向阿夕亚报告)");
        cm.dispose();
        return;
    }

    // 检查任务状态
    if (cm.getQuestStatus(4689) != 1) {
        cm.sendOk("请保护我们！");
        cm.dispose();
        return;
    }

    var party = cm.getParty();
    if (party == null) {
        cm.sendOk("必须创建组队，才能开始挑战。");
        cm.dispose();
        return;
    }

    if (!cm.isLeader()) {
        cm.sendOk("请让队长来与我交谈。");
        cm.dispose();
        return;
    }

    var members = party.getPartyMembers();
    // 检查所有队员是否都在当前地图
    if (members.size() != cm.getPlayer().getPartyMembersOnSameMap().size()) {
        cm.sendOk("队伍里有人不在当前地图，无法开始挑战。");
        cm.dispose();
        return;
    }

    if (cm.getPlayerCount(802000309) > 0) {//BOSS地图无人
        cm.sendOk("里面已经有人在战斗了。");
        cm.dispose();
        return;
    }

    // 所有条件满足，传送全队
    var Map1 = cm.getMap(802000309);
    Map1.resetFully();
    cm.warpParty(802000309, 0);
    cm.dispose();

}