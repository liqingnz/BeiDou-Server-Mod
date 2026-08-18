/**
 * @author: LichKingNZ
 * @event: 克雷塞尔（Krexel）远征战
 *
 * 自 LichKingMod 移植。移植时的改动（依据见 docs/lichkingmod-port.md §11.5）：
 *  - 去掉 importPackage(Packages.server.expeditions) 与 var exped = MapleExpeditionType.KREXEL：
 *    前者是 HeavenMS 时代的包名（BeiDou 为 org.gms.server.expeditions），后者声明后
 *    在本文件里从未被使用。远征类型由入场门 portal/treeboss00.js 负责创建，
 *    与 ScargaBattle.js / npc/9270047.js 的分工一致。
 *  - eim.distributeBossCertificate 原文只传了 3 个参数 (mob, 2, 20)，而 BeiDou 的签名是
 *    (Monster, int itemId, short quantity, short minimumDmgPercent) 四个，补上道具 id 3100000。
 *
 * 奖池刻意留空：与 ScargaBattle 一致，通关不发箱子，产出走 BOSS 自身的 drop_data。
 */

var minPlayers = 2, maxPlayers = 12;
var minLevel = 50, maxLevel = 200;
var entryMap = 541020800;
var exitMap = 541020700;
var recruitMap = 541020700;
var clearMap = 541020700;

var minMapId = 541020800;
var maxMapId = 541020800;

var lobbyRange = [0, 0];

function init() {
}

function setLobbyRange() {
    return lobbyRange;
}

function setEventExclusives(eim) {
    var itemSet = [];
    eim.setExclusiveItems(itemSet);
}

function setEventRewards(eim) {
    var itemSet, itemQty, evLevel, expStages;

    evLevel = 1;    // 通关奖励
    itemSet = [];
    itemQty = [];
    eim.setEventRewards(evLevel, itemSet, itemQty);

    expStages = [];    // CLEAR 阶段的额外经验
    eim.setEventClearStageExp(expStages);
}

function getEligibleParty(party) {      // 从给定队伍里挑出允许参加本活动的成员
    var eligible = [];
    var hasLeader = false;

    if (party.size() > 0) {
        var partyList = party.toArray();

        for (var i = 0; i < party.size(); i++) {
            var ch = partyList[i];

            if (ch.isLeader()) hasLeader = true;
            eligible.push(ch);
        }
    }

    if (!(hasLeader && eligible.length >= minPlayers && eligible.length <= maxPlayers)) eligible = [];
    return eligible;
}

function setup(channel) {
    var eim = em.newInstance("Krexel" + channel);

    var level = 1;
    eim.getInstanceMap(entryMap).resetPQ(level);

    eim.startEventTimer(5 * 60000);
    setEventRewards(eim);
    setEventExclusives(eim);
    return eim;
}

function afterSetup(eim) {}

function respawnStages(eim) {
}

function playerEntry(eim, player) {
    var map = eim.getMapInstance(entryMap);
    player.changeMap(map, map.getPortal(0));
}

function scheduledTimeout(eim) {
    end(eim);
}

function playerUnregistered(eim, player) {
}

function playerExit(eim, player) {
    eim.unregisterPlayer(player);
    player.changeMap(exitMap, 0);
}

function playerLeft(eim, player) {
    if (!eim.isEventCleared()) {
        playerExit(eim, player);
    }
}

function changedMap(eim, player, mapid) {
    if (mapid < minMapId || mapid > maxMapId) {
        if (eim.isExpeditionTeamLackingNow(true, minPlayers, player)) {
            eim.unregisterPlayer(player);
            end(eim);
        } else {
            eim.unregisterPlayer(player);
        }
    }
}

function changedLeader(eim, leader) {
}

function playerDead(eim, player) {
}

function playerRevive(eim, player) { // 玩家在死亡提示框上按了确定
    if (eim.isExpeditionTeamLackingNow(true, minPlayers, player)) {
        eim.unregisterPlayer(player);
        end(eim);
    } else {
        eim.unregisterPlayer(player);
    }
}

function playerDisconnected(eim, player) {
    if (eim.isExpeditionTeamLackingNow(true, minPlayers, player)) {
        eim.unregisterPlayer(player);
        end(eim);
    } else {
        eim.unregisterPlayer(player);
    }
}

function leftParty(eim, player) {
}

function disbandParty(eim) {
}

function monsterValue(eim, mobId) {
    return 1;
}

function end(eim) {
    var party = eim.getPlayers();

    for (var i = 0; i < party.size(); i++) {
        playerExit(eim, party.get(i));
    }
    eim.dispose();
}

function giveRandomEventReward(eim, player) {
    eim.giveEventReward(player);
}

function clearPQ(eim) {
    eim.stopEventTimer();
    eim.setEventCleared();
}

function isFinalBoss(mob) {
    // 召唤链 9420520 → 9420521 → 9420522（已核 Mob.wz），9420522 是最后一环
    var mobid = mob.getId();
    return mobid == 9420522;
}

function monsterKilled(mob, eim) {
    if (isFinalBoss(mob)) {
        eim.showClearEffect();
        eim.clearPQ();
        eim.distributeBossCertificate(mob, 3100000, 2, 20);
    }
}

function allMonstersDead(eim) {
}

function cancelSchedule() {
}

function dispose(eim) {
}
