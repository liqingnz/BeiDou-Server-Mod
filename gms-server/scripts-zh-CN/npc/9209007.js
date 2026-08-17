var status = 0;

var maps =[680100000,680100001,680100002,680100003];

var cost = 
[1000,1000,1000,1000];

var selectedMap = -1;

var mesos;

function start() {
    cm.sendNext("您好~！我是集市接待员，我可以送你去集市，想去的话我这就送你过去！");
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (status == 1 && mode == 0) {
            cm.dispose();
            return;
        } else if (status >= 2 && mode == 0) {
            cm.sendNext("如果你以后要去集市，欢迎回来找我们。");
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
                selStr += "我们对新手有九折优惠。";
            selStr += "选择你的目的地，费用会因地而异。#b";
            for (var i = 0; i < maps.length; i++)
                selStr += "\r\n#L" + i + "##m" + maps[i] + "# (" + (cm.getJobId() == 0 ? cost[i] / 10 : cost[i]) + " mesos)#l";
            cm.sendSimple(selStr);
        } else if (status == 2) {
            cm.sendYesNo("你没别的事可做了吧?你真的想去 #b#m" + maps[selection] + "##k吗? 它会花费 #b"+ (cm.getJobId() == 0 ? cost[selection] / 10 : cost[selection]) + " mesos#k.");
            selectedMap = selection;
        } else if (status == 3) {
            if (cm.getJobId() == 0) {
            	mesos = cost[selectedMap] / 10;
            } else {
            	mesos = cost[selectedMap];
            }
            
            if (cm.getMeso() < mesos) {
                cm.sendNext("你没钱啊老铁~");
                cm.dispose();
                return;
            }
            
            cm.gainMeso(-mesos);
            cm.warp(maps[selectedMap], 0);
            cm.dispose();
        }
    }
}