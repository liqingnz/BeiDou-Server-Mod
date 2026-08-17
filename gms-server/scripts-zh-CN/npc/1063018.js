var status;

function start() {
	status = -1;
	action(1, 0, 0);
}

function action(mode, type, selection) {
	if (mode == -1) {
		cm.dispose();
	} else {
		if (mode == 0 && type > 0) {
			cm.dispose();
			return;
		}
		if (mode == 1)
			status++;
		else
			status--;

		if (status == 0) {
			if (cm.getPlayer().haveItem(4032322)) {
				cm.getPlayer().yellowMessage("你也敢来偷取的我研究?");
				var 人偶师 = Packages.server.life.MapleLifeFactory.getMonster(9300344);
				cm.getPlayer().getMap().spawnMonsterOnGroundBelow(9300344,815,191);
				cm.dispose();
			} else {
				cm.sendNext("这里好像发现了什么.");
			}
		} else if (status == 1) {
			cm.sendNext("桌上放着什么?");
			cm.gainItem(4032322);
		}
	}
}

function generateSelectionMenu(array) { // nice tool for generating a string for the sendSimple functionality
	var menu = "";
	for (var i = 0; i < array.length; i++) {
		menu += "#L" + i + "#" + array[i] + "#l\r\n";
	}
	return menu;
}
