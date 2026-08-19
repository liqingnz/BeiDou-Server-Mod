/* The @whodrops dialog: item picker plus paged dropper list.
 *
 * Why a script at all: some items have 800+ droppers, which no single dialog can hold, and
 * the client dialog has a fixed height with no scrollbar -- whatever does not fit is simply
 * never drawn (the server truncates nothing). Paging needs a click to come back to the
 * server, and npcTalk is fire-and-forget, so it cannot do it.
 *
 * Paging uses the client's own Prev/Next buttons (sendLastNextLevel -> sendNextPrev) rather
 * than fake #L options: the buttons sit in a fixed spot, cost no body lines, and need no
 * made-up large option ids to dodge item ids. NPCScriptManager.nextLevel dispatches on mode
 * -- 0 = prev, 1 = next, -1 = end chat. Which buttons appear is decided per page by picking
 * the matching send variant:
 *   both      -> sendLastNextLevel     next only -> sendNextLevel
 *   prev only -> sendLastLevel         neither   -> sendOkLevel
 * so a button never lies -- there is no "clicked Next and nothing happened".
 *
 * Split of duties: data, drop-rate scaling, portraits and the page size all live in
 * WhoDropsCommand (so does the i18n). This script only lays out one page, picks the send
 * variant and hands clicks back. Session state hangs off the character, so paging never
 * re-runs the drop_data query or the full-table fuzzy match.
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

// Picker paging options: large values so they cannot collide with the per-page indices 0..n-1
var PREV = 9000001;
var NEXT = 9000002;

var query = null;      // handle for this query; dies with the dialog (nothing kept server-side)
var choiceRows = [];   // [[itemId, itemName], ...] for the current picker page
var choiceCount = 0;   // total matches, not the size of the current page
var choicePage = 0;
var page = 0;

function start() {
    query = WhoDropsCommand.takeQuery(cm.getPlayer());
    choiceCount = WhoDropsCommand.getChoiceCount(query);
    if (choiceCount > 1) {
        choicePage = 0;
        showChoices();
        return;
    }
    // On a single match the command already loaded the droppers, go straight to the pages
    if (WhoDropsCommand.getPageCount(query) === 0) {
        cm.sendOk("Nothing to look up, please run #b@whodrops#k again.");
        finish();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    choiceRows = WhoDropsCommand.getChoices(query, choicePage);
    if (choiceRows.length === 0) {
        finish();
        return;
    }
    var totalPages = WhoDropsCommand.getChoicePageCount(query);

    var text = "Found #b" + choiceCount + "#k items. Which one do you want the droppers for?\r\n";
    for (var i = 0; i < choiceRows.length; i++) {
        text += "#L" + i + "##v" + choiceRows[i][0] + "##z" + choiceRows[i][0] + "##l\r\n";
    }
    // The picker is a sendSimple dialog: it only accepts #L options and has no native
    // prev/next buttons, so paging has to be spelled out. Large option values keep them
    // clear of the per-page indices above
    if (totalPages > 1) {
        text += "\r\n";
        if (choicePage > 0) {
            text += "#L" + PREV + "#<< Previous#l\r\n";
        }
        if (choicePage < totalPages - 1) {
            text += "#L" + NEXT + "#Next >>#l\r\n";
        }
        // The paging entries are #L links; plain text right after them shares their line,
        // so put a blank line in between
        text += "\r\nPage " + (choicePage + 1) + " of " + totalPages;
    }
    cm.sendNextSelectLevel("WhoDropsPick", text);
}


function levelWhoDropsPick(selection) {
    var sel = parseInt(selection);
    if (sel === PREV) {
        choicePage--;
        showChoices();
        return;
    }
    if (sel === NEXT) {
        choicePage++;
        showChoices();
        return;
    }
    if (sel < 0 || sel >= choiceRows.length) {
        finish();
        return;
    }
    if (!WhoDropsCommand.selectItem(query, choiceRows[sel][0])) {
        cm.sendOk("#rThat item has no drop data.#k");
        finish();
        return;
    }
    page = 0;
    showPage();
}


function showPage() {
    var text = WhoDropsCommand.renderPage(query, cm.getPlayer(), page);
    if (text === "") {
        finish();
        return;
    }

    var totalPages = WhoDropsCommand.getPageCount(query);
    if (totalPages > 1) {
        text += "\r\nPage " + (page + 1) + " of " + totalPages;
    }

    // Prev on page 0 goes back to the item picker -- only there if we came from one
    var hasPrev = page > 0 || choiceCount > 1;
    var hasNext = page < totalPages - 1;
    if (hasPrev && hasNext) {
        cm.sendLastNextLevel("WhoDropsPrev", "WhoDropsNext", text);
    } else if (hasNext) {
        cm.sendNextLevel("WhoDropsNext", text);
    } else if (hasPrev) {
        cm.sendLastLevel("WhoDropsPrev", text);
    } else {
        cm.sendOkLevel("WhoDropsDone", text);
    }
}

function levelWhoDropsPrev() {
    if (page > 0) {
        page--;
        showPage();
    } else {
        showChoices();
    }
}

function levelWhoDropsNext() {
    page++;
    showPage();
}

function levelWhoDropsDone() {
    finish();
}

/** query lives in this script's variable and dies with resetContext on dispose, so there is
 *  nothing to tell the server to clean up */
function finish() {
    cm.dispose();
}
