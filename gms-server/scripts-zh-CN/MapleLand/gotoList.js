/* @goto 的目的地选单。
 *
 * GotoCommand 在「没带参数」和「地图名打错」两种情况下用 openNpc 拉起本脚本，
 * 把原先只能看不能点的纯文本清单换成可点即传的选项。
 *
 * 目的地取自 GameConstants.GOTO_TOWNS / GOTO_AREAS，与 @goto <name> 用的是同一份
 * 注册表，不另立清单——那样迟早会跟指令本身对不上。
 * GOTO_AREAS 只对 GM 开放，与 GotoCommand 的判定保持一致。
 *
 * 传送不在本脚本里做，交回 GotoCommand.warpFromMenu：守卫（死亡 / 活动副本 /
 * 迷你地下城 / CANNOTMIGRATE）与落点（随机出生点）都得跟 @goto <name> 一个口径，
 * 在这儿抄一遍迟早会漂。
 *
 * 排版同理：一格长什么样（蓝色英文名 + 地图名、各自补到固定宽度、超长的地图名截断）
 * 由 GotoCommand.formatCell 说了算，每行几格读 GotoCommand.PER_LINE。本脚本只负责
 * 分段、排行和套 #L 链接——GotoCommand 起不来时那份纯文本兜底清单要跟这里长得一样。
 */
var GameConstants = Java.type("org.gms.constants.game.GameConstants");
var GotoCommand = Java.type("org.gms.client.command.commands.gm1.GotoCommand");

var PER_LINE = GotoCommand.PER_LINE;
var COLUMN_GAP = GotoCommand.COLUMN_GAP;

var destinations = [];   // [[mapId, 英文名], ...]，下标即选项序号

function start() {
    destinations = [];

    var text = "";
    var sections = buildSections();
    for (var i = 0; i < sections.length; i++) {
        // 两块之间空一行，不然城镇的尾巴和区域的头挨在一起，看不出换了一类
        if (i > 0) {
            text += "\r\n";
        }
        text += sections[i].title + "\r\n" + renderSection(collect(sections[i].registry));
    }

    if (destinations.length === 0) {
        cm.sendOk("当前没有可用的目的地。");
        cm.dispose();
        return;
    }
    cm.sendNextSelectLevel("Goto", "想去哪里？\r\n" + text);
}

/**
 * 排一段，顺带把这段的条目按顺序登记进 destinations——选项序号就是登记时的下标。
 * 城镇与区域分开排（而不是拉平了一起数），免得一行左边是城镇、右边是区域。
 */
function renderSection(rows) {
    var text = "";
    for (var i = 0; i < rows.length; i++) {
        var lineEnd = (i % PER_LINE === PER_LINE - 1) || (i === rows.length - 1);
        // 行末那格不补右侧空白，免得留一串行尾空格
        text += "#L" + destinations.length + "#" + GotoCommand.formatCell(rows[i][1], rows[i][0], !lineEnd) + "#l";
        destinations.push(rows[i]);
        // 段末也得换行：不换的话下一段的标题会接到这一行的尾巴上
        text += lineEnd ? "\r\n" : COLUMN_GAP;
    }
    return text;
}

function levelGoto(selection) {
    if (selection >= 0 && selection < destinations.length) {
        // 拦下时 warpFromMenu 自己会提示玩家，这里不用再说一遍
        GotoCommand.warpFromMenu(cm.getPlayer(), destinations[selection][0]);
    }
    cm.dispose();
}

/** 城镇在前、区域在后；区域仅 GM 可见。两段的排版一致，靠标题区分 */
function buildSections() {
    var sections = [{ title: "#r城镇：#k", registry: GameConstants.GOTO_TOWNS }];
    if (cm.getPlayer().isGM()) {
        sections.push({ title: "#r区域：#k", registry: GameConstants.GOTO_AREAS });
    }
    return sections;
}

/**
 * 取一段的条目并按 map id 排序，与 GotoCommand.sortGotoEntries 的口径一致
 * （Entry.comparingByValue）。
 *
 * @return [[mapId, 英文名], ...]
 */
function collect(registry) {
    var rows = [];
    var it = registry.entrySet().iterator();
    while (it.hasNext()) {
        var e = it.next();
        rows.push([e.getValue(), e.getKey()]);
    }
    rows.sort(function (a, b) {
        return a[0] - b[0];
    });
    return rows;
}
