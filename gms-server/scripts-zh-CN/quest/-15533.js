/*
	NPC Name: 		Ponicher
	Description: 		Quest - A Battle Against 再生都纳斯
*/
var status = -1;

function start(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
    } else {
        if (mode == 1) {
            status++;
        }
        if (status == 0) {
            //qm.sendNext("重力网使用的驱动组件目前出现在#o9400295#的周围，有了它就可以强化#o9400295#的力量，没时间了，如果不尽快地打倒#o9400295#的话…...准备好了就请再次与我对话，开启再生都纳斯远征！");
            qm.sendNext("(很抱歉后续任务暂未修复...)");
        } else if (status == 1) {
            //qm.forceStartQuest();
            qm.dispose();
        }
    }
}

function end(mode, type, selection) {
}