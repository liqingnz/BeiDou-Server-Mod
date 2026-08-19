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

var query = null;   // 本次查询的句柄，随对话框关闭一起消失（服务端不留）
var choices = [];     // [[itemId, itemName], ...], index is the option number
var page = 0;

function start() {
    query = WhoDropsCommand.takeQuery(cm.getPlayer());
    choices = WhoDropsCommand.getChoices(query);
    if (choices.length > 1) {
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
    var text = "Found #b" + choices.length + "#k items. Which one do you want the droppers for?\r\n";
    for (var i = 0; i < choices.length; i++) {
        text += "#L" + i + "##v" + choices[i][0] + "##z" + choices[i][0] + "##l\r\n";
    }
    cm.sendNextSelectLevel("WhoDropsPick", text);
}

function levelWhoDropsPick(selection) {
    var sel = parseInt(selection);
    if (sel < 0 || sel >= choices.length) {
        finish();
        return;
    }
    if (!WhoDropsCommand.selectItem(query, choices[sel][0])) {
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
    var hasPrev = page > 0 || choices.length > 1;
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
