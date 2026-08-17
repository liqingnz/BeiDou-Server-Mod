var itemSet = Array(
Array(4000313,500000),                     //（物品代码，金币数）
Array(4001086,20000000),
Array(3992041,20000000),
Array(5150044,20000000),
Array(4006000,10000),
Array(4006001,10000),
Array(4031179,1500000),
Array(4001017,6000000),
Array(4001107,1000000),
Array(4161021,1000000),
Array(4161018,1000000),
Array(4161015,1000000),
Array(4161016,1000000),
Array(4001110,1000000),
Array(4001111,1000000),
Array(4001112,1000000)
);

var status = 0;
var selectedItem;
var item;
var cost;
var qty;
var co;

function start() {
    action(1, 0, 0);
}

function action(mode, type, selection) {
    status++;
    if (mode == -1){
        cm.dispose();
        return;
    } else if (mode == 0) {
        // cm.sendOk("欢迎下次再来!.");
    	cm.dispose();
    	return;
    }
    if (status == 1) {
            var add ="请选择你想购买的物品\r\n";
            add += "#d金币余额：#b" + cm.getMeso()+ "#k          ";
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "\r\n#L" + i + "##v " + itemSet[i][0] + "#";
                    add += "         需要金币:" + itemSet[i][1]/10000+"万";
                };

            cm.sendSimple(add);
    } else if (status == 2) {
            selectedItem = selection;
            item = itemSet[selectedItem][0];
            co = itemSet[selectedItem][1];
            var bdd ="你想要兑换：\r\n";
            bdd += "\r\n#i" +item+"# "+ " #t" + item + "#";
            bdd += "单个物品需要金币:#r " + co/10000 + "万\r\n\r\n\r\n";
            bdd += "请输入购买个数\r\n";
            cm.sendGetNumber(bdd,1,1,100)
    } else if (status == 3) {
	qty = (selection > 0) ? selection : (selection < 0 ? -selection : 1);
           cm.sendYesNo("你确定要兑换：" + qty + "个#b#t" + item + "##k吗？\r\n");
    } else if (status == 4) {
	cost=co*qty;   //花费为物品单价*输入的数量
            if (cm.getMeso() < cost) {
                        cm.sendOk("金币不足。");
	        cm.dispose();
            } else {
            	        cm.gainMeso(-cost);
            	        cm.gainItem(item,qty);
                        cm.sendOk("购买成功。");
	        cm.dispose();
            }
            cm.dispose();
    }
}
