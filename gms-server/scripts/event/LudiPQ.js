/*
    This file is part of the HeavenMS MapleStory Server
    Copyleft (L) 2016 - 2019 RonanLana

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation version 3 as published by
    the Free Software Foundation. You may not use, modify or distribute
    this program under any other version of the GNU Affero General Public
    License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * @author: Ronan
 * @event: Ludibrium PQ
 */

var isPq = true;
var minPlayers = 5, maxPlayers = 6;
var minLevel = 35, maxLevel = 50;
var entryMap = 922010100;
var exitMap = 922010000;
var recruitMap = 221024500;
var clearMap = 922011000;

var minMapId = 922010100;
var maxMapId = 922011100;

var eventTime = 45;     // 45 minutes

const maxLobbies = 1;

// Hoisted to module scope so setRewardList() renders exactly the pool that gets handed out.
var evLevel, itemSet, itemQty;
evLevel = 1;    //Rewards at clear PQ
itemSet = [2040602, 2040802, 2040002, 2040402, 2040505, 2040502, 2040601, 2044501, 2044701, 2044601, 2041019, 2041016, 2041022, 2041013, 2041007, 2043301, 2040301, 2040801, 2040001, 2040004, 2040504, 2040501, 2040513, 2043101, 2044201, 2044401, 2040701, 2044301, 2043801, 2040401, 2043701, 2040803, 2000003, 2000002, 2000004, 2000006, 2000005, 2022000, 2001001, 2001002, 2022003, 2001000, 2020014, 2020015, 4003000, 1102003, 1102004, 1102000, 1102002, 1102001, 1102011, 1102012, 1102013, 1102014, 1032011, 1032012, 1032013, 1032002, 1032008, 1032011, 2070011, 4010003, 4010000, 4010006, 4010002, 4010005, 4010004, 4010001, 4020001, 4020002, 4020008, 4020007, 4020003, 4020000, 4020004, 4020005, 4020006, 5050000, 1012015, 1122007, 1012183, 1022103, 1112414, 2043001, 2044001, 2044801, 2044901, 2041014, 2040534, 2040419, 2040323, 2041023, 2040517, 2040412, 2040031, 2040318, 2041020, 2040627, 2040705, 2040026, 2040302, 2040514, 2041017, 2070005];
itemQty = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 85, 85, 10, 60, 2, 20, 15, 15, 20, 15, 10, 5, 35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 10, 6, 10, 10, 10, 10, 10, 10, 4, 4, 10, 10, 10, 10, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

// Renders the clear-reward pool into a property the PQ NPC shows on demand.
function setRewardList() {
    var sendStr = "Clearing this party quest awards one of the following:\r\n\r\n";
    for (var i = 0; i < itemSet.length; i++) {
        sendStr += "#v" + itemSet[i] + "# #z" + itemSet[i] + "#";
        if (itemQty[i] > 1) {
            sendStr += " x " + itemQty[i];
        }
        sendStr += "\r\n";
    }
    em.setProperty("reward", sendStr);
}

function init() {
    setEventRequirements();
    setRewardList();
}

function getMaxLobbies() {
    return maxLobbies;
}

function setEventRequirements() {
    var reqStr = "";

    reqStr += "\r\n    Number of players: ";
    if (maxPlayers - minPlayers >= 1) {
        reqStr += minPlayers + " ~ " + maxPlayers;
    } else {
        reqStr += minPlayers;
    }

    reqStr += "\r\n    Level range: ";
    if (maxLevel - minLevel >= 1) {
        reqStr += minLevel + " ~ " + maxLevel;
    } else {
        reqStr += minLevel;
    }

    reqStr += "\r\n    Time limit: ";
    reqStr += eventTime + " minutes";

    em.setProperty("party", reqStr);
}

function setEventExclusives(eim) {
    var itemSet = [4001022, 4001023];
    eim.setExclusiveItems(itemSet);
}

function setEventRewards(eim) {
    var expStages;

    eim.setEventRewards(evLevel, itemSet, itemQty);

    expStages = [210, 2520, 2940, 3360, 3770, 0, 4620, 5040, 5950];    //bonus exp given on CLEAR stage signal
    eim.setEventClearStageExp(expStages);
}

function getEligibleParty(party) {      //selects, from the given party, the team that is allowed to attempt this event
    var eligible = [];
    var hasLeader = false;

    if (party.size() > 0) {
        var partyList = party.toArray();

        for (var i = 0; i < party.size(); i++) {
            var ch = partyList[i];

            if (ch.getMapId() == recruitMap && ch.getLevel() >= minLevel && ch.getLevel() <= maxLevel) {
                if (ch.isLeader()) {
                    hasLeader = true;
                }
                eligible.push(ch);
            }
        }
    }

    if (!(hasLeader && eligible.length >= minPlayers && eligible.length <= maxPlayers)) {
        eligible = [];
    }
    return Java.to(eligible, Java.type('org.gms.net.server.world.PartyCharacter[]'));
}

