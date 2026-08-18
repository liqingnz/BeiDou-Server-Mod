/* 克雷塞尔入场门（LK 远征制）。
 *
 * @author LichKingNZ，移植自 LichKingMod
 *
 * 【前置：任务 4528】
 * 入场凭据是扳手 #4031942，它是乌鲁城任务链最后一环 4528「乌鲁城市能量」的完成奖励
 * （链路 4526 → 4527 → 4528，NPC 9270044 发放）。本脚本只查道具不查任务状态，
 * 这样 GM 直接发道具也能进；正常玩家的唯一来源仍是打通 4528。
 * 任务链与道具 4000434 已随 7a09cbbc0 合入 wz-zh-CN/Quest.wz 与 Item.wz/Etc/0400。
 *
 * 【与被替换掉的 ASM 版的区别】
 * ASM 版是组队制（em.startInstance(party, map, 1) + 事件管理器 TreebossBattle），
 * 入场门查 getQuestStatus(4528) == 2。用户 2026-08-18 决定改走 LK 的远征制。
 *
 * 【报名窗口】
 * 这里刻意用 em.startInstance(-1, chr, chr, channel) 这个 Character 重载，
 * 而不是更常见的 em.startInstance(expedition)——后者内部会立刻 exped.start()，
 * 报名窗口当场关闭，后来的队友就再也进不来了。远征的 start() 交给
 * reactor/5411001.js 在克雷塞尔被唤醒时调用。
 * 第四个参数在 Java 侧叫 difficulty，实际是原样透传给本事件脚本的 setup(channel)，
 * 传频道号是对的（EventManager.createInstance -> iv.invokeFunction("setup", args)）。
 */

const ExpeditionType = Java.type('org.gms.server.expeditions.ExpeditionType');

var exped = ExpeditionType.KREXEL;
var ENTRY_ITEM = 4031942;   // 扳手

function enter(pi) {
    var chr = pi.getPlayer();

    if (!pi.haveItem(ENTRY_ITEM, 1)) {
        chr.dropMessage(5, "你看不清入口的具体位置。");
        return false;
    }

    var em = pi.getEventManager("KrexelBattle");
    var expedition = pi.getExpedition(exped);

    if (expedition != null) {           // 已有远征队：报名中就加入，否则回绝
        if (!expedition.isRegistering()) {
            pi.dropMessage(5, "克雷塞尔已被惊醒，请稍后再来。");
            return false;
        }
        if (expedition.addMemberInt(chr) != 0) {
            pi.dropMessage(5, "抱歉，你无法进入此次远征！请改天再试。");
            return false;
        }
        var eim = em.getInstance("Krexel" + chr.getClient().getChannel());
        if (eim == null) {
            pi.dropMessage(5, "远征启动异常，请稍后再试。");
            return false;
        }
        eim.registerPlayer(chr, true);
        pi.playPortalSound();
        return true;
    }

    var res = pi.createExpedition(exped, true);     // 没有就由他开一队
    if (res > 0) {
        pi.dropMessage(5, "抱歉，你已达到此次远征的尝试配额！请改天再试。");
        return false;
    }
    if (res < 0) {
        pi.dropMessage(5, "远征启动异常，请稍后再试。");
        return false;
    }

    expedition = pi.getExpedition(exped);
    if (!em.startInstance(-1, chr, chr, chr.getClient().getChannel())) {
        pi.endExpedition(expedition);
        pi.dropMessage(5, "远征启动异常，请稍后再试。");
        return false;
    }
    em.getInstance("Krexel" + chr.getClient().getChannel()).registerExpedition(expedition);
    pi.playPortalSound();
    return true;
}
