/* Krexel entrance portal (LK expedition mode).
 *
 * @author LichKingNZ, ported from LichKingMod
 *
 * [Prerequisite: quest 4528]
 * The entry token is the Wrench #4031942, awarded by 4528 "Ulu City Energy", the last
 * step of the Ulu City chain (4526 -> 4527 -> 4528, handed out by NPC 9270044).
 * This script checks the item only, not the quest state, so a GM-granted item works too;
 * for normal players the only source is still clearing 4528.
 * The quest chain and item 4000434 landed in wz-zh-CN/Quest.wz and Item.wz/Etc/0400
 * with commit 7a09cbbc0.
 *
 * [Difference from the ASM version this replaces]
 * ASM used a party-based flow (em.startInstance(party, map, 1) with event manager
 * "TreebossBattle") and gated on getQuestStatus(4528) == 2. The project decided on
 * 2026-08-18 to use LK's expedition flow instead.
 *
 * [Registration window]
 * The Character overload em.startInstance(-1, chr, chr, channel) is used deliberately
 * instead of the more common em.startInstance(expedition): the latter calls
 * exped.start() immediately, which closes registration on the spot so no one else can
 * join. Starting the expedition is left to reactor/5411001.js, when Krexel is awakened.
 * The fourth argument is named "difficulty" on the Java side but is passed straight
 * through to this event script's setup(channel), so handing it the channel is correct
 * (EventManager.createInstance -> iv.invokeFunction("setup", args)).
 */

const ExpeditionType = Java.type('org.gms.server.expeditions.ExpeditionType');

var exped = ExpeditionType.KREXEL;
var ENTRY_ITEM = 4031942;   // Wrench

function enter(pi) {
    var chr = pi.getPlayer();

    if (!pi.haveItem(ENTRY_ITEM, 1)) {
        chr.dropMessage(5, "You cannot make out where the entrance is.");
        return false;
    }

    var em = pi.getEventManager("KrexelBattle");
    var expedition = pi.getExpedition(exped);

    if (expedition != null) {           // expedition exists: join while registering, else refuse
        if (!expedition.isRegistering()) {
            pi.dropMessage(5, "Krexel has already been awakened. Please come back later.");
            return false;
        }
        if (expedition.addMemberInt(chr) != 0) {
            pi.dropMessage(5, "Sorry, you cannot join this expedition. Please try another day.");
            return false;
        }
        var eim = em.getInstance("Krexel" + chr.getClient().getChannel());
        if (eim == null) {
            pi.dropMessage(5, "Could not start the expedition. Please try again later.");
            return false;
        }
        eim.registerPlayer(chr, true);
        pi.playPortalSound();
        return true;
    }

    var res = pi.createExpedition(exped, true);     // none yet: let this player form one
    if (res > 0) {
        pi.dropMessage(5, "Sorry, you have used up your attempts for this expedition. Please try another day.");
        return false;
    }
    if (res < 0) {
        pi.dropMessage(5, "Could not start the expedition. Please try again later.");
        return false;
    }

    expedition = pi.getExpedition(exped);
    if (!em.startInstance(-1, chr, chr, chr.getClient().getChannel())) {
        pi.endExpedition(expedition);
        pi.dropMessage(5, "Could not start the expedition. Please try again later.");
        return false;
    }
    em.getInstance("Krexel" + chr.getClient().getChannel()).registerExpedition(expedition);
    pi.playPortalSound();
    return true;
}
