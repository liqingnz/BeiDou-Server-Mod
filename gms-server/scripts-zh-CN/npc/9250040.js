var status = 0;
var maps = [501030104];
var cost = [100000];
var selectedMap = -1;
var mesos;

function start() {
    cm.sendNext("你好！请问你是否听说过六手邪神?");
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (status == 1 && mode == 0) {
            cm.dispose();
            return;
        } else if (status >= 2 && mode == 0) {
            cm.sendNext("欢迎下次再来挑战。");
            cm.dispose();
            return;
        }
        if (mode == 1)
            status++;
        else
            status--;
        if (status == 1) {
            var selStr = "";
            if (cm.getJobId() == 0)
                selStr += "我们有对新手90%的打折.";
            selStr += "我可以送你六手邪神的所在地.#b";
            for (var i = 0; i < maps.length; i++)
                selStr += "\r\n#L" + i + "##m" + maps[i];
            cm.sendSimple(selStr);
        } else if (status == 2) {
            cm.sendYesNo("如果要挑战六手邪神，将花费你" + (cm.getJobId() == 0 ? cost[selection] / 10 : cost[selection]) + "金币，确定要去吗？#k.");
            selectedMap = selection;
        } else if (status == 3) {
            if (cm.getJobId() == 0) {
            	mesos = cost[selectedMap] / 10;
            } else {
            	mesos = cost[selectedMap];
            }
            
            if (cm.getMeso() < mesos) {
                cm.sendNext("请确认你是否有足够的金币!");
                cm.dispose();
                return;
            }
            
            cm.gainMeso(-mesos);
            cm.warp(maps[selectedMap], 0);
            cm.dispose();
        }
    }
}