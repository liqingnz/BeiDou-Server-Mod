/**
 * Bot check -- list of checkable players on the current map.
 * Opened by @detect with no arguments; the verdict and penalty live in
 * AbstractPlayerInteraction.detectPlayer.
 * Ported from LichKingMod scripts/npc/detectMap.js.
 */
var status = -1;
var candidateIds = [];

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
        // The original treated getMap().getAllPlayers() as an array (.length and [i]), but it is a
        // java.util.List: .length is always undefined, so the loop never ran and the list stayed empty.
        var players = cm.getMap().getAllPlayers();
        var selStr = "Players on this map you can check:";
        candidateIds = [];
        for (var i = 0; i < players.size(); i++) {
            var p = players.get(i);
            if (p.getId() == cm.getPlayer().getId()) {
                continue;
            }
            // The original used the index within the raw list as the option value; once yourself is
            // skipped those indices no longer line up and you end up checking somebody else.
            selStr += "\r\n#L" + candidateIds.length + "##b" + p.getName() + "#k - Lv " + p.getLevel() + "#l";
            candidateIds.push(p.getId());
        }
        if (candidateIds.length == 0) {
            cm.sendOk("There is nobody on this map to check.");
            cm.dispose();
            return;
        }
        cm.sendSimple(selStr);
    } else if (status == 1) {
        var target = cm.getMap().getCharacterById(candidateIds[selection]);
        if (target == null) {
            cm.sendOk("That player has already left this map.");
            cm.dispose();
            return;
        }
        candidateIds = [candidateIds[selection]];
        // The original concatenated the character object itself, printing an object address, not a name
        cm.sendYesNo("Run a check on #b" + target.getName() + "#k?");
    } else if (status == 2) {
        var target = cm.getMap().getCharacterById(candidateIds[0]);
        if (target == null) {
            cm.sendOk("That player has already left this map.");
            cm.dispose();
            return;
        }
        cm.detectPlayer(target);
        cm.dispose();
    }
}
