/**
 * Bot check -- the question box shown to the target.
 * Opened on the target by AbstractPlayerInteraction.detectPlayer.
 * Ported from LichKingMod scripts/npc/detected.js.
 *
 * The verdict comes from cm.passDetection(), never from this script's own reading of the answer:
 * it returns false when the answer is right but the penalty already settled (answer packet and
 * timeout landing together), and in that case the penalty stands.
 */
var status = -1;
var a = Math.floor(Math.random() * 10);
var b = Math.floor(Math.random() * 10);
var answer = a + b;

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
        cm.sendGetText("Bot check in progress, please answer: #b" + a + " + " + b + " = ?");
    } else if (status == 1) {
        // The original compared cm.getText() to a number directly. getText() returns a java.lang.String,
        // which under GraalVM is a foreign object: loose comparison against a number does not coerce
        // the way plain JS would, so a correct answer was still counted as wrong.
        var input = parseInt(cm.getText(), 10);
        if (input !== answer) {
            cm.sendOk("Wrong answer.");
        } else if (cm.passDetection()) {
            // The original also handed out 1000 NX for passing. Dropped: being checked should not pay,
            // otherwise asking a GM to check you over and over becomes an NX faucet.
            cm.sendOk("You passed the check.");
        } else {
            // The answer was right, but the penalty had already settled. The original only called
            // cancel and ignored its result, which cannot stop a settlement that already started --
            // the player would see "passed" while still losing NX and going to jail.
            cm.sendOk("Correct, but you ran out of time.");
        }
        cm.dispose();
    }
}
