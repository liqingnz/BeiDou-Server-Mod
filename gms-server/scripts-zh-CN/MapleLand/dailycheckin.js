/**MapleLand 脚本

每日签到：20 级起，每人每天一次，发 8000 点券；
贡献者（gmLevel >= 1）改发 16000 点券，无视等级直接拿三倍经验卡，另加 5 颗高级瞬移之石。
以上是常态。限时活动期间，非贡献者另按等级加发经验卡——见 EVENT_LEVEL_EXP_COUPON。
参考 BeiDouSpecial/每日签到.js，奖励由道具改成点券。

入口：MapleLand/help.js*/

// 与 BeiDouSpecial/每日签到.js 共用同一个键：两个脚本都还挂着，
// 共用键才能保证同一天只能领一次，不会从两个入口各领一遍。
var DAILY_KEY = "每日签到";
// 签到门槛：低于这个等级不给签。点券记在账号上，不设门槛等于给小号留了刷点券的口子
var MIN_LEVEL = 20;
// 点券类型：1=点券，2=抵用券，4=信用券（见 CashShop 的 NX_CREDIT/MAPLE_POINT/NX_PREPAID）
var CASH_TYPE_NX_CREDIT = 1;
var CASH_REWARD = 8000;

// 贡献者档：等级表见 npc/commands.js，1=贡献者，是本服的 VIP 门槛。
// 不能拿 Character.isGM() 当判据，那个是 gmLevel > 1，正好把贡献者漏掉。
var VIP_GM_LEVEL = 1;
// 替换而非叠加：达标的人拿 16000，不是 8000 + 16000
var VIP_CASH_REWARD = 16000;

// 双倍经验值卡一天权：nxcoupons 表里 rate=2、activeday=254、0-24，全周全天生效。
// 道具说明本身写的就是「二十四小时以后会消失」，跟这里发的时长正好对上。
var EXP_COUPON_2X = 5211046;
// 三倍经验值卡：nxcoupons 表里 rate=3、activeday=255、0-24。
// 不用 5211060，它的道具说明写死「有效时间为2小时」，跟这里发的 24 小时对不上。
var EXP_COUPON_3X = 5211052;
// ==== 限时活动开关 ====
// true：非贡献者按等级加发经验卡（见下面两条等级线）。
// 活动结束改成 false，签到即退回常态——普通玩家只发点券，贡献者档不受影响照常发。
// 注意：MapleLand/ 下的脚本引擎按 client 缓存、dispose 时不重置（见 help.js 顶部注释），
// 改完对已在线的玩家要等重登才生效，新登录的立刻生效。要即时收尾就先公告再改。
var EVENT_LEVEL_EXP_COUPON = true;
// 活动的两条等级线。「超过 60 / 110 级」按字面取严格大于，即 61 级起双倍、111 级起三倍；
// 若要改成「60 级及以上」，把 pickExpCoupon 里那两处比较换成 >= 即可。
var EXP_COUPON_2X_OVER_LEVEL = 60;
var EXP_COUPON_3X_OVER_LEVEL = 110;
// 倍率卡进现金栏即生效（Inventory.addItem 会触发 updateCouponRates），
// 有效期就是道具自身的 expiration，到点由 Character.expirationTask 清掉并回落倍率。
var EXP_COUPON_DURATION = 24 * 60 * 60 * 1000;

