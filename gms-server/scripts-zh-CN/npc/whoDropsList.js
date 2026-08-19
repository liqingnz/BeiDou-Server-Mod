/* @whodrops 的对话界面：物品选单 + 掉落源翻页。
 *
 * 为什么要走脚本：掉落源多的物品实测能到 800 多个，一屏装不下，而客户端对话框高度固定
 * 又没有滚动条——装不下的部分不是被服务端截掉，是压根没画出来。翻页需要「点了还能回到
 * 服务端」，npcTalk 那种一发了之的对话框做不到。
 *
 * 翻页用的是**客户端自带的「上一步／下一步」按钮**（sendLastNextLevel → sendNextPrev），
 * 不是拿 #L 拼假选项：按钮在客户端固定位置，不占正文行数，也不用编一套大数字选项 id
 * 去避开物品 id。NPCScriptManager.nextLevel 按 mode 分派——0=上一步、1=下一步、-1=结束对话。
 * 按钮该不该出现由每页自己挑 send 变体决定：
 *   两边都有  → sendLastNextLevel   只有下一页 → sendNextLevel
 *   只有上一页 → sendLastLevel       两边都没有 → sendOkLevel
 * 所以按钮永远名副其实，不会出现「点了下一步却什么也没有」。
 *
 * 分工：数据、掉率折算、立绘、每页条数全在 WhoDropsCommand 里（i18n 也在那边），
 * 这里只负责摆一页正文、挑 send 变体、把点击回传。会话状态挂在角色身上，
 * 翻页不会把 drop_data 查询或全表模糊匹配重跑一遍。
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

// 物品选单的翻页项：用大正数，避开页内下标 0..n-1
var PREV = 9000001;
var NEXT = 9000002;

var query = null;   // 本次查询的句柄，随对话框关闭一起消失（服务端不留）
var choiceRows = [];  // 物品选单当前这一页的 [[物品id, 物品名], ...]
var choiceCount = 0;  // 搜到的物品总数（不是当前页的条数）
var choicePage = 0;
var page = 0;

function start() {
    query = WhoDropsCommand.takeQuery(cm.getPlayer());
    choiceCount = WhoDropsCommand.getChoiceCount(query);
    if (choiceCount > 1) {
        choicePage = 0;
        showChoices();
        return;
    }
    // 只搜到一件时指令已经把掉落源载好了，直接翻页
    if (WhoDropsCommand.getPageCount(query) === 0) {
        cm.sendOk("没有待查的物品，请重新执行 #b@whodrops#k。");
        finish();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    choiceRows = WhoDropsCommand.getChoices(query, choicePage);
    if (choiceRows.length === 0) {
        finish();
        return;
    }
    var totalPages = WhoDropsCommand.getChoicePageCount(query);

    var text = "搜到 #b" + choiceCount + "#k 件物品，想看哪一件的掉落来源？\r\n";
    for (var i = 0; i < choiceRows.length; i++) {
        text += "#L" + i + "##v" + choiceRows[i][0] + "##z" + choiceRows[i][0] + "##l\r\n";
    }
    // 选单是 sendSimple 类型的对话框，只认 #L 选项，没有原生的上一步／下一步按钮，
    // 所以这里的翻页只能自己拼。选项值用大正数，避开上面的页内下标
    if (totalPages > 1) {
        text += "\r\n";
        if (choicePage > 0) {
            text += "#L" + PREV + "#<< 上一页#l\r\n";
        }
        if (choicePage < totalPages - 1) {
            text += "#L" + NEXT + "#下一页 >>#l\r\n";
        }
        text += "当前第 " + (choicePage + 1) + " 页，共 " + totalPages + " 页";
    }
    cm.sendNextSelectLevel("WhoDropsPick", text);
}


function levelWhoDropsPick(selection) {
    var sel = parseInt(selection);
    if (sel === PREV) {
        choicePage--;
        showChoices();
        return;
    }
    if (sel === NEXT) {
        choicePage++;
        showChoices();
        return;
    }
    if (sel < 0 || sel >= choiceRows.length) {
        finish();
        return;
    }
    if (!WhoDropsCommand.selectItem(query, choiceRows[sel][0])) {
        cm.sendOk("#r这件物品没有掉落记录。#k");
        finish();
        return;
    }
    page = 0;
    showPage();
}


function showPage() {
    var text = WhoDropsCommand.renderPage(query, cm.getPlayer(), page);
    if (text === "") {
        finish();
        return;
    }

    var totalPages = WhoDropsCommand.getPageCount(query);
    if (totalPages > 1) {
        text += "\r\n当前第 " + (page + 1) + " 页，共 " + totalPages + " 页";
    }

    // 第 0 页的「上一步」用来回物品选单——只有从选单进来的才有得回
    var hasPrev = page > 0 || choiceCount > 1;
    var hasNext = page < totalPages - 1;
    if (hasPrev && hasNext) {
        cm.sendLastNextLevel("WhoDropsPrev", "WhoDropsNext", text);
    } else if (hasNext) {
        cm.sendNextLevel("WhoDropsNext", text);
    } else if (hasPrev) {
        cm.sendLastLevel("WhoDropsPrev", text);
    } else {
        cm.sendOkLevel("WhoDropsDone", text);
    }
}

function levelWhoDropsPrev() {
    if (page > 0) {
        page--;
        showPage();
    } else {
        showChoices();
    }
}

function levelWhoDropsNext() {
    page++;
    showPage();
}

function levelWhoDropsDone() {
    finish();
}

/** query 挂在本脚本的变量上，dispose 时随 resetContext 一起没了，不用另外通知服务端清理 */
function finish() {
    cm.dispose();
}
