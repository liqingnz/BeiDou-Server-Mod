function start() {
    var currentMapId = parseInt(cm.getMapId());
    if (currentMapId === 802000309) {
    cm.sendYesNo("呜呜~~请带我离开这里~~");
   } else {
    cm.sendOk("呜呜~~~~");
    cm.dispose();
   }
}

function action(mode, type, selection) {
    if (mode == 1) {
        // 玩家选择“是”，传送到指定地图
        cm.warp(802000302, 0);
    }
    // 无论是选择“否”、关闭窗口，还是传送完成，都结束对话
    cm.dispose();
}