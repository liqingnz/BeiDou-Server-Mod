/* 克雷塞尔遗迹 II —— 唤醒克雷塞尔的反应堆（LK 远征制）。
 *
 * @author LichKingNZ，移植自 LichKingMod
 *
 * 【只生 9420520】Mob.wz 的召唤链是
 *     9420520（10 血的触发怪）--死亡--> 9420521（2.5 亿）--死亡--> 9420522（2.5 亿，最终）
 * LK 原版同时 spawnMonster(9420520) 与 spawnMonster(9420521)，而 9420520 会立刻死掉
 * 再召一个 9420521，等于多出一整条分身链。这里只生链首，其余交给 revive 数据。
 * event/KrexelBattle.js 的 isFinalBoss 判 9420522，与该链末端一致。
 *
 * 【状态守卫】反应堆有 0-6 共 7 个状态，每次敲击推进一级。沿用 ASM 版的
 * getState() == 5 守卫，避免反复敲击重复召唤（暗黑龙王的 2401000.js 用的是
 * getMonsterById(...) == null，同一个目的的另一种写法）。
 *
 * 【远征在这里才 start】入场门 portal/treeboss00.js 刻意让远征停在报名态，
 * 好让队友陆续进场；报名窗口在这一刻关闭。
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

    rm.mapMessage(5, "克雷塞尔被惊醒了！");
}

function hit() {
    act();
}
