function start() {
    cm.sendYesNo("（这里有一朵蓝铃花苞，触摸它可以送你回林中之城附近，要试试吗？）");

}

function action(mode, type, selection) {
    if (mode == 1) {
        // 玩家选择“是”，传送到指定地图
        cm.warp(10006071, 6);
    }
    // 无论是选择“否”、关闭窗口，还是传送完成，都结束对话
    cm.dispose();
}