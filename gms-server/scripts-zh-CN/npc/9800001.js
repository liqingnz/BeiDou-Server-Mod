/*
    全服留言板。移植自 LichKingMod。
    留言内容与颜色控制码分开存储，渲染在服务端 MessageBoardService 里做，脚本只负责收费与交互。
 */

var status;
var costMillion = 50;           // 留言费，单位：万金币
var COST_UNIT = 10000;
var text;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1 || mode == 0) {
        cm.dispose();
        return;
    }
    status++;

    if (status == 0) {
        var msg = "是否要留言？\r\n";
        msg += cm.getMessageBoard();
        msg += "\r\n______________________________________________";
        cm.sendYesNo(msg);
    } else if (status == 1) {
        cm.sendGetText("请输入需要留言的内容，留言需支付#r" + costMillion + "万#k金币：");
    } else if (status == 2) {
        text = cm.getText();
        if (text == null || text.length == 0) {
            cm.sendOk("留言内容不能为空。");
            cm.dispose();
            return;
        }
        cm.sendYesNo("请确认你的内容：\r\n" + text);
    } else if (status == 3) {
        var cost = costMillion * COST_UNIT;
        if (cm.getMeso() < cost) {
            cm.sendOk("金币不足！");
            cm.dispose();
            return;
        }
        // 先写库再扣钱：原实现无论入库成功与否都当成功处理，DB 出错时玩家照样被扣掉留言费
        if (cm.addMessageBoardEntry(text)) {
            cm.gainMeso(-cost);
            cm.playerMessage(1, "留言成功");
        } else {
            cm.sendOk("留言失败，可能是内容超出40字上限。");
        }
        cm.dispose();
    } else {
        cm.dispose();
    }
}
