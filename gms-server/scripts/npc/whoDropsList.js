/* The @whodrops dialog: item picker plus paged dropper list.
 *
 * Why a script at all: some items have 800+ droppers, which no single dialog can hold, and
 * the client dialog has a fixed height with no scrollbar -- whatever does not fit is simply
 * never drawn (the server truncates nothing). Paging needs a click to come back to the
 * server, and npcTalk is fire-and-forget, so it cannot do it.
 *
 * Split of duties: data, drop-rate scaling, portraits and the page size all live in
 * WhoDropsCommand (so does the i18n). This script only lays out one page, adds the paging
 * controls and hands clicks back. Session state hangs off the character, so paging never
 * re-runs the drop_data query or the full-table fuzzy match.
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

// Large numbers for paging/navigation so they cannot collide with item ids
var PREV = 9000001;
var NEXT = 9000002;
var BACK = 9000003;

var choices = [];     // [[itemId, itemName], ...], index is the option number
var page = 0;

function start() {
    choices = WhoDropsCommand.getChoices(cm.getPlayer());
    if (choices.length > 1) {
        showChoices();
        return;
    }
    // On a single match the command already loaded the droppers, go straight to the pages
    if (WhoDropsCommand.getPageCount(cm.getPlayer()) === 0) {
        cm.sendOk("Nothing to look up, please run #b@whodrops#k again.");
        finish();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    var text = "Found #b" + choices.length + "#k items. Which one do you want the droppers for?\r\n";
    for (var i = 0; i < choices.length; i++) {
        text += "#L" + i + "##v" + choices[i][0] + "##z" + choices[i][0] + "##l\r\n";
    }
    cm.sendNextSelectLevel("WhoDrops", text);
}

function showPage() {
    var body = WhoDropsCommand.renderPage(cm.getPlayer(), page);
    if (body === "") {
        finish();
        return;
    }

    var totalPages = WhoDropsCommand.getPageCount(cm.getPlayer());
    var text = body + "\r\n";
    if (page > 0) {
        text += "#L" + PREV + "#<< Previous#l\r\n";
    }
    if (page < totalPages - 1) {
        text += "#L" + NEXT + "#Next >>#l\r\n";
    }
    if (totalPages > 1) {
        text += "Page " + (page + 1) + " of " + totalPages + "\r\n";
    }
    if (choices.length > 1) {
        // Only offer "back" when we came from the picker
        text += "\r\n#L" + BACK + "#Back to the item list#l";
    }

    cm.sendNextSelectLevel("WhoDrops", text);
}

function levelWhoDrops(selection) {
    var sel = parseInt(selection);

    if (sel === PREV) {
        page--;
        showPage();
        return;
    }
    if (sel === NEXT) {
        page++;
        showPage();
        return;
    }
    if (sel === BACK) {
        showChoices();
        return;
    }
    // Anything else is an index into the item picker
    if (sel >= 0 && sel < choices.length) {
        if (!WhoDropsCommand.selectItem(cm.getPlayer(), choices[sel][0])) {
            cm.sendOk("#rThat item has no drop data.#k");
            finish();
            return;
        }
        page = 0;
        showPage();
        return;
    }
    finish();
}

/** Clean up: leaving the session behind keeps the whole dropper list in memory */
function finish() {
    WhoDropsCommand.endSession(cm.getPlayer());
    cm.dispose();
}
