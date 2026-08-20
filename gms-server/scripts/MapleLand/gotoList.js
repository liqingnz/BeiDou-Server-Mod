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
 */
var GameConstants = Java.type("org.gms.constants.game.GameConstants");
var MapFactory = Java.type("org.gms.server.maps.MapFactory");
var GotoCommand = Java.type("org.gms.client.command.commands.gm1.GotoCommand");

var destinations = [];   // [[mapId, 显示名], ...]，下标即选项序号

function start() {
    destinations = buildDestinations();
    if (destinations.length === 0) {
        cm.sendOk("No destination is available right now.");
        cm.dispose();
        return;
    }

    var text = "Where would you like to go?\r\n#b";
    for (var i = 0; i < destinations.length; i++) {
        text += "#L" + i + "#" + destinations[i][1] + "#l\r\n";
    }
    cm.sendNextSelectLevel("Goto", text);
}

function levelGoto(selection) {
    if (selection >= 0 && selection < destinations.length) {
        // 拦下时 warpFromMenu 自己会提示玩家，这里不用再说一遍
        GotoCommand.warpFromMenu(cm.getPlayer(), destinations[selection][0]);
    }
    cm.dispose();
}

/**
 * 按 map id 排序，与 GotoCommand.sortGotoEntries 的口径一致（Entry.comparingByValue）。
 * 城镇在前、区域在后；区域仅 GM 可见。
 */
function buildDestinations() {
    var list = collect(GameConstants.GOTO_TOWNS, "");
    if (cm.getPlayer().isGM()) {
        list = list.concat(collect(GameConstants.GOTO_AREAS, "#r*#k "));
    }
    return list;
}

function collect(registry, prefix) {
    var rows = [];
    var it = registry.entrySet().iterator();
    while (it.hasNext()) {
        var e = it.next();
        rows.push([e.getValue(), e.getKey()]);
    }
    rows.sort(function (a, b) {
        return a[0] - b[0];
    });

    var out = [];
    for (var i = 0; i < rows.length; i++) {
        var mapId = rows[i][0];
        // loadPlaceName 内部已吞掉全部异常并回落空串，这里不必再兜一层
        var placeName = String(MapFactory.loadPlaceName(mapId));
        var label = prefix + "'" + rows[i][1] + "'";
        if (placeName !== "") {
            label += " - " + placeName;
        }
        out.push([mapId, label]);
    }
    return out;
}
