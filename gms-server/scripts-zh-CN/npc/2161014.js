/*
    NPC: 2161008 (狮子王召唤物触发器)
    防重复召唤：NPC已消失则不执行任何操作
*/
function start() {
    cm.sendYesNo("你们是来击退我的勇士吗？亦或是与黑魔法师为敌的人？...无论是哪一方都无所谓。废话少说，拿出你们的实力来！");
}

function action(mode, type, selection) {
    if (mode == -1 || mode == 0) {
        cm.dispose();
        return;
    }

    try {
        var map = cm.getMap();
        var npcExists = false;
        
        // ========== 校验：检查地图上是否还存在2161014 NPC ==========
        var allObjs = map.getMapObjects().toArray();
        for (var i = 0; i < allObjs.length; i++) {
            if (allObjs[i].getId() == 2161014) {
                npcExists = true;
                break;
            }
        }
        
        // NPC已经消失，说明已被其他玩家召唤过，直接返回
        if (!npcExists) {
            //cm.sendOk("怪物已经被召唤过了。");
            cm.dispose();
            return;
        }

        // NPC存在，正常执行逻辑
        var eim = cm.getEventInstance();
        if (eim == null) {
            cm.sendOk("当前不在远征队事件中。");
            cm.dispose();
            return;
        }
        
        eim.getEm().getIv().invokeFunction("spawnMobAndRemoveNpc", eim, cm.getPlayer());
        //cm.sendOk("班雷昂人类形态已被消灭，自动召唤狮子王形态。");
    } catch (e) {
        cm.sendOk("操作失败，请联系管理员");
    }
    cm.dispose();
}