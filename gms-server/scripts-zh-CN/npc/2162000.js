/**
 * @description 玫瑰花园兑换NPC
 * @author hzh
 * @fixed 修复确认框材料数量不显示的问题，移除图标标签改用纯文字展示
 * 兑换规则：
 * 1. 4030037 × 200 → 1113089 × 1
 * 2. 4030037 × 300 + 1113089 × 1 → 1113282 × 1
 */
var status = 0;
var sel = 0;

// 兑换配置表
var exchangeList = [
    {
        rewardId: 1113089,
        rewardCount: 1,
        materials: [
            {id: 4030037, count: 200}
        ]
    },
    {
        rewardId: 1113282,
        rewardCount: 1,
        materials: [
            {id: 4030037, count: 300},
            {id: 1113089, count: 1}
        ]
    }
];

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
        return;
    }
    if (mode == 0) {
        cm.dispose();
        return;
    }
    if (mode == 1) {
        status++;
    } else {
        status--;
    }

    if (status == 0) {
        // 第一步：选择兑换（主界面保留图标）
        var text = "这里是国王和王妃的玫瑰园...\r\n\r\n你需要兑换什么吗~\r\n\r\n";
        text += "#L1##v1113089##z1113089##l\r\n\r\n";
        text += "#L2##v1113282##z1113282##l\r\n\r\n";
        text += "#L0#离开#l";
        cm.sendSimple(text);

    } else if (status == 1) {
        // 第二步：确认兑换（纯文字展示材料数量，确保正常显示）
        if (selection == 0) {
            cm.dispose();
            return;
        }
        sel = selection - 1;

        if (sel < 0 || sel >= exchangeList.length) {
            cm.sendOk("#r你的材料不足...#k");
            cm.dispose();
            return;
        }

        var data = exchangeList[sel];
        var msg = "#e确认兑换#n\r\n\r\n";
        msg += "#v" + data.rewardId + "##z" + data.rewardId + "#  ×" + data.rewardCount + "\r\n";
        msg += "————————————\r\n";
        msg += "所需材料：\r\n";

        var enough = true;
        for (var i = 0; i < data.materials.length; i++) {
            var mat = data.materials[i];
            var have = cm.itemQuantity(mat.id);
            var color = have >= mat.count ? "#b" : "#r";
            msg += color + "#v" + mat.id + "##z" + mat.id + "#    需要 " + mat.count + " 个，当前持有 " + have + " 个#k\r\n";
            if (have < mat.count) {
                enough = false;
            }
        }

        msg += "————————————\r\n";
        if (!enough) {
            msg += "#r燃烧能量可以在秘密庭院获得...#k";
            cm.sendNext(msg);
            status--;
            return;
        }
        msg += "确定要兑换吗？";
        cm.sendYesNo(msg);

    } else if (status == 2) {
        // 第三步：执行兑换
        if (sel < 0 || sel >= exchangeList.length) {
            cm.sendOk("#r兑换数据异常#k");
            cm.dispose();
            return;
        }

        var data = exchangeList[sel];

        // 二次校验材料
        for (var i = 0; i < data.materials.length; i++) {
            var mat = data.materials[i];
            if (cm.itemQuantity(mat.id) < mat.count) {
                cm.sendOk("#r材料不足，兑换失败#k");
                cm.dispose();
                return;
            }
        }

        // 背包空间检测
        if (!cm.canHold(data.rewardId, data.rewardCount)) {
            cm.sendOk("#r背包空间不足，请清理后再来#k");
            cm.dispose();
            return;
        }

        // 扣除材料
        for (var i = 0; i < data.materials.length; i++) {
            var mat = data.materials[i];
            cm.gainItem(mat.id, -mat.count);
        }

        // 发放奖励
        cm.gainItem(data.rewardId, data.rewardCount, true ,true);
        cm.sendOk("兑换成功！获得 #b#v" + data.rewardId + "##k。");
        cm.dispose();
    }
}