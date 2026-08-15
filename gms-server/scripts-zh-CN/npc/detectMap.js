/**
 * 测谎 —— 当前地图可检测玩家列表。
 * 由 @detect 不带参数时打开，判定与处罚在 AbstractPlayerInteraction.detectPlayer。
 * 移植自 LichKingMod scripts/npc/detectMap.js。
 */
var status = -1;
var candidateIds = [];

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
        // 原实现把 getMap().getAllPlayers() 当数组用（.length 与 [i]），而它是 java.util.List，
        // .length 恒为 undefined，循环一次都进不去，列表永远是空的。改用 size() / get()。
        var players = cm.getMap().getAllPlayers();
        var selStr = "当前地图可检测玩家：";
        candidateIds = [];
        for (var i = 0; i < players.size(); i++) {
            var p = players.get(i);
            if (p.getId() == cm.getPlayer().getId()) {
                continue;
            }
            // 原实现用玩家在原列表中的下标做选项值，跳过自己之后下标就对不上了，
            // 选中的会是名单里的另一个人。改成单独维护一份候选id。
            selStr += "\r\n#L" + candidateIds.length + "##b" + p.getName() + "#k - Lv " + p.getLevel() + "#l";
            candidateIds.push(p.getId());
        }
        if (candidateIds.length == 0) {
            cm.sendOk("当前地图没有可检测的玩家。");
            cm.dispose();
            return;
        }
        cm.sendSimple(selStr);
    } else if (status == 1) {
        var target = cm.getMap().getCharacterById(candidateIds[selection]);
        if (target == null) {
            cm.sendOk("该玩家已经离开了这张地图。");
            cm.dispose();
            return;
        }
        candidateIds = [candidateIds[selection]];
        // 原实现把角色对象直接拼进字符串，弹出来的是一串对象地址而不是名字
        cm.sendYesNo("是否要检测：#b" + target.getName() + "#k？");
    } else if (status == 2) {
        var target = cm.getMap().getCharacterById(candidateIds[0]);
        if (target == null) {
            cm.sendOk("该玩家已经离开了这张地图。");
            cm.dispose();
            return;
        }
        cm.detectPlayer(target);
        cm.dispose();
    }
}
