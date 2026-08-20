/* @whatdropsfrom 的对话界面：怪物选单 + 掉落分页。
 *
 * 与 MapleLand/whoDropsList.js 是一对（那边按物品找怪，这边按怪找物品），结构完全一样，
 * 理由也一样：翻页要求点击能回到服务端，npcTalk 那种一发了之的对话框做不到。
 *
 * 两处翻页形态不同，是对话框类型决定的，不是没统一：
 *   怪物选单走 sendNextSelectLevel → sendSimple，endBytes 为空，只认 #L 选项、不画按钮，
 *     所以翻页只能用 #L 拼，选项值取大正数避开页内下标；
 *   掉落页不需要 #L 选项，可以用客户端自带的上一步／下一步（sendLastNextLevel 一族），
 *     按钮不占正文行数——而正文行数正是这里最紧张的资源。
 *
 * 数据、掉率折算、立绘、每页条数、i18n 全在 WhatDropsFromCommand；这里只摆一页正文、
 * 挑 send 变体、把点击回传。query 句柄挂在本脚本变量上，dispose 时随 resetContext 一起没了。
 */
var WhatDropsFromCommand = Java.type("org.gms.client.command.commands.gm0.WhatDropsFromCommand");

// 怪物选单的翻页项：用大正数，避开页内下标 0..n-1
var PREV = 9000001;
var NEXT = 9000002;

var query = null;
var choiceRows = [];  // 怪物选单当前这一页的 [[怪物id, 怪物名], ...]
var choiceCount = 0;  // 搜到的怪物总数（不是当前页的条数）
var choicePage = 0;
var page = 0;

function start() {
    query = WhatDropsFromCommand.takeQuery(cm.getPlayer());
    choiceCount = WhatDropsFromCommand.getChoiceCount(query);
    if (choiceCount > 1) {
        choicePage = 0;
        showChoices();
        return;
    }
    // 只搜到一只时指令已经把掉落载好了，直接翻页
    if (WhatDropsFromCommand.getPageCount(query) === 0) {
        cm.sendOk("没有待查的怪物，请重新执行 #b@whatdropsfrom#k。");
        cm.dispose();
        return;
    }
    page = 0;
    showPage();
}

function showChoices() {
    choiceRows = WhatDropsFromCommand.getChoices(query, choicePage);
    if (choiceRows.length === 0) {
        cm.dispose();
        return;
    }
    var totalPages = WhatDropsFromCommand.getChoicePageCount(query);

    var text = "搜到 #b" + choiceCount + "#k 只怪物，想看哪一只的掉落？\r\n";
    for (var i = 0; i < choiceRows.length; i++) {
        text += "#L" + i + "##b" + choiceRows[i][1] + "#k#l\r\n";
    }
    if (totalPages > 1) {
        text += "\r\n";
        if (choicePage > 0) {
            text += "#L" + PREV + "#<< 上一页#l\r\n";
        }
        if (choicePage < totalPages - 1) {
            text += "#L" + NEXT + "#下一页 >>#l\r\n";
        }
        // 翻页项是 #L 链接，紧跟其后的纯文本会跟它挤在同一行，中间空一行隔开
        text += "\r\n当前第 " + (choicePage + 1) + " 页，共 " + totalPages + " 页";
    }
    cm.sendNextSelectLevel("WhatDropsPick", text);
}

function levelWhatDropsPick(selection) {
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
        cm.dispose();
        return;
    }
    if (!WhatDropsFromCommand.selectMob(query, choiceRows[sel][0])) {
        cm.sendOk("#r这只怪物没有掉落。#k");
        cm.dispose();
        return;
    }
    page = 0;
    showPage();
}

function showPage() {
    var text = WhatDropsFromCommand.renderPage(query, cm.getPlayer(), page);
    if (text === "") {
        cm.dispose();
        return;
    }

    var totalPages = WhatDropsFromCommand.getPageCount(query);
    if (totalPages > 1) {
        text += "\r\n当前第 " + (page + 1) + " 页，共 " + totalPages + " 页";
    }

    // 第 0 页的「上一步」用来回怪物选单——只有从选单进来的才有得回
    var hasPrev = page > 0 || choiceCount > 1;
    var hasNext = page < totalPages - 1;
    if (hasPrev && hasNext) {
        cm.sendLastNextLevel("WhatDropsPrev", "WhatDropsNext", text);
    } else if (hasNext) {
        cm.sendNextLevel("WhatDropsNext", text);
    } else if (hasPrev) {
        cm.sendLastLevel("WhatDropsPrev", text);
    } else {
        cm.sendOkLevel("WhatDropsDone", text);
    }
}

function levelWhatDropsPrev() {
    if (page > 0) {
        page--;
        showPage();
    } else {
        showChoices();
    }
}

function levelWhatDropsNext() {
    page++;
    showPage();
}

function levelWhatDropsDone() {
    cm.dispose();
}
