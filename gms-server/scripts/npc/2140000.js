/**
 * Temple Keeper (2140000) - Temple of Time (270000000)
 * Pays mesos to reset a completed quest so it can be run again.
 * Ported from LichKingMod scripts/npc/2140000.js.
 *
 * To offer another quest just append [displayName, questId] to questList; the reset goes through
 * cm.startQuestPro, which takes the start NPC from the quest data itself.
 */
var status = -1;
var questList = [["Balto's Request (Hoffka)", 2208]];
var selected = -1;
var cost = 10000000;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
        return;
    }
    status++;

    if (status == 0) {
        var questStr = "";
        for (var i = 0; i < questList.length; i++) {
            questStr += "\r\n#L" + i + "#" + questList[i][0] + "#l";
        }
        cm.sendSimple("I can pull a few strings with the Goddess of Time and put you back to before you finished a quest.\r\nQuests I can reset right now: #b" + questStr);
    } else if (status == 1) {
        selected = selection;
        if (!cm.isQuestCompleted(questList[selected][1])) {
            cm.sendOk("You have not completed that quest yet: #b" + questList[selected][0]);
            cm.dispose();
            return;
        }
        cm.sendYesNo("Reset the quest #b" + questList[selected][0] + "#k?\r\nThis costs #r10,000,000#k mesos.\r\n#i4031138# " + cost + " mesos");
    } else if (status == 2) {
        if (cm.getMeso() < cost) {
            cm.sendOk("You cannot even scrape that together for the Goddess of Time?");
            cm.dispose();
            return;
        }
        // The original took the mesos first and ignored the reset result, so a failed reset
        // (missing quest data and the like) still charged the player. Reset first, then charge.
        if (!cm.startQuestPro(questList[selected][1])) {
            cm.sendOk("The Goddess of Time is not in the mood today; that quest cannot be reset.");
            cm.dispose();
            return;
        }
        cm.gainMeso(-cost);
        cm.sendOk("Done. #b" + questList[selected][0] + "#k is back to the state it was in before you finished it.");
        cm.dispose();
    }
}
