var status = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    cm.openShopNPC(11100);   
//    cm.openShopNPC(11100);    //打开杂货商店（火焰的眼、万能、魔法石等，价格贵）
//    cm.openShopNPC(9201058);    //打开新叶城防具商店
//    cm.openShopNPC(9201059);    //打开新叶城武器商店
//    cm.openShopNPC(9201060);    //打开新叶城药水商店
//    cm.openShopNPC(9201099);    //打开新叶城隐藏商店1（万能、雪碧、钻石弓弩箭矢等，价格便宜）
//    cm.openShopNPC(9201101);    //打开新叶城隐藏商店2（各种变态加属性药水，价格贵）
//    cm.openShopNPC(1337);    //打开GM专用商店1（GM套装、白色必成卷、高级装备等，全部1金币）
//    cm.openShopNPC(1338);    //打开类似新叶城商店（干姜水+高级瞬移之石）
//    cm.openShopNPC(9999992);    //打开GM宠物商店（宠物和宠物用品全部1金币）
//    cm.openShopNPC(9999993);    //打开GM喇叭商店（全部1金币）
//    cm.openShopNPC(9999994);    //打开GM椅子商店（全部1金币）
//    cm.openShopNPC(9999995);    //打开GM点装戒指商店（全部1金币）
//    cm.openShopNPC(9999996);    //打开GM表情、眼饰、脸饰商店（全部1金币）
//    cm.openShopNPC(9999997);    //打开GM点装武器帽子耳环衣服鞋子商店（全部1金币，种类不是很多）
//    cm.openShopNPC(9999998);    //打开GM专用商店2（100%武器必成卷轴、混沌祝福、暗黑龙王石，全部1金币）
//    cm.openShopNPC(9999999);    //打开GM专用商店3（GM套装、高级装备等，全部1金币）
    cm.dispose();
}