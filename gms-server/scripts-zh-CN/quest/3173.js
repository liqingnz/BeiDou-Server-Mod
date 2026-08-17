/*
	名字:	不相信的王
	地圖:	第五座塔樓
	描述:	211061001
	适配:	北斗GMS083 任务脚本（纯qm原生API）
*/

var status = -1;

function start(mode, type, selection) {
    switch (mode) {
        case -1:
            qm.dispose();
            return;
        case 0:
            if (status > 1) {
                qm.sendOk("我或许正将你送入险境。他很可能袭击任何靠近接见室的人。抱歉……");
                qm.dispose();
                return;
            }
            status--;
            break;
        case 1:
            status++;
            break;
    }

    switch (status) {
        case 0:
            qm.sendNext("数百年来，我目睹这座城堡逐渐崩塌。它曾是如此华美辉煌，那景象总能温暖我的心……");
            break;
        case 1:
            qm.sendNextPrev("我们的国王雷昂亦是如此。他曾是剑术大师，臂膀强健而心怀温暖。言语不多，但善行自会发声，为他歌唱。怎会变得如此面目全非？");
            break;
        case 2:
            qm.sendYesNo("#r黑魔法师#k究竟对他做了什么？！他…他已忘记我了吗？求你去和雷昂谈谈。");
            break;
        case 3:
            qm.sendNext("他未回应我的呼唤，但我确信他正独坐在#b接见室#k。请确认#b雷昂#k是否还记得我，或是刻意回避。我会送你去#m211070200#。");
            break;
        case 4:
            // 判断并启动任务
            if (!qm.isQuestStarted(3173) && !qm.isQuestCompleted(3173)) {
                qm.forceStartQuest(3173); // 北斗083任务脚本原生强制启动方法
            }
            
            // 任务脚本原生地图传送
            var targetMap = qm.getMap(211070200);
            var targetPortal = targetMap.getPortal(3);
            qm.getPlayer().changeMap(targetMap, targetPortal);
            
            qm.dispose();
            break;
    }
}

// 北斗083任务脚本必需的end函数（释放对话资源）
function end() {
    qm.dispose();
}