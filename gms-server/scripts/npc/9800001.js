/*
    Server-wide message board. Ported from LichKingMod.
    Message text and colour codes are stored separately; rendering happens server side in
    MessageBoardService. This script only handles the fee and the conversation.
 */

var status;
var costMillion = 50;           // posting fee, in units of 10k mesos
var COST_UNIT = 10000;
var text;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1 || mode == 0) {
        cm.dispose();
        return;
    }
    status++;

    if (status == 0) {
        var msg = "Would you like to leave a message?\r\n";
        msg += cm.getMessageBoard();
        msg += "\r\n______________________________________________";
        cm.sendYesNo(msg);
    } else if (status == 1) {
        cm.sendGetText("Enter your message. Posting costs #r" + costMillion + "0,000#k mesos:");
    } else if (status == 2) {
        text = cm.getText();
        if (text == null || text.length == 0) {
            cm.sendOk("The message cannot be empty.");
            cm.dispose();
            return;
        }
        cm.sendYesNo("Please confirm your message:\r\n" + text);
    } else if (status == 3) {
        var cost = costMillion * COST_UNIT;
        if (cm.getMeso() < cost) {
            cm.sendOk("You don't have enough mesos!");
            cm.dispose();
            return;
        }
        // Write first, charge after: the original treated every call as a success, so a DB
        // failure still cost the player the posting fee
        if (cm.addMessageBoardEntry(text)) {
            cm.gainMeso(-cost);
            cm.playerMessage(1, "Message posted.");
        } else {
            cm.sendOk("Could not post the message; it may exceed the 40 character limit.");
        }
        cm.dispose();
    } else {
        cm.dispose();
    }
}
