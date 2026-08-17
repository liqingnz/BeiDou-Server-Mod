var timeLimit = 2;
function enter(pi) {

    var em = pi.getEventManager("ChowbossBattle"); //BOSS事件名称

    if (pi.getPlayerCount(300010420) <= 0) {//BOSS地图无人
        var player = pi.getPlayer();
        var party = player.getParty();
        if (party == null) {
            pi.playerMessage(5, "你不在一个队伍中,请创建组队后进入挑战"); return false;
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
                    if (chr.getQuestStatus(31222) != 2) {
                        canGoIn = false;
                        cause = chr.getName() + "没完成前置任务,无法进入";
                        break;
                    }
					//if (chr.getBossLog(0, "挑战查乌") >= timeLimit) {  //次数限制暂无法使用
					//	canGoIn = false;
					//	cause = chr.getName() + "玩家的挑战次数不足,无法进入";
					//	break;
					//}
                }
                if (canGoIn) {
                    // 核心修正：先获取合格队伍列表，检查非空再启动实例
                    var eli = em.getEligibleParty(party);
                    if (eli != null && eli.size() > 0) {
                        if (!em.startInstance(party, pi.getPlayer().getMap(), 1)) {
                            pi.playerMessage(5, "暂时无法开始战斗，可能频道已有其他队伍在挑战，或队伍条件不满足。");
                            return false;
                        }
                        pi.playPortalSound();
					//for (var i = 0; i < members.size(); i++) {   //次数限制暂无法使用
					//	members.get(i).setBossLog(0, "挑战查乌");
					//}
                        return true;
                    } else {
                        pi.playerMessage(5, "你的队伍不符合挑战条件，请检查任务或等级要求。");
                        return false;
                    }
                } else {
                    pi.playerMessage(5, cause); return false;
                }
            }
        }
    } else {
        pi.playerMessage(5, "与BOSS的战斗已经开始了，所以你不能进入这个地方。");
        return false;
    }
}