/**
 * @author: LichKingNZ
 * @event: Krexel Battle
 *
 * Ported from LichKingMod. Changes made during the port (see docs/lichkingmod-port.md §11.5):
 *  - Dropped importPackage(Packages.server.expeditions) and var exped = MapleExpeditionType.KREXEL:
 *    the former is the HeavenMS-era package name (BeiDou uses org.gms.server.expeditions),
 *    the latter is declared but never used here. The expedition is created by the
 *    entrance portal portal/treeboss00.js, same split as ScargaBattle.js / npc/9270047.js.
 *  - eim.distributeBossCertificate was called with 3 args (mob, 2, 20) but BeiDou signature is
 *    (Monster, int itemId, short quantity, short minimumDmgPercent); added item id 3100000.
 *
 * Reward pools are intentionally empty, same as ScargaBattle: no clear box, loot comes from the boss drop_data.
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

    evLevel = 1;    //Rewards at clear PQ
    itemSet = [];
    itemQty = [];
    eim.setEventRewards(evLevel, itemSet, itemQty);

    expStages = [];    //bonus exp given on CLEAR stage signal
    eim.setEventClearStageExp(expStages);
}

function getEligibleParty(party) {      //selects, from the given party, the team that is allowed to attempt this event
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

function playerRevive(eim, player) { // player presses ok on the death pop up.
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
    // summon chain 9420520 -> 9420521 -> 9420522 (verified against Mob.wz); 9420522 is the last one
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