function setup(level, lobbyid) {
    var eim = em.newInstance("Ludi" + lobbyid);
    eim.setProperty("level", level);

    eim.setProperty("statusStg1", -1);
    eim.setProperty("statusStg2", -1);
    eim.setProperty("statusStg3", -1);
    eim.setProperty("statusStg4", -1);
    eim.setProperty("statusStg5", -1);
    eim.setProperty("statusStg6", -1);
    eim.setProperty("statusStg7", -1);
    eim.setProperty("statusStg8", -1);
    eim.setProperty("statusStg9", -1);

    eim.getInstanceMap(922010100).resetPQ(level);
    eim.getInstanceMap(922010200).resetPQ(level);
    eim.getInstanceMap(922010201).resetPQ(level);
    eim.getInstanceMap(922010300).resetPQ(level);
    eim.getInstanceMap(922010400).resetPQ(level);
    eim.getInstanceMap(922010401).resetPQ(level);
    eim.getInstanceMap(922010402).resetPQ(level);
    eim.getInstanceMap(922010403).resetPQ(level);
    eim.getInstanceMap(922010404).resetPQ(level);
    eim.getInstanceMap(922010405).resetPQ(level);
    eim.getInstanceMap(922010500).resetPQ(level);
    eim.getInstanceMap(922010500).resetPQ(level);
    eim.getInstanceMap(922010501).resetPQ(level);
    eim.getInstanceMap(922010502).resetPQ(level);
    eim.getInstanceMap(922010503).resetPQ(level);
    eim.getInstanceMap(922010504).resetPQ(level);
    eim.getInstanceMap(922010505).resetPQ(level);
    eim.getInstanceMap(922010506).resetPQ(level);
    eim.getInstanceMap(922010600).resetPQ(level);
    eim.getInstanceMap(922010700).resetPQ(level);
    eim.getInstanceMap(922010800).resetPQ(level);
    eim.getInstanceMap(922010900).resetPQ(level);
    eim.getInstanceMap(922011000).resetPQ(level);
    eim.getInstanceMap(922011100).resetPQ(level);

    respawnStages(eim);
    eim.startEventTimer(eventTime * 60000);
    setEventRewards(eim);
    setEventExclusives(eim);
    return eim;
}

function afterSetup(eim) {}

function respawnStages(eim) {}

function playerEntry(eim, player) {
    var map = eim.getMapInstance(entryMap);
    player.changeMap(map, map.getPortal(0));
}

function scheduledTimeout(eim) {
    if (eim.getProperty("9stageclear") != null) {
        var curStage = 922011000, toStage = 922011100;
        eim.warpEventTeam(curStage, toStage);
    } else {
        end(eim);
    }
}

function playerUnregistered(eim, player) {}

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
        if (eim.isEventTeamLackingNow(true, minPlayers, player)) {
            eim.unregisterPlayer(player);
            end(eim);
        } else {
            eim.unregisterPlayer(player);
        }
    }
}

function changedLeader(eim, leader) {
    var mapid = leader.getMapId();
    if (!eim.isEventCleared() && (mapid < minMapId || mapid > maxMapId)) {
        end(eim);
    }
}

function playerDead(eim, player) {}

function playerRevive(eim, player) { // player presses ok on the death pop up.
    if (eim.isEventTeamLackingNow(true, minPlayers, player)) {
        eim.unregisterPlayer(player);
        end(eim);
    } else {
        eim.unregisterPlayer(player);
    }
}

function playerDisconnected(eim, player) {
    if (eim.isEventTeamLackingNow(true, minPlayers, player)) {
        eim.unregisterPlayer(player);
        end(eim);
    } else {
        eim.unregisterPlayer(player);
    }
}

function leftParty(eim, player) {
    if (eim.isEventTeamLackingNow(false, minPlayers, player)) {
        end(eim);
    } else {
        playerLeft(eim, player);
    }
}

function disbandParty(eim) {
    if (!eim.isEventCleared()) {
        end(eim);
    }
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
    // Alterite shard
    eim.distributePQClearReward(4001198, 2);
    // Item 3100001 does not exist in BeiDou yet: Item.wz/Install/0310.img.xml is missing
    // entirely (manifest wz-missing, appendix D) and the name is absent from String.wz/Ins.img.xml.
    // Handing it out now yields a nameless, icon-less item, so keep it commented out.
    // eim.distributePQClearReward(3100001, 1);

    eim.startEventTimer(1 * 60000);
    eim.warpEventTeam(922011000);
}

function monsterKilled(mob, eim) {}

function allMonstersDead(eim) {}

function cancelSchedule() {}

function dispose(eim) {}
