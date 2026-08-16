/*
 * 卷轴回收（移植自 LichKingMod 6f78f347）：在魔女麦乐迪处把不要的卷轴回收成点数
 * （1 张 1 点），攒 20 点换 1 张指定卷轴。点数只在当次对话内有效，关闭即清零。
 */
var status;
var selectedType = 0;
var currentPoint = 0;
var invList = [];

const InventoryType = Java.type('org.gms.client.inventory.InventoryType');

// 可兑换的卷轴（各部位 10% 卷 + 武器攻击卷），每张 20 点
var scrollList = [2041014, 2040534, 2040419, 2040323, 2041023, 2040517, 2040412, 2040502, 2040031, 2040318, 2041020, 2040627, 2040705, 2040026, 2040302, 2040514, 2041017,
    2043002, 2044002, 2044302, 2044402, 2044502, 2044602, 2044702, 2043302, 2044902, 2044802
];

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode < 0) {
        cm.dispose();
        return;
    }
    if (mode == 0 && type > 0) {
        cm.dispose();
        return;
    }
    if (mode == 1) {
        status++;
    } else {
        status--;
    }

    if (status == 0) {
        // 扫描消耗栏收集可回收卷轴（排除 100% 成功率的）
        invList = [];
        var inv = cm.getPlayer().getInventory(InventoryType.USE);
        for (var i = 1; i <= 96; i++) {
            var tempItem = inv.getItem(i);
            if (!cm.isRecyclableScroll(tempItem, true)) {
                continue;
            }
            invList.push([tempItem.getItemId(), tempItem.getQuantity()]);
        }
        action(1, 0, 0);
    } else if (status == 1) {
        cm.sendSimple("当前拥有 #b" + currentPoint + "#k 回收点数。\r\n点数只能当次兑换使用，兑换完成清零。选择你的操作：\r\n#b#L1#回收卷轴#l\r\n#L2#兑换卷轴#l");
    } else if (status == 2) {
        selectedType = selection;
        var txt;
        if (selectedType == 1) {
            txt = "当前拥有 #b" + currentPoint + "#k 回收点数，想要回收哪些卷轴：";
            for (var i = 0; i < invList.length; i++) {
                txt += "\r\n#L" + i + "##i" + invList[i][0] + "##z" + invList[i][0] + "# - #b" + invList[i][1] + " #k回收点数#l";
            }
        } else {
            txt = "当前拥有 #b" + currentPoint + "#k 回收点数，可兑换卷轴：";
            for (var i = 0; i < scrollList.length; i++) {
                txt += "\r\n#L" + i + "##i" + scrollList[i] + "##z" + scrollList[i] + "# - #r20 #k回收点数#l";
            }
        }
        cm.sendSimple(txt);
    } else if (status == 3) {
        status = 0;
        if (selectedType == 1) {
            if (selection < 0 || selection >= invList.length) {
                cm.dispose();
                return;
            }
            currentPoint += invList[selection][1];
            cm.gainItem(invList[selection][0], -invList[selection][1]);
            invList.splice(selection, 1);
            action(1, 0, 0);
        } else {
            if (cm.canHold(scrollList[selection], 1)) {
                if (currentPoint >= 20) {
                    currentPoint -= 20;
                    cm.gainItem(scrollList[selection], 1);
                    action(1, 0, 0);
                } else {
                    cm.sendOk("回收点数不够！");
                }
            } else {
                cm.sendOk("背包没有足够的空间！");
            }
        }
    } else {
        cm.dispose();
    }
}
