var KC_Waiting;
var Subway_to_KC;
var KC_docked;
var NLC_Waiting;
var Subway_to_NLC;
var NLC_docked;

//Time Setting is in millisecond
var closeTime = 50 * 1000; //The time to close the gate
var beginTime = 1 * 60 * 1000; //The time to begin the ride
var rideTime = 4 * 60 * 1000; //The time that require move to destination

function init() {
    closeTime = em.getTransportationTime(closeTime);
    beginTime = em.getTransportationTime(beginTime);
    rideTime = em.getTransportationTime(rideTime);

    KC_Waiting = em.getChannelServer().getMapFactory().getMap(600010004);
    NLC_Waiting = em.getChannelServer().getMapFactory().getMap(600010002);
    Subway_to_KC = em.getChannelServer().getMapFactory().getMap(600010003);
    Subway_to_NLC = em.getChannelServer().getMapFactory().getMap(600010005);
    KC_docked = em.getChannelServer().getMapFactory().getMap(103000100);
    NLC_docked = em.getChannelServer().getMapFactory().getMap(600010001);
    scheduleNew();
}

function scheduleNew() {
    em.setProperty("docked", "true");
    em.setProperty("entry", "true");
    em.schedule("stopEntry", closeTime);
    em.schedule("takeoff", beginTime);
    // 发布下一班发车时刻，好让港口地图（map/onUserEnter/<mapid>.js）在玩家一进场就能
    // 显示实时倒计时，而不是只在发车那一刻广播一次。
    em.setProperty("nextTakeoff", "" + (Date.now() + beginTime));
}

function stopEntry() {
    em.setProperty("entry", "false");
}

function takeoff() {
    // 给还留在站台上的人一个倒计时：下一班发车要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。
    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    KC_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    NLC_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));

    em.setProperty("docked", "false");
    KC_Waiting.warpEveryone(Subway_to_NLC.getId());
    NLC_Waiting.warpEveryone(Subway_to_KC.getId());
    // 车已开走：下一班要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。
    em.setProperty("nextTakeoff", "" + (Date.now() + rideTime + beginTime));
    em.schedule("arrived", rideTime);
}

function arrived() {
    Subway_to_KC.warpEveryone(KC_docked.getId(), 0);
    Subway_to_NLC.warpEveryone(NLC_docked.getId(), 0);
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

