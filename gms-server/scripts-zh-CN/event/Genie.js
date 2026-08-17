/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc> 
					   Matthias Butz <matze@odinms.de>
					   Jan Christian Meyer <vimes@odinms.de>

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

var Orbis_btf;
var Genie_to_Orbis;
var Orbis_docked;
var Ariant_btf;
var Genie_to_Ariant;
var Ariant_docked;

//Time Setting is in millisecond
var closeTime = 4 * 60 * 1000; //The time to close the gate
var beginTime = 5 * 60 * 1000; //The time to begin the ride
var rideTime = 5 * 60 * 1000; //The time that require move to destination

function init() {
    closeTime = em.getTransportationTime(closeTime);
    beginTime = em.getTransportationTime(beginTime);
    rideTime = em.getTransportationTime(rideTime);

    Orbis_btf = em.getChannelServer().getMapFactory().getMap(200000152);
    Ariant_btf = em.getChannelServer().getMapFactory().getMap(260000110);
    Genie_to_Orbis = em.getChannelServer().getMapFactory().getMap(200090410);
    Genie_to_Ariant = em.getChannelServer().getMapFactory().getMap(200090400);
    Orbis_docked = em.getChannelServer().getMapFactory().getMap(200000151);
    Ariant_docked = em.getChannelServer().getMapFactory().getMap(260000100);
    Orbis_Station = em.getChannelServer().getMapFactory().getMap(200000100);

    scheduleNew();
}

function scheduleNew() {
    em.setProperty("docked", "true");
    Orbis_docked.setDocked(true);
    Ariant_docked.setDocked(true);

    em.setProperty("entry", "true");
    em.schedule("stopEntry", closeTime); //The time to close the gate
    em.schedule("takeoff", beginTime); //The time to begin the ride
    // 发布下一班发车时刻，好让港口地图（map/onUserEnter/<mapid>.js）在玩家一进场就能
    // 显示实时倒计时，而不是只在发车那一刻广播一次。
    em.setProperty("nextTakeoff", "" + (Date.now() + beginTime));
}

function stopEntry() {
    em.setProperty("entry", "false");
}

function takeoff() {
    Orbis_btf.warpEveryone(Genie_to_Ariant.getId());
    Ariant_btf.warpEveryone(Genie_to_Orbis.getId());

    // 给还留在站台上的人一个倒计时：下一班发车要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。同 Boats.js / Subway.js。
    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    Orbis_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    Ariant_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    Orbis_docked.broadcastShip(false);
    Ariant_docked.broadcastShip(false);

    em.setProperty("docked", "false");
    Orbis_docked.setDocked(false);
    Ariant_docked.setDocked(false);

    // 车已开走：下一班要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。
    em.setProperty("nextTakeoff", "" + (Date.now() + rideTime + beginTime));
    em.schedule("arrived", rideTime); //The time that require move to destination
}

function arrived() {
    Genie_to_Orbis.warpEveryone(Orbis_Station.getId(), 0);
    Genie_to_Ariant.warpEveryone(Ariant_docked.getId(), 1);
    Orbis_docked.broadcastShip(true);
    Ariant_docked.broadcastShip(true);

    scheduleNew();
}

function cancelSchedule() {}

// ---------- FILLER FUNCTIONS ----------

function dispose() {}

function setup(eim, leaderid) {}

function monsterValue(eim, mobid) {return 0;}

function disbandParty(eim, player) {}

function playerDisconnected(eim, player) {}

function playerEntry(eim, player) {}

function monsterKilled(mob, eim) {}

function scheduledTimeout(eim) {}

function afterSetup(eim) {}

function changedLeader(eim, leader) {}

function playerExit(eim, player) {}

function leftParty(eim, player) {}

function clearPQ(eim) {}

function allMonstersDead(eim) {}

function playerUnregistered(eim, player) {}

