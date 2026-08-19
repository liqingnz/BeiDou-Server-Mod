/* @whodrops 按物品名搜到多件时的选择清单。
 *
 * 「智力卷轴」这类关键字一搜就是头盔／铠甲／披风各一版，全铺出来既看不清也撑爆对话框，
 * 所以先让玩家挑一件，再查那件的掉落源。只搜到一件时 WhoDropsCommand 直接出结果，
 * 不会拉起本脚本。
 *
 * 候选清单在指令里已经算好并暂存（takeChoices 取走即清），这里不重跑那趟全表模糊匹配。
 * 查掉落源也交回 WhoDropsCommand.showDroppers：立绘、掉率折算、条数上限的口径
 * 与「只搜到一件」那条路必须一致，在这儿抄一遍迟早会漂。
 */
var WhoDropsCommand = Java.type("org.gms.client.command.commands.gm0.WhoDropsCommand");

var choices = [];   // [[物品id, 物品名], ...]，下标即选项序号

function start() {
    choices = WhoDropsCommand.takeChoices(cm.getPlayer());
    if (choices.length === 0) {
        cm.sendOk("没有待选的物品，请重新执行 #b@whodrops#k。");
        cm.dispose();
        return;
    }

    var text = "搜到 #b" + choices.length + "#k 件物品，想看哪一件的掉落来源？\r\n";
    for (var i = 0; i < choices.length; i++) {
        text += "#L" + i + "##v" + choices[i][0] + "##z" + choices[i][0] + "##l\r\n";
    }
    cm.sendNextSelectLevel("WhoDrops", text);
}

function levelWhoDrops(selection) {
    if (selection >= 0 && selection < choices.length) {
        // 与 gotoList.js 同序：先干活再 dispose。dispose 只是发 enableActions 解锁客户端，
        // 不会关掉 showDroppers 刚开的那个对话框
        WhoDropsCommand.showDroppers(cm.getPlayer(), choices[selection][0]);
    }
    cm.dispose();
}
