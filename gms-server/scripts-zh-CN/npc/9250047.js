/**
 * 通用组队副本脚本 -- 黄金寺庙-六手邪神
 * @author: @Magical-H
 * @fixed 副本内改用 action 模式原生 sendYesNo 询问是否离开；队长进入消耗 1 个 4031722；新增65级等级限制
 * 修复：判断是否有人不在当前地图，检查队员的前置任务是否完成
 */
const EventName = 'TaiZa' , PartyName = '六手邪神';
const EventLevel = 1;           //怪物HP倍率，提高此值可以成倍提高怪物血量。
const entryMap = 501030105;     //进入的地图ID
const recruitMap = 501030104;   //必须在此地图才能接任务
const OpenRemotely = false;     //是否允许远程打开，只允许在指定地图打开，其它地图无法打开。
const QuestID = 0 ;           //需要完成的前置任务ID（4432），改成0则为不限制前置
const EntryItem = 4031722; // 入场消耗道具
const MinLevel = 65;        // 最低等级限制

var status = 0;
var state;
var em = null;
var PartyInfo = null;

function start(){
    var mapId = cm.getMapId();

    // 副本内：直接走 action 模式，原生 sendYesNo
    if (mapId == entryMap) {
        status = -1;
        action(1, 0, 0);
        return;
    }

    // 入口地图：走原有的 level 逻辑
    if(!OpenRemotely && mapId != recruitMap) {
        level();
        return;
    }
    if(QuestID != null && QuestID > 0 && !cm.isQuestCompleted(QuestID)) {
        cm.sendOkLevel('','尚未完成前置任务。');
        return;
     }
    if(em == null) {
        em = cm.getEventManager(EventName);
        PartyInfo = em.getProperty("party");
    }
    if (em == null || em.getName() != EventName) {
        cm.sendOkLevel('',`#e#b<组队任务> ${PartyName}#k#n 遇到了一个错误。`);
    } else {
        levelStart();
    }
}

// 副本内专用：action 模式 YesNo 处理
function action(mode, type, selection) {
    if (mode != 1) {
        cm.dispose();
        return;
    }
    status++;
    if (status == 0) {
        cm.sendYesNo("你想要离开这里吗？离开后无法返回...");
    } else {
        cm.warp(recruitMap, 0);
        cm.dispose();
    }
}

function level() {
    cm.dispose();
}

function levelnull() {
    level();
}

function levelStart() {
    var msg = `#e#b<组队任务> ${PartyName}#n\r\n${PartyInfo}#k\r\n\r\n`;
        msg += `你想要挑战六手邪神？请让你的队长来与我交谈。\r\n挑战需要消耗#b队长#k一个#r#z4031722##k。#b\r\n`;
        msg += `#L0#我想参与挑战。#l\r\n`;
        msg += `#L1#我想 ${(cm.getPlayer().isRecvPartySearchInviteEnabled() ? "关闭" : "开启")} 组队搜索。#l\r\n`;
        msg += `#L2#我想了解更多细节。#l`;
    cm.sendSelectLevel(msg);
}

function level0() {
    var msg;
    if (cm.getParty() == null) {
        msg = "只有当你加入一个队伍时，才能参与挑战。";
    } else if (!cm.isLeader()) {
        msg = "必须由你的队长与我交谈才能开始挑战。";
    } else {
        var party = cm.getParty();
        var members = party.getPartyMembers();
        var canGoIn = true;
        var cause;

        // 1. 检查所有队员是否在当前地图
        if (members.size() != cm.getPlayer().getPartyMembersOnSameMap().size()) {
            canGoIn = false;
            cause = "队伍里有人不在当前地图，无法开始挑战。";
        }

        // 2. 检查所有队员等级 ≥ 65 级
        if (canGoIn) {
            for (var i = 0; i < members.size(); i++) {
                var chr = members.get(i).getPlayer();
                if (chr.getLevel() < MinLevel) {
                    canGoIn = false;
                    cause = "有队员等级不足" + MinLevel + "级，无法开始挑战。";
                    break;
                }
            }
        }

        // 3. 检查所有队员前置任务
        if (canGoIn && QuestID != null && QuestID > 0) {
            for (var i = 0; i < members.size(); i++) {
                var chr = members.get(i).getPlayer();
                if (chr.getQuestStatus(QuestID) != 2) {
                    canGoIn = false;
                    cause = "有队员未完成前置任务，无法开始挑战。";
                    break;
                }
            }
        }

        // 4. 检查队长是否持有入场道具
        if (!cm.haveItem(EntryItem)) {
            cm.sendOk("你没有#r#z4031722##k，去完成前置任务来获得吧。");
            cm.dispose();
            return;
        }

        if (!canGoIn) {
            msg = cause;
        } else {
            var eli = em.getEligibleParty(cm.getParty());
            if (eli.size() > 0) {
                if (!em.startInstance(cm.getParty(), cm.getPlayer().getMap(), EventLevel)) {
                    msg = "另一个队伍已经进入了该频道的#r组队任务#k。请尝试其他频道，或者等待当前队伍完成。";
                } else {
                    // 开启副本成功：从队长背包扣除 1 个入场道具
                    cm.gainItem(EntryItem, -1);
                }
            } else {
                list = em.getEligibleParty(cm.getParty());
                msg = "你目前无法开始这个组队任务，因为你的队伍可能不符合人数要求，有些队员可能不符合参与条件，或者他们不在这张地图上。如果你找不到队员，可以尝试使用组队搜索功能。\r\n";
            }
        }
    }
    if(msg) {
        cm.sendOkLevel('',msg);
    } else {
        level();
    }
}

function level1() {
    var psState = cm.getPlayer().toggleRecvPartySearchInvite();
    cm.sendOkLevel('',"你的组队搜索状态现在是：#b" + (psState ? "启用" : "禁用") + "#k。想要改变状态时随时找我谈谈。");
}

function level2() {
    cm.sendOkLevel('',`#e#b<组队任务> ${PartyName}#k#n\r\n带领你的队员到#e#b#m${entryMap}##n#k进行调查并解决问题的源头。`);
}