var status;
var text;
var column = ["装备", "消耗", "设置", "其他", "商城"];
var sel;
var selectedSlot; // 新增：暂存待删除道具的格子位置


function start() {
    levelStart();
}

// 对话开始
function levelStart() {
    text = "#e如果你背包有无法丢弃的道具，可在这里删除#n\r\n\r\n";
    for (let i = 1; i <= 5; i++) {
        text += "#L" + i + "#删除" + column[i-1] + "栏的道具#l\r\n";
    }
    // 选择删除哪一栏
    cm.sendNextSelectLevel("ChooseInventory", text);
}

// 选择了背包栏
function levelChooseInventory(choose) {
    sel = choose;
    // 非GM直接进入删除指定道具，不显示"清除所有道具"选项
    if (!cm.getPlayer().isGM()) {
        levelChooseType2();
        return;
    }
    // GM显示两个选项
    cm.sendSelectLevel("ChooseType", "#L1#清除所有道具(GM专用)#l\r\n#L2#删除指定道具#l\r\n");
}

// 选择了删除方式1（清除所有道具，自带确认）
function levelChooseType1() {
    // 注意：sendYesNoLevel 第一个参数是"否"回调，第二个是"是"回调
    cm.sendYesNoLevel("Start", "DoClear", 
        "#r是否要清除 #e" + column[sel-1] + "栏#n 的所有道具？？？此操作不可逆！#k");
}

// 选择了删除方式2（删除指定道具）
function levelChooseType2() {
    text = "选择要删除的道具#r（装备为默认属性, 若闪退请用#e键盘#n操作）#k\r\n\r\n";
    let hasVal = false;
    for (let i = 0; i < 96; i++) {
        let item = cm.getInventory(sel).getItem(i);
        if (item) {
            hasVal = true;
            text += "#L" + item.getPosition() + "##z" + item.getItemId() + "##l\r\n";
        }
    }
    if (!hasVal) {
        // 回到levelStart
        cm.sendNextLevel("Start", "背包栏下没有道具！");
        return;
    }
    // 进入确认步骤（原为直接 DoRemove）
    cm.sendNextSelectLevel("ConfirmRemove", text);
}

// 新增：确认删除选定道具
function levelConfirmRemove(choose) {
    selectedSlot = choose;  // 暂存格子位置
    let targetItem = cm.getInventory(sel).getItem(selectedSlot);
    let itemName = targetItem ? " #t" + targetItem.getItemId() + "#  " : "该道具";
    
    // 注意：sendYesNoLevel 第一个参数是"否"回调，第二个是"是"回调
    // 所以"是"要删除 -> 放第二个参数，"否"返回列表 -> 放第一个参数
    cm.sendYesNoLevel("ChooseType2", "DoRemove", 
        "确定要删除 #b#e" + itemName + "#n#k 吗？此操作不可逆！");
}

// 清除全部
function levelDoClear() {
    cm.removeAllByInventory(sel);
    cm.sendOkLevel("Start", "清除完毕！");
    cm.dispose();
}

// 执行删除单个道具（是回调，无参，使用全局 selectedSlot）
function levelDoRemove() {
    cm.removeAllByInventorySlot(sel, selectedSlot);
    cm.sendOkLevel("ChooseType2", "清除完毕！");
    cm.dispose();
}