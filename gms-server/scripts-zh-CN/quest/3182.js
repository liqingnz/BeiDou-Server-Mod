/*
	名字:	亞凱斯特的水晶
	地圖:	冰原雪域市集
	描述:	211000100
	适配:	北斗GMS083 任务脚本（纯qm原生API，参考3175写法）
*/

var status = -1;
var InventoryType = Java.type("org.gms.client.inventory.InventoryType");

function start(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
        return;
    }
    if (mode == 0) {
        // 用户选择“否”
        if (status == 0) {
            qm.sendNext("又不是什么大事…你这人真自私！啧啧…");
            qm.dispose();
            return;
        }
        if (status >= 3) {
            qm.sendNext("拯救可怜灵魂怎能讨价还价？说实话他的遭遇你也有责任。若改变主意随时来找我。");
            qm.dispose();
            return;
        }
        status--;
    } else {
        status++;
    }

    var questStarted = qm.isQuestStarted(3182);
    var questCompleted = qm.isQuestCompleted(3182);
    // 检查水晶数量（参考3175写法）
    var crystalCount = qm.getPlayer().getItemQuantity(2430159, true);
    var hasCrystal = crystalCount > 0;

    // 任务已完成
    if (questCompleted) {
        qm.sendOk("你已经完成了这个任务。");
        qm.dispose();
        return;
    }

    // 第一次接任务（任务未开始且没有水晶）
    if (!questStarted && !hasCrystal) {
        if (status == 0) {
            qm.sendYesNo("已将#b#p2161004##k的信转交其家人。现在能帮我个忙吗？");
        } else if (status == 1) {
            qm.sendNext("#p2161004#灵魂受困是因狮王施加的诅咒。要破除诅咒，必须切断狮王与#p2161004#的契约联系……");
        } else if (status == 2) {
            qm.sendNextPrev("带上这块结晶，内含我的魔法。在#p2161004#所在处使用，即可解除狮王对他的诅咒。");
        } else if (status == 3) {
            // 检查其他栏空格
            if (qm.getPlayer().getInventory(InventoryType.ETC).getNumFreeSlot() < 1) {
                qm.sendNext("你的背包空间似乎不足，请再检查下物品栏。");
                qm.dispose();
                return;
            }
            // 开始任务并给予水晶（只有没有水晶时才给）
            qm.forceStartQuest();
            if (crystalCount <= 0) {
                qm.gainItem(2430159, 1);
            }
            qm.sendNextPrev("这次结晶免费赠送，但记住重制需要#r一千万金币#k。现在送你去狮王城堡入口，快去找#p2161004#吧。");
        } else if (status == 4) {
            qm.getPlayer().changeMap(qm.getMap(211060000), 0);
            qm.dispose();
        }
        return;
    }

    // 任务进行中且拥有水晶 -> 提醒去使用
    if (questStarted && hasCrystal) {
        if (status == 0) {
            qm.sendAcceptDecline("我已将#b#p2161004##k的信转交给他的家人了。现在能请你帮个忙吗？");
        } else if (status == 1) {
            qm.sendNext("#p2161004#的灵魂受苦，是因为狮王对他施加了诅咒。要解除诅咒，必须切断狮王与#p2161004#之间的契约联系……");
        } else if (status == 2) {
            qm.sendNextPrev("要解除狮王的诅咒，你需要那块蕴含我魔力的水晶。你应该带着水晶吧？");
        } else if (status == 3) {
            qm.sendNextPrev("切记必须在莫特面前使用水晶才能解除狮王诅咒。制作水晶需一千万金币，若在错误地点使用或弄丢可别来找我重做。");
        } else if (status == 4) {
            qm.sendNextPrev("快去为莫特解除狮王诅咒吧。");
        } else if (status == 5) {
            qm.dispose();
        }
        return;
    }

    // 任务进行中但水晶丢失（crystalCount == 0）-> 重制水晶（花费1000万）
    if (questStarted && !hasCrystal) {
        if (status == 0) {
            qm.sendAcceptDecline("我已将#b#p2161004##k的信件转交其家属。现在能否请您帮个忙？");
        } else if (status == 1) {
            qm.sendNext("#p2161004#灵魂受苦的根源在于狮王施加的诅咒。要破除诅咒，必须斩断狮王与#p2161004#之间的契约纽带……");
        } else if (status == 2) {
            qm.sendNextPrev("解除狮王诅咒需要那块蕴含我魔力的水晶。你应当带着它吧？");
        } else if (status == 3) {
            qm.sendNextPrev("水晶不见了？之前不是给过你吗？早说过别乱用或弄丢…啧啧…");
        } else if (status == 4) {
            qm.sendYesNo("看来别无他法。如先前所言，制作水晶需一千万金币。您要重制一块吗？");
        } else if (status == 5) {
            if (qm.getMeso() < 10000000) {
                qm.sendOk("金币不足一千万，无法制作水晶。");
                qm.dispose();
                return;
            }
            if (qm.getPlayer().getInventory(InventoryType.ETC).getNumFreeSlot() < 1) {
                qm.sendOk("其他栏位空间不足，请清理后再来。");
                qm.dispose();
                return;
            }
            qm.gainMeso(-10000000);
            qm.gainItem(2430159, 1);
            qm.sendOk("拿好了。这次若再弄丢或在错误地点使用，可别回来找我。现在快去为莫特解除狮王诅咒吧。");
            qm.dispose();
        }
        return;
    }

    // 其他情况（例如任务未开始但身上有水晶？可能通过其他途径获得，可允许直接开始任务）
    if (!questStarted && hasCrystal) {
        qm.forceStartQuest();
        qm.sendOk("你已经有水晶了，快去莫特那里使用吧。");
        qm.dispose();
        return;
    }

    qm.dispose();
}

// end函数：完成任务
function end(mode, type, selection) {
    if (mode != 1) {
        qm.dispose();
        return;
    }
    if (!qm.isQuestStarted(3182)) {
        qm.dispose();
        return;
    }
    // 检查是否有水晶？如果有，可在这里消耗掉（根据原任务逻辑，使用水晶后应该消失）
    // 但原脚本end中没有消耗水晶，可能是因为使用水晶是另一个脚本负责。这里只做完成任务处理。
    qm.sendYesNo("是你…把我的信交给阿尔卡斯特了吗？");
    qm.forceCompleteQuest();
    qm.gainExp(682200);
    // 可选：移除任务水晶，避免残留
    //var crystalCount = qm.getPlayer().getItemQuantity(2430159, true);
    //if (crystalCount > 0) {
    //    qm.gainItem(2430159, -crystalCount);
    //}
    qm.dispose();
}