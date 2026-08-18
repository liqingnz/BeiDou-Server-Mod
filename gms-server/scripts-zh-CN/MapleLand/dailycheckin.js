/**MapleLand 脚本

每日签到：每人每天一次，发 8000 点券。
参考 BeiDouSpecial/每日签到.js，奖励由道具改成点券。

入口：MapleLand/help.js*/

// 与 BeiDouSpecial/每日签到.js 共用同一个键：两个脚本都还挂着，
// 共用键才能保证同一天只能领一次，不会从两个入口各领一遍。
var DAILY_KEY = "每日签到";
// 点券类型：1=点券，2=抵用券，4=信用券（见 CashShop 的 NX_CREDIT/MAPLE_POINT/NX_PREPAID）
var CASH_TYPE_NX_CREDIT = 1;
var CASH_REWARD = 8000;

var status = -1;

function start() {
    // 同 help.js：MapleLand/ 下的引擎会被复用，状态必须自己归零
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode !== 1) {
        cm.dispose();
        return;
    }

    status++;
    if (status !== 0) {
        cm.dispose();
        return;
    }

    // 第三个参数 true 走 CHARACTER_EXTEND_DAILY，跨过零点自动失效，不用自己算日期
    if (cm.getCharacterExtendValue(DAILY_KEY, true) == "TRUE") {
        cm.sendOk("您今天已经签到过了，请明天再来。");
        cm.dispose();
        return;
    }

    // 先记签到再发奖：反过来的话中间出岔子就成了白拿
    cm.saveOrUpdateCharacterExtendValue(DAILY_KEY, "TRUE", true);
    cm.getPlayer().getCashShop().gainCash(CASH_TYPE_NX_CREDIT, CASH_REWARD);

    cm.sendOk("签到成功，获得 #b" + CASH_REWARD + "#k 点券！\r\n\r\n"
        + "当前点券：#b" + cm.getPlayer().getCashShop().getCash(CASH_TYPE_NX_CREDIT) + "#k");
    cm.dispose();
}
