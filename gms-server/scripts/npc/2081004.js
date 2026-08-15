/**
 * Pam (2081004) - Leafre: Forest of the Priest (240000004)
 * Crafts condensed pet food out of three sets of ingredients.
 * Ported from LichKingMod scripts/npc/2081004.js.
 */
var status = -1;
var selected = -1;

var cost = 1000000;
var resultItemBase = 4032196;
var questItems = [[4000236, 4000237, 4000238], [4000239, 4000241, 4000242], [4000262, 4000263, 4000265]];
var quantity = 30;

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
        var selStr = "Hey there. Feel like making some condensed pet food?";
        for (var i = 0; i < questItems.length; i++) {
            selStr += "\r\n#L" + i + "# #i" + (resultItemBase + i) + "# #z" + (resultItemBase + i) + "##l";
        }
        cm.sendSimple(selStr);
    } else if (status == 1) {
        selected = selection;
        // The original had three if branches whose text was character-for-character identical; merged.
        var selStr = "Making #i" + (resultItemBase + selected) + "# #z" + (resultItemBase + selected) + "# takes:";
        for (var i = 0; i < questItems[selected].length; i++) {
            selStr += "\r\n#k#i" + questItems[selected][i] + "# #z" + questItems[selected][i] + "# x #b" + quantity;
        }
        selStr += "\r\n#i4031138# " + cost + " mesos";
        cm.sendYesNo(selStr);
    } else if (status == 2) {
        if (cm.getMeso() < cost) {
            cm.sendOk("Come back once you have been paid.");
            cm.dispose();
            return;
        }
        // The original checked the ingredients inside the loop body: as soon as the first ingredient
        // was in stock it fell into the else branch and handed out the product, so the other two
        // ingredients were never required. Check the whole set first, then consume.
        for (var i = 0; i < questItems[selected].length; i++) {
            if (!cm.haveItem(questItems[selected][i], quantity)) {
                cm.sendOk("Not enough materials. Take another look.");
                cm.dispose();
                return;
            }
        }
        if (!cm.canHold(resultItemBase + selected, 1)) {
            cm.sendOk("Your inventory is full.");
            cm.dispose();
            return;
        }
        for (var i = 0; i < questItems[selected].length; i++) {
            cm.gainItem(questItems[selected][i], -quantity);
        }
        cm.gainMeso(-cost);
        cm.gainItem(resultItemBase + selected, 1);
        cm.sendOk("Here you go!");
        cm.dispose();
    }
}
