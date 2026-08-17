/*
    Departure countdown for the New Leaf City subway station -- shown the moment a player walks in.

    The map has no onUserEnter entry in its wz, so MapFactory falls back to the map id as the
    script name (see MapFactory#loadMapFromWz), which is why this file is named after the map.

    The clock reads the "nextTakeoff" timestamp that event/Subway.js publishes in scheduleNew()
    and takeoff(). Only lives under scripts/: there is no player-facing text here, and script
    lookup already falls back from scripts-<lang>/ to scripts/ per file.
*/
var eventName = "Subway";

function start(ms) {
    var em = ms.getClient().getEventManager(eventName);
    if (em == null) {
        return;
    }

    var next = em.getProperty("nextTakeoff");
    if (next == null) {
        return;
    }

    var remaining = parseInt(next) - Date.now();
    if (remaining <= 0) {
        return;
    }

    const PacketCreator = Java.type('org.gms.util.PacketCreator');
    ms.getPlayer().sendPacket(PacketCreator.getClock(Math.ceil(remaining / 1000)));
}