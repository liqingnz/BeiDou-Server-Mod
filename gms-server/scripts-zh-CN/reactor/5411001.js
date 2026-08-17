/*
 * Ruin of Krexel II
 *  - Reactor to summon Krexel
 */

function act() {
    if (rm.getReactor().getState() == 5) {
        rm.changeMusic("Bgm09/TimeAttack");
        rm.spawnMonster(9420521);
        rm.mapMessage(5, "如你所愿，克雷塞尔出现了。");
    }
}
function hit(){
    act();
}