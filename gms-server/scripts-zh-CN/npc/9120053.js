var timeLimit = 1;

// ========== 远征队相关变量（仅在802000800使用）==========
var expStatus = 0;       // 远征队状态机
var expedition;          // 远征队对象
var expedMembers;        // 成员列表
var player;              // 玩家对象
var em;                  // 事件管理器
// =======================================================

function start() {
    var playerMap = cm.getPlayer().getMapId();
    if (playerMap == 802000801) {
        cm.sendYesNo("你想#r离开#k这个地方？但是出去后无法返回战场...");
    } else if (playerMap == 802000800) {
        // 调用远征队开始逻辑
        expStatus = 0;
        action(1, 0, 0);
    } else if (playerMap == 802000802) {
        cm.sendYesNo("这里的脉冲阵列很难突破...\r\n但是...支付100W金币，便能直接通过。");
    } else if (playerMap == 802000803 && cm.getMap(802000803).countMonster(9400296) >0 ) {
        cm.sendYesNo("你还没有击败布雷兹首脑，现在就要#r离开#k吗？");
    } else if (playerMap == 802000803) {
        cm.sendYesNo("你已经击败了布雷兹首脑，要前往下一阶段吗？");
    } else if (playerMap == 802000804) {
        cm.sendYesNo("（缺少脚本，直接跳过此阶段）");
    } else {
        cm.dispose();
    }
}

function action(mode, type, selection) {
    var playerMap = cm.getPlayer().getMapId();
    
    // 如果在地图802000800，使用远征队逻辑
    if (playerMap == 802000800) {
        handleExpedition(mode, type, selection);
        return;
    }
    
    // 以下为原9120053_1.js的逻辑（802000801,802000802,802000803,802000804,802000800原本的逻辑已被替换）
    if (mode == 0) {
        cm.dispose();
    } else if (mode == 1) {
        if (playerMap == 802000801) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000802) {
            cm.gainMeso(-1000000);
            cm.warp(802000803, 1);
            cm.dispose();
        } else if (playerMap == 802000803 && cm.getMap(802000803).countMonster(9400296) >0) {
            cm.warp(802000800, 0);
            cm.dispose();
        } else if (playerMap == 802000803) {
            cm.warp(802000804, 0);
            cm.dispose();
        } else if (playerMap == 802000804) {
            cm.warp(802000805, 0);
            cm.dispose();
        } else if (playerMap == 802000800) {
            // 此处已由上面的远征队处理，不会进入
            cm.dispose();
        }
    } else {
        cm.dispose();
    }
}

