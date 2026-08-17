/**
 * @description 手册导航, 怪物手册/NPC手册/道具手册入口
 * @author hzh
 */

function start() {
	var text = "#e#d======== 手册导航(部分功能仅开放给GM) ========#k#n\r\n\r\n";
	text += "#L1##r#e怪物手册#n#k - 查询怪物掉落及出没地图\r\n";
	text += "#L2##r#eNPC手册#n#k - 查询NPC位置, 传送或召唤\r\n";
	text += "#L3##r#e道具手册#n#k - 查询道具对应的掉落怪物\r\n";
	if (cm.getPlayer().isGM()) {
	text += "#L4##r#e地图手册#n#k - 查询地图信息并传送(GM专用)\r\n";
	}
	text += "#L5##r#e任务手册#n#k - 查询任务及关联NPC\r\n";
	if (cm.getPlayer().isGM()) {
	text += "#L6##r#e任务追踪#n#k - 查看进行中任务, 一键满进度(GM专用)\r\n";
	}
	cm.sendSimple(text);
}

function action(mode, type, selection) {
	cm.dispose();
	if (mode < 1) {
		return;
	}
	switch (selection) {
		case 1:
			cm.openNpc(9900001, "手册导航/怪物手册");
			break;
		case 2:
			cm.openNpc(9900001, "手册导航/NPC手册");
			break;
		case 3:
			cm.openNpc(9900001, "手册导航/道具手册");
			break;
		case 4:
			cm.openNpc(9900001, "手册导航/地图手册");
			break;
		case 5:
			cm.openNpc(9900001, "手册导航/任务手册");
			break;
		case 6:
			cm.openNpc(9900001, "手册导航/任务追踪");
			break;
		default:
			cm.dispose();
	}
}
