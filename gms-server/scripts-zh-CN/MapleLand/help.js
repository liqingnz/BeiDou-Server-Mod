/**MapleLand 脚本

帮助脚本：关闭拍卖行界面后弹出的常用功能入口。
菜单结构参考 npc/9900001.js（脚本中心），只留常用的三项，
大GM及以上额外多一条通往完整脚本中心的入口。

入口：org.gms.net.server.channel.handlers.EnterMTSHandler*/

// 本目录脚本挂在枫叶管理员名下，与 NpcId.MAPLE_ADMINISTRATOR 一致
var NPC_MAPLE_ADMINISTRATOR = 9010000;
// 完整脚本中心的宿主 NPC，与 NpcId.BEI_DOU_NPC_BASE 一致
var NPC_SCRIPT_CENTER = 9900001;
// 看得到「脚本中心」入口所需的 GM 等级，4 = 大GM（等级表见 npc/commands.js）
var SCRIPT_CENTER_GM_LEVEL = 4;
// 自由市场地图与入口传送门，与 portal/market01.js 保持一致
var FREE_MARKET_MAP = 910000000;
var FREE_MARKET_PORTAL = "out00";

var Title = "\t\t\t\t\t#e欢迎来到#rMapleLand#k帮助中心#n\t\t\t\t\r\n";

var status = -1;

function start() {
    // MapleLand/ 下的脚本 dispose 时不会被重置上下文（resetContext 只按 npc/ 前缀拼缓存 key），
    // 引擎会被复用，所以每次进来都要自己把 status 归零，否则第二次打开就直接落到 doSelect。
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode === 1) {
        status++;
    } else if (mode === -1) {
        status--;
    } else {
        cm.dispose();
        return;
    }

    if (status === 0) {
        let text = Title;
        text += "当前点券：" + cm.getPlayer().getCashShop().getCash(1) + "\r\n";
        text += "当前金币：" + cm.getPlayer().getMeso() + "\r\n";
        text += " \r\n\r\n";
        text += "#L0#传送自由#l \t #L1#每日签到#l \t #L2#爆率一览#l\r\n";
        if (cm.getPlayer().gmLevel() >= SCRIPT_CENTER_GM_LEVEL) {
            text += "\r\n\r\n";
            text += "\t\t\t\t#r=====以下内容仅GM可见=====\r\n";
            text += "#L3#脚本中心#l";
        }
        cm.sendSimple(text);
    } else if (status === 1) {
        doSelect(selection);
    } else {
        cm.dispose();
    }
}

function doSelect(selection) {
    switch (selection) {
        case 0:
            warpFreeMarket();
            break;
        case 1:
            openNpc("dailycheckin");
            break;
        case 2:
            openMapDrops();
            break;
        case 3:
            openScriptCenter();
            break;
        default:
            cm.sendOk("该功能暂不支持，敬请期待！");
            cm.dispose();
    }
}

/**
 * 传送自由：保存来路后送去自由市场，回程由 portal/market00.js 读 FREE_MARKET 记录。
 */
function warpFreeMarket() {
    if (cm.getPlayer().getMapId() === FREE_MARKET_MAP) {
        cm.sendOk("你已经在自由市场了。");
        cm.dispose();
        return;
    }
    // 已经在自由市场里再存一次会把来路覆盖成自由市场本身，所以上面那道判断不能省
    cm.getPlayer().saveLocation("FREE_MARKET");
    cm.dispose();
    cm.warp(FREE_MARKET_MAP, FREE_MARKET_PORTAL);
}

/**
 * 爆率一览：走 @mapdrops 指令，而不是直接 openNpc 掉落脚本——
 * 指令那条路上有监狱、指令开关、权限等级这些校验，绕过去等于把后台对指令的管控作废。
 */
function openMapDrops() {
    const CommandsExecutor = Java.type('org.gms.client.command.CommandsExecutor');
    // 先把 client 拿在手上：dispose 之后 cm 已从会话表里摘掉，但 client 对象本身照常可用
    let client = cm.getClient();
    // @mapdrops 最终调 openNpc，而 openNpc 见到当前还有会话就直接返回 false 什么都不做，
    // 所以必须先结束本次对话再发指令。
    cm.dispose();
    CommandsExecutor.getInstance().handle(client, "@mapdrops");
}

/**
 * 脚本中心：完整功能菜单，仅大GM及以上可用。
 */
function openScriptCenter() {
    // 选项虽然只对大GM显示，但 selection 是客户端发回来的，这里必须再判一次
    if (cm.getPlayer().gmLevel() < SCRIPT_CENTER_GM_LEVEL) {
        cm.sendOk("你没有权限使用该功能！");
        cm.dispose();
        return;
    }
    cm.dispose();
    // 不传脚本名，走 npc/9900001.js
    cm.openNpc(NPC_SCRIPT_CENTER);
}

function openNpc(scriptName) {
    cm.dispose();
    cm.openNpc(NPC_MAPLE_ADMINISTRATOR, scriptName);
}