// ========== 远征队处理函数==========
function handleExpedition(mode, type, selection) {
    const ExpeditionType = Java.type('org.gms.server.expeditions.ExpeditionType');
    const exped = ExpeditionType.CHAOS_ZAKUM; // 北斗083无独立的未来东京远征类型，复用进阶扎昆类型（不影响功能，默认不限次数）
    var expedName = "未来东京 布雷兹首脑&欧碧拉";
    var expedBoss = "布雷兹首脑&欧碧拉";
    var expedMap = "六本木商贸中心";
var expedItem = null; // 无需入场道具，设为null
// =====================================
    var list = "你想做什么？#b\r\n\r\n#L1#查看当前远征队成员#l\r\n#L2#开始战斗！#l\r\n#L3#解散远征队#l";
    
    player = cm.getPlayer();
    expedition = cm.getExpedition(exped);
    em = cm.getEventManager("Tokyo6");  // 调用event脚本名称

    if (mode == -1) {
        cm.dispose();
        return;
    }
    if (mode == 0) {
        cm.dispose();
        return;
    }

    if (expStatus == 0) {
        // 等级校验
        if (player.getLevel() < 130) {
            cm.sendOk("您的等级不符合挑战" + expedBoss + "的条件！\r\n需要至少130级。");
            cm.dispose();
        } else if (expedition == null) { // 无远征队，提示创建
            cm.sendSimple("#e#b<远征：" + expedName + ">\r\n#k#n" + em.getProperty("party") + "\r\n\r\n你想组建一支远征队来挑战 #r" + expedBoss + "#k 吗？\r\n#b#L1#创建远征队#l\r\n#L2#不，我想再等一会儿#l");
            expStatus = 1;
        } else if (expedition.isLeader(player)) { // 队长专属管理菜单
            if (expedition.isInProgress()) {
                cm.sendOk("你们的远征已经在进行中，为正在战斗的队员们祈祷吧！");
                cm.dispose();
            } else {
                cm.sendSimple(list);
                expStatus = 2;
            }
        } else if (expedition.isRegistering()) { // 远征队正在招募
            if (expedition.contains(player)) { // 已登记，等待队长
                cm.sendOk("你已经成功登记本次远征。请等待队长 #r" + expedition.getLeader().getName() + "#k 开始战斗。");
                cm.dispose();
            } else { // 未登记，自动加入
                var addResult = expedition.addMember(cm.getPlayer());
                cm.sendOk(addResult);
                cm.dispose();
            }
        } else if (expedition.isInProgress()) { // 远征已开始
            if (expedition.contains(player)) { // 已登记玩家可进入
                var eim = em.getInstance("Tokyo2_" + player.getClient().getChannel());
                if (eim != null && eim.getIntProperty("canJoin") == 1) {
                    eim.registerPlayer(player);
                } else {
                    cm.sendOk("你的远征队已经开始对抗" + expedBoss + "的战斗，无法再进入了。");
                }
                cm.dispose();
            } else { // 未登记玩家无法加入
                cm.sendOk("另一支远征队已经在挑战" + expedBoss + "了，请等待他们结束后再尝试。");
                cm.dispose();
            }
        }
    } else if (expStatus == 1) {
        if (selection == 1) { // 创建远征队
            // 无需入场道具，直接创建
            expedition = cm.getExpedition(exped);
            if (expedition != null) {
                cm.sendOk("已经有玩家创建了" + expedName + "远征队，你可以直接加入他们！");
                cm.dispose();
                return;
            }
            var res = cm.createExpedition(exped);
            if (res == 0) {
                cm.sendOk("#r" + expedBoss + " 远征队#k 创建成功！\r\n\r\n再次与我交谈可以查看成员、开始战斗或解散远征队。");
            } else if (res > 0) {
                cm.sendOk("抱歉，你今天已经达到了远征挑战次数上限！");
            } else {
                cm.sendOk("创建远征队时发生未知错误，请稍后重试。");
            }
            cm.dispose();
        } else if (selection == 2) { // 取消创建
            cm.sendOk("没关系，等你准备好再来挑战" + expedBoss + "吧！");
            cm.dispose();
        }
    } else if (expStatus == 2) {
        if (selection == 1) { // 查看远征队成员
            if (expedition == null) {
                cm.sendOk("远征队信息加载失败，请重新创建。");
                cm.dispose();
                return;
            }
            expedMembers = expedition.getMemberList();
            var size = expedMembers.size();
            if (size == 1) {
                cm.sendOk("目前远征队只有你一个人，需要至少1名队员才能开始战斗。");
                cm.dispose();
                return;
            }
            var text = "当前远征队成员（点击名字可踢出）：\r\n";
            text += "\r\n\t1. " + expedition.getLeader().getName() + "（队长）";
            for (var i = 1; i < size; i++) {
                text += "\r\n#b#L" + (i + 1) + "#" + (i + 1) + ". " + expedMembers.get(i).getValue() + "#l";
            }
            cm.sendSimple(text);
            expStatus = 6;
        } else if (selection == 2) { // 开始战斗
            var minMembers = exped.getMinSize();
            var currentSize = expedition.getMemberList().size();
            if (currentSize < minMembers) {
                cm.sendOk("远征队至少需要" + minMembers + "名成员才能开始战斗！当前只有" + currentSize + "人。");
                cm.dispose();
                return;
            }
            cm.sendOk("远征队即将出发！正在护送你们前往 #b" + expedMap + "#k...");
            expStatus = 4;
        } else if (selection == 3) { // 解散远征队
            const PacketCreator = Java.type('org.gms.util.PacketCreator');
            player.getMap().broadcastMessage(PacketCreator.serverNotice(6, expedition.getLeader().getName() + "的" + expedName + "远征队已解散。"));
            cm.endExpedition(expedition);
            cm.sendOk("远征队已成功解散。");
            cm.dispose();
        }
    } else if (expStatus == 4) { // 启动远征副本
        if (em == null) {
            cm.sendOk("远征系统初始化失败，请联系管理员！");
            cm.dispose();
            return;
        }
        em.setProperty("leader", player.getName());
        em.setProperty("channel", player.getClient().getChannel());
        if (!em.startInstance(expedition)) {
            cm.sendOk("当前频道已有其他远征队在挑战" + expedBoss + "，请更换频道或稍后再试！");
            cm.dispose();
            return;
        }
        cm.dispose();
    } else if (expStatus == 6) { // 踢人逻辑
        if (selection > 0) {
            var bannedMember = expedMembers.get(selection - 1);
            expedition.ban(bannedMember);
            cm.sendOk("已将 " + bannedMember.getValue() + " 踢出远征队。");
            cm.dispose();
        } else {
            cm.sendSimple(list);
            expStatus = 2;
        }
    }
}