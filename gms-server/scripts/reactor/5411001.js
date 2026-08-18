/* Ruin of Krexel II - reactor that awakens Krexel (LK expedition mode).
 *
 * @author LichKingNZ, ported from LichKingMod
 *
 * [Spawns 9420520 only] The Mob.wz revive chain is
 *     9420520 (10 HP trigger) --dies--> 9420521 (250M) --dies--> 9420522 (250M, final)
 * LK's original spawned both 9420520 and 9420521; since 9420520 dies at once and revives
 * another 9420521, that produced a whole extra branch. Spawn the head of the chain only
 * and let the revive data do the rest. event/KrexelBattle.js checks 9420522 in
 * isFinalBoss, which matches the tail of this chain.
 *
 * [State guard] The reactor has 7 states (0-6) and each hit advances one step. The
 * getState() == 5 guard is kept from the ASM version to avoid re-summoning on repeated
 * hits (Horntail's 2401000.js uses getMonsterById(...) == null for the same purpose).
 *
 * [The expedition starts here] portal/treeboss00.js deliberately leaves the expedition
 * in its registering state so party members can trickle in; the window closes now.
 */

const ExpeditionType = Java.type('org.gms.server.expeditions.ExpeditionType');

var exped = ExpeditionType.KREXEL;

function act() {
    if (rm.getReactor().getState() != 5) {
        return;
    }

    rm.changeMusic("Bgm09/TimeAttack");
    rm.spawnMonster(9420520);

    var expedition = rm.getExpedition(exped);
    if (expedition != null) {
        expedition.start();
    }

    var eim = rm.getEventInstance();
    if (eim != null) {
        eim.restartEventTimer(60 * 60000);
    }

    rm.mapMessage(5, "Krexel has been awakened!");
}

function hit() {
    act();
}
