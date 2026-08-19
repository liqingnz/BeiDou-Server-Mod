/* @whodrops 的对话界面：物品选单 + 掉落源翻页。
 *
 * 为什么要走脚本：掉落源多的物品实测能到 800 多个，一屏装不下，而客户端对话框高度固定
 * 又没有滚动条——装不下的部分不是被服务端截掉，是压根没画出来。翻页需要「点了还能回到
 * 服务端」，npcTalk 那种一发了之的对话框做不到。
 *
 * 分工：数据、掉率折算、立绘、每页条数全在 WhoDropsCommand 里（i18n 也在那边），
 * 这里只负责把一页正文摆出来、加上翻页控件、把点击回传。会话状态挂在角色身上，
 * 翻页不会把 drop_data 查询或全表模糊匹配重跑一遍。
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

// 翻页与导航用大正数，避开物品 id
var PREV = 9000001;
var NEXT = 9000002;
var BACK = 9000003;

var choices = [];     // [[物品id, 物品名], ...]，下标即选项序号
var page = 0;

function start() {
    choices = WhoDropsCommand.getChoices(cm.getPlayer());
    if (choices.length > 1) {
        showChoices();
        return;
    }
    // 只搜到一件时指令已经把掉落源载好了，直接翻页
    if (WhoDropsCommand.getPageCount(cm.getPlayer()) === 0) {
        cm.sendOk("没有待查的物品，请重新执行 #b@whodrops#k。");
        finish();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    var text = "搜到 #b" + choices.length + "#k 件物品，想看哪一件的掉落来源？\r\n";
    for (var i = 0; i < choices.length; i++) {
        text += "#L" + i + "##v" + choices[i][0] + "##z" + choices[i][0] + "##l\r\n";
    }
    cm.sendNextSelectLevel("WhoDrops", text);
}

function showPage() {
    var body = WhoDropsCommand.renderPage(cm.getPlayer(), page);
    if (body === "") {
        finish();
        return;
    }

    var totalPages = WhoDropsCommand.getPageCount(cm.getPlayer());
    var text = body + "\r\n";
    if (page > 0) {
        text += "#L" + PREV + "#<< 上一页#l\r\n";
    }
    if (page < totalPages - 1) {
        text += "#L" + NEXT + "#下一页 >>#l\r\n";
    }
    if (totalPages > 1) {
        text += "当前第 " + (page + 1) + " 页，共 " + totalPages + " 页\r\n";
    }
    if (choices.length > 1) {
        // 从选单进来的才给「返回」，直接查一件的没有上一级可回
        text += "\r\n#L" + BACK + "#返回物品列表#l";
    }

    cm.sendNextSelectLevel("WhoDrops", text);
}

function levelWhoDrops(selection) {
    var sel = parseInt(selection);

    if (sel === PREV) {
        page--;
        showPage();
        return;
    }
    if (sel === NEXT) {
        page++;
        showPage();
        return;
    }
    if (sel === BACK) {
        showChoices();
        return;
    }
    // 其余是物品选单的下标
    if (sel >= 0 && sel < choices.length) {
        if (!WhoDropsCommand.selectItem(cm.getPlayer(), choices[sel][0])) {
            cm.sendOk("#r这件物品没有掉落记录。#k");
            finish();
            return;
        }
        page = 0;
        showPage();
        return;
    }
    finish();
}

/** 收尾：会话不清会把整份掉落源一直挂在内存里 */
function finish() {
    WhoDropsCommand.endSession(cm.getPlayer());
    cm.dispose();
}
