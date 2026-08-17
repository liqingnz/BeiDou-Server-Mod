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
    // Publish when the next departure is due, so the port maps (map/onUserEnter/<mapid>.js)
    // can greet arrivals with a live countdown instead of only broadcasting at takeoff.
    em.setProperty("nextTakeoff", "" + (Date.now() + beginTime));
}

function stopEntry() {
    em.setProperty("entry", "false");
}

function takeoff() {
    // Give whoever is left standing on the platform a clock counting down to the
    // next train: the next departure is one rideTime (getting back) plus one beginTime (docked) away.
    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    KC_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    NLC_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));

    em.setProperty("docked", "false");
    KC_Waiting.warpEveryone(Subway_to_NLC.getId());
    NLC_Waiting.warpEveryone(Subway_to_KC.getId());
    // The ride is away: the next departure is one rideTime (getting back) plus one beginTime (docked) out.
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

