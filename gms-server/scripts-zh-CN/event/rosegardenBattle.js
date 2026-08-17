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
 * @event: 玫瑰花园战斗副本
 * @fixed 修复事件地图小怪不刷新的问题：手动调用 respawn() + schedule 递归模拟自动刷新
 */

var isPq = true;
var minPlayers = 1, maxPlayers = 1;
var minLevel = 170, maxLevel = 200;
var entryMap = 211080100;    // 战斗地图
var exitMap = 211080000;     // 退出后返回地图
var recruitMap = 211080000;  // 远征队招募地图（NPC所在）
var clearMap = 211080000;     // 通关后返回地图

var minMapId = 211080100;
var maxMapId = 211080600;

var eventTime = 30;     // 30 minutes ，测试时用3分钟
const maxLobbies = 1;

const GameConfig = Java.type('org.gms.config.GameConfig');
minPlayers = GameConfig.getServerBoolean("use_enable_solo_expeditions") ? 1 : minPlayers;  //如果解除远征队人数限制，则最低人数改为1人
if(GameConfig.getServerBoolean("use_enable_party_level_limit_lift")) {  //如果解除远征队等级限制，则最低80级，最高200级。
    minLevel = 170 , maxLevel = 200;
}

// 六张战斗地图ID（用于定时刷新遍历）
var battleMaps = [211080100, 211080200, 211080300, 211080400, 211080500, 211080600];
// 刷新间隔（毫秒），10秒一次
var RESPAWN_INTERVAL = 10000;

function init() {
    setEventRequirements();
}

function getMaxLobbies() {
    return maxLobbies;
}

function setEventRequirements() {
    var reqStr = "";

    reqStr += "\r\n   组队人数: ";
    if (maxPlayers - minPlayers >= 1) {
        reqStr += minPlayers + " ~ " + maxPlayers;
    } else {
        reqStr += minPlayers;
    }

    reqStr += "\r\n   等级要求: ";
    if (maxLevel - minLevel >= 1) {
        reqStr += minLevel + " ~ " + maxLevel;
    } else {
        reqStr += minLevel;
    }

    reqStr += "\r\n   时间限制: ";
    reqStr += eventTime + " 分钟";

    em.setProperty("party", reqStr);
}

function setEventExclusives(eim) {
    var itemSet = [4030032, 4030033, 4030034, 4030036];   //设置组队任务道具，离开副本后自动清除
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
    var eim = em.newInstance("rosegarden" + lobbyid);
    eim.setProperty("level", level);
    eim.setProperty("boss", "0");
    // 停止标志位：事件结束时设为 true，让定时器停止递归
    eim.setProperty("respawnStopped", "false");

    // 遍历所有战斗地图，初始生成怪物（不调用 resetFully，会导致地图里原本会刷新的怪物无法刷新）
    for (var i = 0; i < battleMaps.length; i++) {
        var map = eim.getInstanceMap(battleMaps[i]);
        if (map != null) {
            // 触发一次刷新，让初始怪物按照 WZ 配置生成
            try { map.respawn(); } catch(e) {}
        }
    }

    // 启动定时刷新（用 schedule 递归调用实现循环）
    eim.schedule("respawnTick", RESPAWN_INTERVAL);

    // 在 211080100 地图生成 BOSS (8211004)
   // var bossMap = eim.getInstanceMap(211080300);
   // if (bossMap != null) {
     //   var LifeFactory = Java.type('org.gms.server.life.LifeFactory');
     //   var boss = LifeFactory.getMonster(8211004);
        //  不能使用重置地图指令（会导致小怪无法刷新），根据需要，可用指令刷新BOSS
        // bossMap.spawnMonsterOnGroundBelow(boss, new java.awt.Point(1618, -211));
        //  如果需要其他小怪，也可以添加
   // }

    // 启动计时器
    eim.startEventTimer(eventTime * 60000);
    setEventRewards(eim);
    setEventExclusives(eim);
    return eim;
}

// 新增：定时刷新回调（每10秒执行一次，补充已死亡的怪物）
function respawnTick(eim) {
    // 检查是否已停止（事件结束了就不再继续调度）
    if (eim.getProperty("respawnStopped") == "true") {
        return;
    }
    
    for (var i = 0; i < battleMaps.length; i++) {
        var map = eim.getInstanceMap(battleMaps[i]);
        if (map != null) {
            try { map.respawn(); } catch(e) {}
        }
    }
    
    // 递归调度自己，实现循环
    eim.schedule("respawnTick", RESPAWN_INTERVAL);
}

function afterSetup(eim) {
    //updateGateState(1);  // 无大门，无需处理
}

function respawnStages(eim) {}

function playerEntry(eim, player) {
    // 将玩家送至 entryMap
    var map = eim.getMapInstance(entryMap);
    player.changeMap(map, map.getPortal(1));
}

function scheduledTimeout(eim) {
    end(eim);
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
        if (eim.isExpeditionTeamLackingNow(true, minPlayers, player)) {
            eim.unregisterPlayer(player);
            end(eim);
        } else {
            eim.unregisterPlayer(player);
        }
    }
}

function changedLeader(eim, leader) {}

function playerDead(eim, player) {}

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

function leftParty(eim, player) {}

function disbandParty(eim) {}

function monsterValue(eim, mobId) {
    return 1;
}

function end(eim) {
    // 设置停止标志位，让定时器不再继续递归
    eim.setProperty("respawnStopped", "true");
    
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
    //eim.stopEventTimer(); //打败BOSS是否停止计时器
    eim.setEventCleared();
    //updateGateState(0); // 无大门，无需额外操作
}

function isBoss1(mob) {
    var mobid = mob.getId();
    return mobid == 8211004; //BOSS ID
}

function monsterKilled(mob, eim) {
    if (isBoss1(mob)) {
        eim.showClearEffect();
        //eim.clearPQ();   //玫瑰花园打败BOSS无需结束事件，而是等待超时
    }
}

function allMonstersDead(eim) {}

function cancelSchedule() {}

function updateGateState(newState) {} // 无大门机制，无需额外处理

function dispose(eim) {
    if (!eim.isEventCleared()) {
        //updateGateState(0); // 无大门，无需处理
    }
}