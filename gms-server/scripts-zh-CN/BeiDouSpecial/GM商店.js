var status = 0;
var shopList = [
    //{npc: 9201099, name: "新叶城隐藏商店1（万能药/雪碧/箭矢）"},
    {npc: 9201101, name: "新叶城隐藏商店（属性药水）"},
    {npc: 1337, name: "GM商店1（GM套装/必成卷）"},
    {npc: 1338, name: "新叶城商店（干姜水/瞬移石）"},
    {npc: 9999992, name: "GM宠物商店"},
    {npc: 9999993, name: "GM喇叭商店"},
    {npc: 9999994, name: "GM椅子商店"},
    {npc: 9999995, name: "GM点装戒指商店"},
    {npc: 9999996, name: "GM表情/眼饰/脸饰商店"},
    {npc: 9999997, name: "GM点装武器/防具商店"},
    {npc: 9999998, name: "GM商店2（武器卷/龙王石）"},
    {npc: 9999999, name: "GM商店3（高级装备）"}
];

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == 1) {
        status++;
    } else {
        cm.dispose();
        return;
    }
    
    if (status == 0) {
        var menu = "请选择要打开的商店：";
        for (var i = 0; i < shopList.length; i++) {
            menu += "\r\n#L" + i + "#" + shopList[i].name + "#l";
        }
        cm.sendSimple(menu);
    } else if (status == 1) {
        if (selection >= 0 && selection < shopList.length) {
            cm.openShopNPC(shopList[selection].npc);
        } else {
            cm.sendOk("选择无效，请重新执行脚本。");
        }
        cm.dispose();
    }
}