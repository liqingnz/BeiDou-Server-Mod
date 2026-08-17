/*
	名字:	亞凱斯特的水晶
	地圖:	亞凱斯特的水晶
	描述:	任務消耗品
	适配:	北斗GMS083 物品脚本
*/

function start() {
    var player = im.getPlayer();
    var currentMapId = player.getMap().getId();
    
    // 检查是否在正确的地图（莫特所在位置）
    if (currentMapId != 211060400) {
        player.dropMessage(5, "你不能在这里使用。");
        im.dispose();
        return;
    }
    
    // 消耗一个水晶
    im.gainItem(2430159, -1);
    
    // 设置任务3182的自定义数据（标记已使用水晶）
    try {
        var Quest = Java.type("org.gms.server.quest.MapleQuest");
        var quest = Quest.getInstance(3182);
        var questRecord = player.getQuestNAdd(quest);
        if (questRecord != null) {
            questRecord.setCustomData("211060400");
            player.updateQuest(questRecord, true);
        }
    } catch (e) {
        // 如果API出现意外错误，仅输出调试信息（不影响主要流程）
        player.dropMessage(5, "任务状态记录失败，但水晶已使用。");
    }
    
    // 提示成功
    im.forceCompleteQuest(3182);
    player.dropMessage(5, "水晶散发出神秘的光芒，诅咒也随之破除。");
    im.dispose();
}