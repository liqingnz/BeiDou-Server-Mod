/* The @whatdropsfrom dialog: monster picker plus paged drop list.
 *
 * Twin of MapleLand/whoDropsList.js (that one finds monsters by item, this one items by
 * monster); same structure, same reason: paging needs a click to come back to the server,
 * and npcTalk is fire-and-forget so it cannot do that.
 *
 * The two paging styles differ because the dialog types differ, not for lack of consistency:
 *   the monster picker goes through sendNextSelectLevel -> sendSimple, whose endBytes are
 *     empty: it only accepts #L options and draws no buttons, so paging has to be spelled
 *     out with #L, using large option values to dodge the per-page indices;
 *   the drop pages need no #L options, so they can use the client's own Prev/Next buttons
 *     (the sendLastNextLevel family) -- buttons cost no body lines, and body lines are the
 *     scarcest resource here.
 *
 * Data, drop-rate scaling, portraits, page size and i18n all live in WhatDropsFromCommand;
 * this script only lays out one page, picks the send variant and hands clicks back. The
 * query handle lives in a script variable and dies with resetContext on dispose.
 */

// Picker paging options: large values so they cannot collide with per-page indices
var PREV = 9000001;
var NEXT = 9000002;

var query = null;
var choiceRows = [];  // [[mobId, mobName], ...] for the current picker page
var choiceCount = 0;  // total matches, not the size of the current page
var choicePage = 0;
var page = 0;

function start() {
    query = WhatDropsFromCommand.takeQuery(cm.getPlayer());
    choiceCount = WhatDropsFromCommand.getChoiceCount(query);
    if (choiceCount > 1) {
        choicePage = 0;
        showChoices();
        return;
    }
    // On a single match the command already loaded the drops, go straight to the pages
    if (WhatDropsFromCommand.getPageCount(query) === 0) {
        cm.sendOk("Nothing to look up, please run #b@whatdropsfrom#k again.");
        cm.dispose();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    choiceRows = WhatDropsFromCommand.getChoices(query, choicePage);
    if (choiceRows.length === 0) {
        cm.dispose();
        return;
    }
    var totalPages = WhatDropsFromCommand.getChoicePageCount(query);

    var text = "Found #b" + choiceCount + "#k monsters. Which one do you want the drops for?\r\n";
    for (var i = 0; i < choiceRows.length; i++) {
        text += "#L" + i + "##b" + choiceRows[i][1] + "#k#l\r\n";
    }
    if (totalPages > 1) {
        text += "\r\n";
        if (choicePage > 0) {
            text += "#L" + PREV + "#<< Previous#l\r\n";
        }
        if (choicePage < totalPages - 1) {
            text += "#L" + NEXT + "#Next >>#l\r\n";
        }
        // The paging entries are #L links; plain text right after them shares their line, so
        // put a blank line in between
        text += "\r\nPage " + (choicePage + 1) + " of " + totalPages;
    }
    cm.sendNextSelectLevel("WhatDropsPick", text);
}

function levelWhatDropsPick(selection) {
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
        cm.dispose();
        return;
    }
    if (!WhatDropsFromCommand.selectMob(query, choiceRows[sel][0])) {
        cm.sendOk("#rThat monster drops nothing.#k");
        cm.dispose();
        return;
    }
    page = 0;
    showPage();
}

function showPage() {
    var text = WhatDropsFromCommand.renderPage(query, cm.getPlayer(), page);
    if (text === "") {
        cm.dispose();
        return;
    }

    var totalPages = WhatDropsFromCommand.getPageCount(query);
    if (totalPages > 1) {
        text += "\r\nPage " + (page + 1) + " of " + totalPages;
    }

    // Prev on page 0 goes back to the picker -- only there if we came from one
    var hasPrev = page > 0 || choiceCount > 1;
    var hasNext = page < totalPages - 1;
    if (hasPrev && hasNext) {
        cm.sendLastNextLevel("WhatDropsPrev", "WhatDropsNext", text);
    } else if (hasNext) {
        cm.sendNextLevel("WhatDropsNext", text);
    } else if (hasPrev) {
        cm.sendLastLevel("WhatDropsPrev", text);
    } else {
        cm.sendOkLevel("WhatDropsDone", text);
    }
}

function levelWhatDropsPrev() {
    if (page > 0) {
        page--;
        showPage();
    } else {
        showChoices();
    }
}

function levelWhatDropsNext() {
    page++;
    showPage();
}

function levelWhatDropsDone() {
    cm.dispose();
}
