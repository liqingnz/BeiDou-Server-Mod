/*
	名字:	伊帕娅
	地圖:	第五座塔楼
	描述:	211061001
*/

function start() {
	// 获取玩家对象
	var player = cm.getPlayer();
	// 判断任务3175状态大于1的情况
	if (player.getQuestStatus(3175) > 1) {
		cm.sendOk("可怜的雷昂……要是他能想起自己是谁就好了……");
		cm.dispose();
		return;
	}
	// 判断任务3173和3175状态均不为1的情况
	if (player.getQuestStatus(3173) != 1 && player.getQuestStatus(3175) != 1) {
		// ✅ 北斗083 标准蓝字系统提示（聊天栏下方显示）
		player.dropMessage(5, "你现在无法进入接见室。");
		cm.dispose();
		return;
	}
	// 发送下一步对话
	cm.sendNext("您还没和雷昂谈过吗？我将再次送您前往#m211070200#。祈愿您成功……");
}

function action(mode, type, selection) {
	if (mode > 0) {
		// 传送至目标地图的3号传送门
		cm.getPlayer().changeMap(211070200, 3);
	}
	cm.dispose();
}