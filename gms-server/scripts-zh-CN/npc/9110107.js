/*
	名字:	轎子
	地圖:	楓葉古城外圍
	描述:	800040000
*/

var status;

function start() {
	status = -1;
	action(1, 0, 0);
}

function action(mode, type, selection) {
	switch (mode) {
	case -1:
		cm.dispose();
		return;
	case 0:
		if (status < 2) {
		cm.sendNext("等等，你是不想去吗？");
		cm.dispose();
		return;
		}
		status--;
		break;
	case 1:
		status++;
		break;
		}
		reactor = 'action' + (cm.getPlayer().getMap().getId() == 800000000 ? 0 : 1);
		eval(reactor)(mode, type, selection);
}

function action0(mode, type, selection) {
	switch (status) {
	case 0:
		cm.sendNext("我们是车夫兄弟！");
		break;
	case 1:
		cm.sendYesNo("要去枫叶古城吗？我们可以送你去！");
		break;
	case 2:
		cm.sendNext("知道了！现在就出发吧，抓紧了别摔下来。我们心情很好，你甚至不用付钱给我们！");
		break;
	case 3:
		cm.getPlayer().changeMap(cm.getMap(800040000), cm.getMap(800040000).getPortal(3));
		cm.dispose();
}
}

function action1(mode, type, selection) {
	switch (status) {
	case 0:
		cm.sendNext("我们是车夫兄弟！");
		break;
	case 1:
		cm.sendYesNo("要去蘑菇神社吗？我们可以送你去！");
		break;
	case 2:
		cm.sendNext("知道了！现在就出发吧，抓紧了别摔下来。我们心情很好，你甚至不用付钱给我们！");
		break;
	case 3:
		cm.getPlayer().changeMap(cm.getMap(800000000), cm.getMap(800000000).getPortal(3));
		cm.dispose();
}
}