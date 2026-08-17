
/*
	Crysta; - Kamuma (Neo Tokyo Teleporter)
*/

function start() {
    switch (cm.getMapId()) {
        case 800040000:
            cm.warp(802000100, 0);
            cm.dispose();
            break;
        case 802000211:
            if (cm.getQuestStatus(4686) == 2) {
                //cm.gainItem(4032181, 100);
                cm.warp(802000212, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);
                cm.forceCompleteQuest(4686);
            }
            cm.dispose();
            break;
        case 802000313:
            if (cm.getQuestStatus(4689) == 2) {
                //cm.gainItem(4032181, 50);
                cm.warp(802000312, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 50);
                cm.forceCompleteQuest(4689);
            }
            cm.dispose();
            break;
        case 802000411:
            if (cm.getQuestStatus(4693) == 2) {
                //cm.gainItem(4032181, 100);
                cm.warp(802000412, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);
                cm.forceCompleteQuest(4693);
            }
            cm.dispose();
            break;
        case 802000611:
            if (cm.getQuestStatus(4696) == 2) {
                //cm.gainItem(4032181, 100);
                cm.warp(802000612, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);
                cm.forceCompleteQuest(4696);
            }
            cm.dispose();
            break;
        case 802000111:
            if (cm.getQuestStatus(4698) == 2) {
                //cm.gainItem(4032181, 100);
                cm.warp(802000112, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);
                cm.forceCompleteQuest(4698);
            }
            cm.dispose();
            break;
        case 802000711:
            if (cm.getQuestStatus(50003) == 2) {
                //cm.gainItem(4032181, 100);
                cm.warp(802000712, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);
                cm.forceCompleteQuest(50003);
            }
            cm.dispose();
            break;
        case 802000821:
            if (cm.getQuestStatus(50016) == 2) {
                //cm.gainItem(4032181, 100);
                cm.gainItem(4032361, 1);
                cm.warp(802000820, 0);
            } else {
                cm.showEffect(false, "quest/party/clear");
                cm.playSound(false, "Party1/Clear");
                //cm.gainItem(4032181, 100);

                cm.forceCompleteQuest(50016);
            }
            cm.dispose();
            break;
        case 800000000:
            cm.sendYesNo("您想要前往卡姆那吗？");
            break;
        case 802000101:
			var txt = "";
			txt += "阿夕亚的力量在水晶之中不断流动，如果你得到了阿夕亚的允许，便可以前往未来世界的东京...";
			//txt += " \r #b#L8#前往 #m802000101##l"
			if (cm.getQuestStatus(4682) == 2){
				txt += " \r #b#L0# #m802000200#(防御塔)#l";
			}
			if (cm.getQuestStatus(4687) == 2){
				txt += " \r #L1# #m802000300##l";
			}
			if (cm.getQuestStatus(4690) == 2){
				txt += " \r #L2# #m802000400#(高科区域)#l";
			}
			if (cm.getQuestStatus(4694) == 2){
				txt += " \r #L3# #m802000600##l";
			}
			if (cm.getQuestStatus(50001) == 2){
				txt += " \r #L5# #m802000700#(核心商业区)#l";
			}
			if (cm.getQuestStatus(50002) == 2){
				txt += " \r #L9# #m802000800##l"; //欧碧拉门口
			}
			//if (cm.getQuestStatus(50002) == 2){
			//	txt += " \r #L7# #m802000810##l"; //这个图083日服逆奥没用到，关闭
			//}
			txt += "\r #L6# 让我好好考虑一下。#k#l";
            cm.sendSimple(txt);
            break;
        default:
            cm.sendYesNo("您想要前往卡姆那吗？");

            break;
    }
}

function action(mode, type, selection) {
if (cm.getMapId() == 802000101) {
    if (selection != 6) {

        var questid = true,
            mapid = 0,
            portal = 0;

        switch (selection) {
            case 0:
                questid = cm.getQuestStatus(4682) == 2;
                mapid = 802000200;
                portal = 2;
                break;
            case 1:
                questid = cm.getQuestStatus(4687) == 2;
                mapid = 802000300;
                portal = 0;
                break;
            case 2:
                questid = cm.getQuestStatus(4690) == 2;
                mapid = 802000400;
                portal = 0;
                break;
            case 3:
                questid = cm.getQuestStatus(4694) == 2;
                mapid = 802000600;
                portal = 0;
                break;
            case 5:
                questid = cm.getQuestStatus(50001) == 2;
                mapid = 802000700;
                portal = 0;
                break;
            case 7:
                questid = cm.getQuestStatus(50002) == 2;
                mapid = 802000810;
                portal = 0;
                break;
	    case 8:
                mapid = 802000101;
                portal = 0;
                break;
	    case 9:
                questid = cm.getQuestStatus(50002) == 2;
                mapid = 802000800;
                portal = 0;
                break;
        }
        //if (questid && mapid > 0) {  //前置任务检测
        if (mapid > 0) {   //取消前置任务检测
            cm.warp(mapid, portal);

        } else if (selection == 6) { 
        cm.sendOk("时间的洪流自始至终...");
        cm.dispose();
        return;

        } else {
            cm.dispose();
        }
    }
} else {
    // 其他地图的简单传送处理
    if (mode == 1) { // 用户点击了Yes
        switch (cm.getMapId()) {
            case 800000000:
                cm.warp(802000100, 2);
                break;
            default:
                cm.warp(802000101, 1);
                break;
        }
    } else { // 用户点击了No
      cm.dispose();
    }
}
    cm.dispose();
}