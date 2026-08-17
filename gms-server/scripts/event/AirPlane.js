var KC_bfd;
var Plane_to_CBD;
var CBD_docked;
var CBD_bfd;
var Plane_to_KC;
var KC_docked;

//Time Setting is in millisecond
var closeTime = 4 * 60 * 1000; //The time to close the gate
var beginTime = 5 * 60 * 1000; //The time to begin the ride
var rideTime = 1 * 60 * 1000; //The time that require move to destination

function init() {
    closeTime = em.getTransportationTime(closeTime);
    beginTime = em.getTransportationTime(beginTime);
    rideTime = em.getTransportationTime(rideTime);

    KC_bfd = em.getChannelServer().getMapFactory().getMap(540010100);
    CBD_bfd = em.getChannelServer().getMapFactory().getMap(540010001);
    Plane_to_CBD = em.getChannelServer().getMapFactory().getMap(540010101);
    Plane_to_KC = em.getChannelServer().getMapFactory().getMap(540010002);
    CBD_docked = em.getChannelServer().getMapFactory().getMap(540010000);
    KC_docked = em.getChannelServer().getMapFactory().getMap(103000000);
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
    em.setProperty("docked", "false");
    KC_bfd.warpEveryone(Plane_to_CBD.getId());
    CBD_bfd.warpEveryone(Plane_to_KC.getId());

    // Give whoever is left in the outer hall a clock counting down to the next departure:
    // the next departure is one rideTime (getting back) plus one beginTime (docked) away. Same as Boats.js / Subway.js.
    //
    // Only the Singapore side gets one, because the two ends are not symmetric:
    //   Singapore  ticket NPC 9270038 stands in CBD_docked (540010000, Changi Airport),
    //              a hall of its own -> people who miss the flight are standing there.
    //   Kerning    ticket NPC 9270041 stands in Kerning City itself (103000000), which is
    //              what KC_docked points at. A clock there would hit every player in town.
    // KC_bfd (540010100, Kerning Airport) is the *inner* boarding hall, not a waiting room:
    // its onUserEnter warpAheads latecomers straight onto the departed plane, so nobody ever
    // waits there for the next one. Same reason the other rides skip their own *_btf maps.
    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    CBD_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    // The ride is away: the next departure is one rideTime (getting back) plus one beginTime (docked) out.
    em.setProperty("nextTakeoff", "" + (Date.now() + rideTime + beginTime));
    em.schedule("arrived", rideTime); //The time that require move to destination
}

function arrived() {
    Plane_to_CBD.warpEveryone(CBD_docked.getId(), 0);
    Plane_to_KC.warpEveryone(KC_docked.getId(), 7);

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

