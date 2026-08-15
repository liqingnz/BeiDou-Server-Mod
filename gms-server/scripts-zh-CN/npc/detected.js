/**
 * 测谎 —— 被检测方看到的答题框。
 * 由 AbstractPlayerInteraction.detectPlayer 弹给目标。
 * 移植自 LichKingMod scripts/npc/detected.js。
 *
 * 判定结果以 cm.passDetection() 的返回值为准，不要在这里自己下结论：
 * 答案对但判罚已经先一步结算（答题包与倒计时同时到达）时它返回 false，此时处罚照旧。
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
        cm.sendGetText("检测中，请回答：#b" + a + " + " + b + " = ?");
    } else if (status == 1) {
        // 原实现直接拿 cm.getText() 和数字做 == 比较。getText() 回来的是 java.lang.String，
        // GraalVM 下它是外部对象，与数字的松散比较不会像纯 JS 那样做数值转换，答对也会判错。
        var input = parseInt(cm.getText(), 10);
        if (input !== answer) {
            cm.sendOk("回答错误。");
        } else if (cm.passDetection()) {
            // 原实现在这里额外发 1000 点券作为「通过奖励」。不跟：被检测本身不该有收益，
            // 否则找管理员反复检测自己就是一条刷点券的路子。
            cm.sendOk("你通过了检测。");
        } else {
            // 答案是对的，但判罚已经抢先结算了。原实现只调 cancel 且不看结果，
            // 拦不住已经开跑的结算，会出现「显示通过、点券照扣、监狱照关」。
            cm.sendOk("你答对了，但已经超过检测时限。");
        }
        cm.dispose();
    }
}
