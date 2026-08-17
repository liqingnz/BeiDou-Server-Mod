var timeLimit = 1;

function start() {
    var playerMap = cm.getPlayer().getMapId();
    if (playerMap == 802000801) {
        cm.sendYesNo("你想#r离开#k这个地方？但是出去后无法返回战场...");
    } else if (playerMap == 802000800) {
        cm.sendYesNo("你想挑战BOSS#b布雷兹首脑#k和欧碧池...哦不，#b欧碧拉#k吗？");
    } else if (playerMap == 802000802) {
        cm.sendYesNo("这里的脉冲阵列很难突破...\r\n但是...支付100W金币，便能直接通过。");
    } else if (playerMap == 802000803 && cm.getMap(802000803).countMonster(9400296) >0 ) {
        cm.sendYesNo("你还没有击败布雷兹首脑，现在就要#r离开#k吗？");
    } else if (playerMap == 802000803) {
        cm.sendYesNo("你已经击败了布雷兹首脑，要前往下一阶段吗？");
    } else if (playerMap == 802000804) {
        cm.sendYesNo("（缺少脚本，直接跳过此阶段）");
    } else {
        cm.dispose(); // 其他地图直接关闭对话
    }
}

function action(mode, type, selection) {
    if (mode == 0) { // 用户点击 No
        cm.dispose();
    } else if (mode == 1) { // 用户点击 Yes
        var playerMap = cm.getPlayer().getMapId();
        if (playerMap == 802000801) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000802) {
            cm.gainMeso(-1000000);//扣除金币
            cm.warp(802000803, 1);
            cm.dispose();
        } else if (playerMap == 802000803 && cm.getMap(802000803).countMonster(9400296) >0) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000803) {
            cm.warp(802000804, 0);
            cm.dispose();
        } else if (playerMap == 802000804) {
            cm.warp(802000805, 0);
            cm.dispose();
        } else if (playerMap == 802000800) {
            if (cm.getPlayerCount(802000801) <= 1 && cm.getPlayerCount(802000802) <=1 && cm.getPlayerCount(802000803) <=1  && cm.getPlayerCount(802000804) <=1  && cm.getPlayerCount(802000805) <=1  && cm.getPlayerCount(802000806) <=1) {//BOSS地图无人，逆奥BOSS暂不能重连，因此允许玩家掉线后点NPC进入，六个图的人数判断都改为0则不允许
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
                            //    canGoIn = false;
                            //    cause = chr.getName() + "没完成前置任务,无法进入";
                            //    break;
                            //}
                            //if (chr.getBossLog(0, "挑战欧碧拉") >= timeLimit) {  //次数限制暂无法使用
                            //    canGoIn = false;
                            //    cause = chr.getName() + "玩家的挑战次数不足,无法进入";
                            //    break;
                            //}
                        //}
                        if (canGoIn && cm.getPlayerCount(802000801) <=0 && cm.getPlayerCount(802000802) <=0 && cm.getPlayerCount(802000803) <=0  && cm.getPlayerCount(802000804) <=0  && cm.getPlayerCount(802000805) <=0  && cm.getPlayerCount(802000806) <=0 ) { //地图中没人的话就重置地图
                            var Map1 = cm.getMap(802000801);  //皇家护卫
                            var Map2 = cm.getMap(802000802);  
                            var Map3 = cm.getMap(802000803);  //布雷兹首脑
                            var Map4 = cm.getMap(802000804);  
                            var Map5 = cm.getMap(802000805);  
                            var Map6 = cm.getMap(802000806);  //欧碧拉
                            Map1.resetFully();
                            Map2.resetFully();
                            Map3.resetFully();
                            Map4.resetFully();
                            Map5.resetFully();
                            Map6.resetFully();
                            cm.warpParty(802000801, 0);
                            members = player.getPartyMembersOnSameMap();
                            //for (var i = 0; i < members.size(); i++) {   //记录队员挑战次数，但次数限制暂无法使用
                            //    members.get(i).setBossLog(0, "挑战欧碧拉");
                            //}
                            return true;
                        } else if (canGoIn && (cm.getPlayerCount(802000801) >0 || cm.getPlayerCount(802000802) >0 || cm.getPlayerCount(802000803) >0 || cm.getPlayerCount(802000804) >0 || cm.getPlayerCount(802000805) >0 || cm.getPlayerCount(802000806) >0 ) ){ //地图中有人的话就不重置
                            var Map1 = cm.getMap(802000801);
                            cm.warpParty(802000801, 0);
                            members = player.getPartyMembersOnSameMap();
                            //for (var i = 0; i < members.size(); i++) {   //记录队员挑战次数，但次数限制暂无法使用
                            //    members.get(i).setBossLog(0, "挑战欧碧拉");
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
        }
    } else {
        cm.dispose(); // 其他情况（如超时）
    }
}
