function enter(pi) {
    // 设置一个临时变量，告诉 NPC 脚本这次是传送门触发的确认
    //pi.getPlayer().setScriptVariable("portalExitConfirm", true);
    // 打开 NPC 2161005 的对话框（头像即为该 NPC，要求地图中存在该NPC）
    pi.openNpc(2161005);
    // 返回 false 阻止默认的传送行为
    return false;
}