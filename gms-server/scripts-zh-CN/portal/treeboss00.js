/* 克雷塞尔入场门。
 *
 * 【本文件是 ASM 版（组队制），但项目已决定改走 LK 的远征制】
 * 用户 2026-08-18 决定：克雷塞尔采用 LK 的远征实现（MapleExpeditionType.KREXEL +
 * event/KrexelBattle.js），本文件将被 LK 版 treeboss00.js 取代。移植尚未动手，
 * 待办与已查实的移植问题见 docs/lichkingmod-port.md「克雷塞尔线（LK 远征制）」一节。
 *
 * 【前置门的两种写法，以及为什么现在两种都走不通】
 * 本文件（ASM）查的是任务 4528 完成状态：chr.getQuestStatus(4528) != 2 即拒绝。
 * LK 版查的是道具：pi.haveItem(4031942, 1)（扳手）。
 *
 * 两者其实是同一条链——扳手 4031942 正是任务 4528 的完成奖励。但 BeiDou 的
 * Quest.wz 里没有乌鲁城任务链：4522、4523 有，4526/4527/4528/4529/4530 五个全缺
 * （Quest.wz 属 ASM 导入的红线共有文件，未合并），链上的道具 4000434 也缺。
 * 所以：
 *   - 走 ASM 版 → getQuestStatus(4528) 永远不是 2，任何人都进不来
 *   - 走 LK 版  → 道具 4031942 已于 072b51c9e 补齐（Item.wz/Etc/0403 + 两层
 *                 String.wz/Etc.img），但正规获取途径仍缺，只能 GM 发放
 * 要让入场门有正规来源，得补齐 4526-4530 这条任务链与道具 4000434。
 */
var timeLimit = 2;
function enter(pi) {

    var em = pi.getEventManager("TreebossBattle");

    if (pi.getPlayerCount(541020800) <= 0) {//BOSS地图无人
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
                    // 核心修正：先获取合格队伍列表，检查非空再启动实例
                    var eli = em.getEligibleParty(party);
                    if (eli != null && eli.size() > 0) {
                        if (!em.startInstance(party, pi.getPlayer().getMap(), 1)) {
                            pi.playerMessage(5, "暂时无法开始战斗，可能频道已有其他队伍在挑战，或队伍条件不满足。");
                            return false;
                        }
                        pi.playPortalSound();
					//for (var i = 0; i < members.size(); i++) {   //次数限制暂无法使用
					//	members.get(i).setBossLog(0, "挑战克雷塞尔");
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