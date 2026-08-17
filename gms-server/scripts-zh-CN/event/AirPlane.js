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
    // 发布下一班发车时刻，好让港口地图（map/onUserEnter/<mapid>.js）在玩家一进场就能
    // 显示实时倒计时，而不是只在发车那一刻广播一次。
    em.setProperty("nextTakeoff", "" + (Date.now() + beginTime));
}

function stopEntry() {
    em.setProperty("entry", "false");
}

function takeoff() {
    em.setProperty("docked", "false");
    KC_bfd.warpEveryone(Plane_to_CBD.getId());
    CBD_bfd.warpEveryone(Plane_to_KC.getId());

    // 给还留在外层大厅的人一个倒计时：下一班发车要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。同 Boats.js / Subway.js。
    //
    // 只挂新加坡侧，因为两端结构不对称：
    //   新加坡    售票员 9270038 站在 CBD_docked（540010000 樟宜机场），是独立的一张图，
    //             没赶上飞机的人就站在那儿。
    //   废弃都市  售票员 9270041 站在废弃都市主城本身（103000000），也就是 KC_docked 指的图。
    //             往那儿挂钟会打到全城玩家。
    // KC_bfd（540010100 废弃都市机场）是*内层*登机厅而非候机室：它的 onUserEnter 会把迟到的人
    // warpAhead 直接送上已起飞的飞机，没人会在那儿等下一班。其余载具跳过各自的 *_btf 同理。
    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    CBD_docked.broadcastMessage(PacketCreator.getClock((rideTime + beginTime) / 1000));
    // 车已开走：下一班要等一个 rideTime（开回来）加一个 beginTime（靠站等待）。
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