// 高级瞬移之石：UseCashItemHandler 每传送一次消耗一颗，所以 5 颗就是 5 次
var VIP_TELEPORT_ROCK = 5041000;
var VIP_TELEPORT_ROCK_COUNT = 5;

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

    // 等级门槛排在日签检查之前：没到 20 级本来就不该占掉当天的名额，
    // 顺带省一次 extend value 的库查询
    if (cm.getLevel() < MIN_LEVEL) {
        cm.sendOk("签到需要 #b" + MIN_LEVEL + "#k 级，你还差 #r"
            + (MIN_LEVEL - cm.getLevel()) + "#k 级，练起来再回来吧。");
        cm.dispose();
        return;
    }

    // 第三个参数 true 走 CHARACTER_EXTEND_DAILY，跨过零点自动失效，不用自己算日期
    if (cm.getCharacterExtendValue(DAILY_KEY, true) == "TRUE") {
        cm.sendOk("您今天已经签到过了，请明天再来。");
        cm.dispose();
        return;
    }

    var isVip = cm.getPlayer().gmLevel() >= VIP_GM_LEVEL;
    var expCoupon = pickExpCoupon(isVip, cm.getLevel());

    // 现金栏空间检查必须排在记签到之前：标记一落库当天就再也领不了，
    // 若先记后发而现金栏是满的，道具进不去，等于白丢一天。
    // 两样一起查而不是各查各的，免得先塞进经验卡、瞬移之石却没位置。
    var wantIds = [];
    var wantQty = [];
    if (expCoupon !== 0) {
        wantIds.push(expCoupon);
        wantQty.push(1);
    }
    if (isVip) {
        wantIds.push(VIP_TELEPORT_ROCK);
        wantQty.push(VIP_TELEPORT_ROCK_COUNT);
    }
    if (wantIds.length !== 0 && !cm.canHoldAll(wantIds, wantQty)) {
        cm.sendOk("您的现金栏空间不足，清出空位后再来签到。\r\n\r\n"
            + "#b今天的签到还没记上，清完可以直接再来。#k");
        cm.dispose();
        return;
    }

    // 先记签到再发奖：反过来的话中间出岔子就成了白拿
    cm.saveOrUpdateCharacterExtendValue(DAILY_KEY, "TRUE", true);

    var cashReward = isVip ? VIP_CASH_REWARD : CASH_REWARD;
    cm.getPlayer().getCashShop().gainCash(CASH_TYPE_NX_CREDIT, cashReward);

    var text = "签到成功，获得 #b" + cashReward + "#k 点券！\r\n\r\n";
    if (expCoupon !== 0) {
        // 5 参重载才带有效期，且 expires 是相对毫秒数而不是时间戳
        cm.gainItem(expCoupon, 1, false, true, EXP_COUPON_DURATION);
        // #i 出图标、#t 出名字，都交给客户端按 id 取，改 wz 时不用回来同步。
        // 排版沿用 BeiDouSpecial/在线奖励_nextlevel.js：图标 + 三空格 + 蓝字名 + 数量
        text += "#i" + expCoupon + "#   #b#t" + expCoupon + "##k ×1（"
            + (EXP_COUPON_DURATION / 3600000) + " 小时）\r\n";
    }
    if (isVip) {
        // 2 参重载的 expires 默认 -1，即永久；瞬移之石本来就不设期限
        cm.gainItem(VIP_TELEPORT_ROCK, VIP_TELEPORT_ROCK_COUNT);
        text += "#i" + VIP_TELEPORT_ROCK + "#   #b#t" + VIP_TELEPORT_ROCK + "##k ×"
            + VIP_TELEPORT_ROCK_COUNT + "\r\n";
    }
    if (wantIds.length !== 0) {
        text += "\r\n";
    }
    text += "当前点券：#b" + cm.getPlayer().getCashShop().getCash(CASH_TYPE_NX_CREDIT) + "#k";

    cm.sendOk(text);
    cm.dispose();
}

/**
 * 这次签到该发哪张经验卡，返回 0 表示不发。
 * 贡献者档是常态、无视等级也无视活动开关；等级分档只在活动期内对非贡献者生效。
 */
function pickExpCoupon(isVip, level) {
    // 先返回，别和下面的活动段搅在一起：关活动时贡献者的三倍卡不能跟着停
    if (isVip) {
        return EXP_COUPON_3X;
    }

    if (!EVENT_LEVEL_EXP_COUPON) {
        return 0;
    }
    if (level > EXP_COUPON_3X_OVER_LEVEL) {
        return EXP_COUPON_3X;
    }
    if (level > EXP_COUPON_2X_OVER_LEVEL) {
        return EXP_COUPON_2X;
    }
    return 0;
}
