// 未来东京BOSS再生都纳斯，由于缺少脚本无法自动解除无敌，这里用点击NPC的方式实现
// 其实就是将无敌都纳斯9400295消灭，并召唤不无敌的再生都纳斯9400294, 召唤坐标： -821, 326


var status = -1;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == 1) {
        status++;
    } else {
        status--;
    }
    
    if (status == 0) {
        var map = cm.getMap(802000701);
        var monster295 = map.countMonster(9400295);
        var monster293 = map.countMonster(9400293);
        var monster294 = map.countMonster(9400294);
        
        // 情况1：9400295存活且9400293已被死亡
        if (monster295 > 0 && monster293 == 0) {
            map.spawnMonsterOnGroundBelow(9400294,-821,326);
            map.killMonster(9400295);
            cm.sendOk("已成功解除再生都纳斯的无敌护盾，快去消灭他吧！");
            cm.playerMessage(5, "已成功解除再生都纳斯的无敌护盾，快去消灭他吧！");
            cm.dispose();
       // 情况2：9400294已存在（无论存活与否）
        } else if (monster294 > 0) {
            cm.sendYesNo("与再生都纳斯的战斗已经在进行中了，\r\n你还是要离开当前区域吗？");
        } else if (monster294 == 0 && monster293 == 0 && monster295 == 0) {
            cm.sendYesNo("你已经击败了再生都纳斯，\r\n现在要离开当前区域吗？");
        } else {
            cm.sendYesNo("请先消灭#b都纳斯组件#k，再来与我对话！\r\n...或者，你是准备放弃并#r离开#k吗？");
        }
    } else if (status == 1) {
        cm.warp(802000700, 0); // 传回指定地图
        cm.dispose();
    } else {
        cm.dispose();
    }
}


