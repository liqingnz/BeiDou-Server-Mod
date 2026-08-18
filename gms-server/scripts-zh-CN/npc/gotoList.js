/* @goto 的目的地选单。
 *
 * GotoCommand 在「没带参数」和「地图名打错」两种情况下用 openNpc 拉起本脚本，
 * 把原先只能看不能点的纯文本清单换成可点即传的选项。
 *
 * 目的地取自 GameConstants.GOTO_TOWNS / GOTO_AREAS，与 @goto <name> 用的是同一份
 * 注册表，不另立清单——那样迟早会跟指令本身对不上。
 * GOTO_AREAS 只对 GM 开放，与 GotoCommand.execute 的判定保持一致。
 */
var GameConstants = Packages.org.gms.constants.game.GameConstants;
var MapFactory = Packages.org.gms.server.maps.MapFactory;

var destinations = [];   // [[mapId, 显示名], ...]，下标即选项序号

function start() {
    destinations = buildDestinations();
    if (destinations.length === 0) {
        cm.sendOk("当前没有可用的目的地。");
        cm.dispose();
        return;
    }

    var text = "尊贵的GM大人，您想去哪里呢？\r\n#b";
    for (var i = 0; i < destinations.length; i++) {
        text += "#L" + i + "#" + destinations[i][1] + "#l\r\n";
    }
    cm.sendNextSelectLevel("Goto", text);
}

function levelGoto(selection) {
    if (selection < 0 || selection >= destinations.length) {
        cm.dispose();
        return;
    }
    cm.getPlayer().saveLocationOnWarp();
    cm.warp(destinations[selection][0]);
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
        rows.push([e.getValue(), e.getKey(), prefix]);
    }
    rows.sort(function (a, b) {
        return a[0] - b[0];
    });

    var out = [];
    for (var i = 0; i < rows.length; i++) {
        var mapId = rows[i][0];
        var placeName;
        try {
            placeName = String(MapFactory.loadPlaceName(mapId));
        } catch (err) {
            placeName = "";           // wz 里没有地名时退回只显示 key，不要因此整张单子打不开
        }
        var label = rows[i][2] + "'" + rows[i][1] + "'";
        if (placeName !== "" && placeName !== "null") {
            label += " - " + placeName;
        }
        out.push([mapId, label]);
    }
    return out;
}
