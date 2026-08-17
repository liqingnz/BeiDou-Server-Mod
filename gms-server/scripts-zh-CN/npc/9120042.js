var timeLimit = 1;

function start() {
    var playerMap = cm.getPlayer().getMapId();
    if (playerMap == 802000806 && (cm.getMap(802000806).countMonster(9400289) >0 || cm.getMap(802000806).countMonster(9400290) >0 || cm.getMap(802000806).countMonster(9400291) >0 || cm.getMap(802000806).countMonster(9400292) >0 || cm.getMap(802000806).countMonster(9400376) >0) ) {
        cm.sendYesNo("你还没有击败欧碧拉，现在就要#r离开#k吗？");
    } else if (playerMap == 802000806) {
        cm.sendYesNo("感谢你击败了欧碧拉，需要的话，我可以送你#r离开#k...");
    } else if (playerMap == 802000805) {
	cm.sendYesNo("首先祝贺你历尽千辛万苦总算来到了这里...\r\n前方就是最可怕的#b破坏天使欧碧拉#k的领地，请做好万全准备后再前往...");
    } else {
        cm.dispose(); // 其他地图直接关闭对话
    }
}

function action(mode, type, selection) {
    if (mode == 0) { // 用户点击 No
        cm.dispose();
    } else if (mode == 1) { // 用户点击 Yes
        var playerMap = cm.getPlayer().getMapId();
        if (playerMap == 802000806 && (cm.getMap(802000806).countMonster(9400289) >0 || cm.getMap(802000806).countMonster(9400290) >0 || cm.getMap(802000806).countMonster(9400291) >0 || cm.getMap(802000806).countMonster(9400292) >0) ) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000806) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000805) {
            //if (cm.getPlayerCount(802000806) <= 1) {//已经在副本中，就不用判断里面是否有人了
		var player = cm.getPlayer();
		var party = player.getParty();
		if (party == null) {
			cm.sendOk("你不在一个队伍中,请创建组队再进入挑战"); cm.dispose();
		} else {
			if (party.getLeaderId() != player.getId()) {
				cm.sendOk("队长才可以进入"); cm.dispose();
			} else {
				var members = party.getPartyMembers();
				if (members.size() != player.getPartyMembersOnSameMap().size()) {
					cm.sendOk("队伍里有人不在,无法进入"); cm.dispose();
				}
				var canGoIn = true;
				var cause;
				//for (var i = 0; i < members.size(); i++) {
					//var chr = members.get(i).getPlayer();
					//if (chr.getQuestStatus(50002) != 2) { //前置任务ID待确认
					//	canGoIn = false;
					//	cause = chr.getName() + "没完成前置任务,无法进入";
					//	break;
					//}
				if (canGoIn) { 
					var Map1 = cm.getMap(802000806);
					cm.warpParty(802000806, 0);
					return true;

	
				} else {
					cm.sendOk(cause); cm.dispose();
				}
			}
		}
	//} else {
	//	cm.sendOk("与BOSS的战斗已经开始了，所以你不能进入这个地方。");
	//	cm.dispose();
	//}
        }
    } else {
        cm.dispose(); // 其他情况（如超时）
    }
}
