var timeLimit = 2;
function enter(pi) {
	if (pi.getPlayerCount(541020800) <= 0) {//BOSS地图无人
		var player = pi.getPlayer();
		var party = player.getParty();
		if (party == null) {
			pi.playerMessage(5, "你不在一个队伍中,请组队进入挑战"); return false;
		} else {
			if (party.getLeaderId() != player.getId()) {
				pi.playerMessage(5, "队长才可以穿过传送门"); return false;
			} else {
				var members = party.getPartyMembers();
				if (members.size() != player.getPartyMembersOnSameMap().size()) {
					pi.playerMessage(5, "队伍里有人不在,无法穿过传送门"); return false;
				}
				var canGoIn = true;
				var cause;
				for (var i = 0; i < members.size(); i++) {
					var chr = members.get(i).getPlayer();
					if (chr.getQuestStatus(4528) != 2) {
						canGoIn = false;
						cause = chr.getName() + "没完成前置任务获得<扳手>,无法进入";
						break;
					}
					//if (chr.getBossLog(0, "挑战克雷塞尔") >= timeLimit) {  //次数限制暂无法使用
					//	canGoIn = false;
					//	cause = chr.getName() + "玩家的挑战次数不足,无法进入";
					//	break;
					//}
				}
				if (canGoIn) {
					var krexMap = pi.getMap(541020800);
					krexMap.resetFully();
					pi.playPortalSound();
					pi.warpParty(541020800, 0);
					members = player.getPartyMembersOnSameMap();
					//for (var i = 0; i < members.size(); i++) {   //次数限制暂无法使用
					//	members.get(i).setBossLog(0, "挑战克雷塞尔");
					//}
					return true;
				} else {
					pi.playerMessage(5, cause); return false;
				}
			}
		}
	} else {
		pi.playerMessage(5, "与BOSS的战斗已经开始了，所以你不能进入这个地方。");
		return false;
	}
	//if (pi.getPlayerCount(541020800) <= 0) { //  后面是speedrun相关脚本，有问题，会造成打完boss后无法正确计时、服务端卡住，关闭使用。
	//	var krexMap = pi.getMap(541020800);
	//	krexMap.resetFully();

	//	pi.playPortalSound();
	//	pi.warp(541020800, "sp");
	//	return true;
	//} else {
	//	if (pi.getMap(541020800).getSpeedRunStart() == 0 && (pi.getMonsterCount(541020800) <= 0 || pi.getMap(541020800).isDisconnected(pi.getPlayer().getId()))) {
	//		pi.playPortalSound();
	//		pi.warp(541020800, "sp");
	//		return true;
	//	} else {
	//		pi.playerMessage(5, "与BOSS的战斗已经开始了，所以你不能进入这个地方。");
	//		return false;
	//	}
	//}
}