var timeLimit = 1;

function start() {
	cm.sendYesNo("你想挑战BOSS贝尔加莫特吗？\r\n #r（疑似易闪退，此战建议多开，图里有人时可重连）#k");
}

function action(mode, type, selection) {
    if (mode == 0) { // 用户点击 No
        cm.dispose();
    } else if (mode == 1) { // 用户点击 Yes
	if (cm.getPlayerCount(802000211) <= 1) {//BOSS地图无人，逆奥BOSS暂不能重连，因此允许玩家掉线后点NPC进入，改为0则不允许
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
					//if (chr.getQuestStatus(4682) != 2) { //前置任务ID待确认
					//	canGoIn = false;
					//	cause = chr.getName() + "没完成前置任务,无法进入";
					//	break;
					//}
					//if (chr.getBossLog(0, "挑战贝尔加莫特") >= timeLimit) {  //次数限制暂无法使用
					//	canGoIn = false;
					//	cause = chr.getName() + "玩家的挑战次数不足,无法进入";
					//	break;
					//}
				//}
				if (canGoIn &&cm.getPlayerCount(802000211) <=0) { //地图中没人的话就重置地图
					var Map1 = cm.getMap(802000211);
					Map1.resetFully();
					cm.warpParty(802000211, 0);
					members = player.getPartyMembersOnSameMap();
					//for (var i = 0; i < members.size(); i++) {   //记录队员挑战次数，但次数限制暂无法使用
					//	members.get(i).setBossLog(0, "挑战贝尔加莫特");
					//}
					return true;
                        		} else if (canGoIn &&cm.getPlayerCount(802000211) >0){ //地图中有人的话就不重置
                            		var Map1 = cm.getMap(802000211);
                           	 	cm.warpParty(802000211, 0);
                            		members = player.getPartyMembersOnSameMap();
                           	 	//for (var i = 0; i < members.size(); i++) {   //记录队员挑战次数，但次数限制暂无法使用
                           	 	//    members.get(i).setBossLog(0, "挑战贝尔加莫特");
                           	 	//}
                            		return true;	
				} else {
					cm.sendOk(cause); cm.dispose();
				}
			}
		}
	} else {
		cm.sendOk("与BOSS的战斗已经开始了，所以你不能进入这个地方。");
		cm.dispose();
	}
    } else {
        cm.dispose(); // 其他情况（如超时）
    }
}
