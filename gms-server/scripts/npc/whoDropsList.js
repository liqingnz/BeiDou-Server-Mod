/* Item picker for @whodrops when the name search matches more than one item.
 *
 * A keyword like "Int Scroll" matches the helmet / overall / cape variants all at once;
 * dumping them all would be unreadable and would overflow the dialog. So the player picks
 * one first, then we look up that item's droppers. A single match skips this script
 * entirely -- WhoDropsCommand shows the result directly.
 *
 * The candidate list was already computed by the command and parked there (takeChoices
 * removes it on read), so the full-table fuzzy match is not run twice. Looking up the
 * droppers goes back through WhoDropsCommand.showDroppers: portraits, drop-rate scaling
 * and the entry cap must match the single-match path, and a copy here would drift.
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

var choices = [];   // [[itemId, itemName], ...], index is the option number

function start() {
    choices = WhoDropsCommand.takeChoices(cm.getPlayer());
    if (choices.length === 0) {
        cm.sendOk("Nothing to pick from, please run #b@whodrops#k again.");
        cm.dispose();
        return;
    }

    var text = "Found #b" + choices.length + "#k items. Which one do you want the droppers for?\r\n";
    for (var i = 0; i < choices.length; i++) {
        text += "#L" + i + "##v" + choices[i][0] + "##z" + choices[i][0] + "##l\r\n";
    }
    cm.sendNextSelectLevel("WhoDrops", text);
}

function levelWhoDrops(selection) {
    if (selection >= 0 && selection < choices.length) {
        // Same order as gotoList.js: act, then dispose. dispose only sends enableActions
        // to unlock the client, it does not close the dialog showDroppers just opened
        WhoDropsCommand.showDroppers(cm.getPlayer(), choices[selection][0]);
    }
    cm.dispose();
}
