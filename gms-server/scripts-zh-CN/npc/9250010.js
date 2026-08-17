var status = 0;
var menu;
var payment = false;
var atTown1 = false;

function start() {
    if (cm.getPlayer().getMap().getId() == 500000000) { //判断是否在指定地图
        atTown1 = true;
    }

    if (cm.haveItem(4031242)) {  //地图传送，使用优惠券，4031242是海豚出租车使用券
        if (atTown1) {
            menu = "#L0##b我想用 #t4031242##k 前往 #b#m501000000##k.#l\r\n#L1#前往 #b#m500020400##k 需支付 #b5000金币#k.#l";
        } else {
            menu = "#L0##b我想用 #t4031242##k 前往 #b#m500000000##k.#l";
        }
    } else {  	//地图传送，无优惠券
        if (atTown1) {
            menu = "#L0#前往 #b#m501000000##k.#l\r\n#L1#前往 #b#m500020400##k 需支付 #b5000金币#k.#l";
        } else {
            menu = "#L0#前往 #b#m500000000##k.#l";
        }
        payment = true;
    }
    cm.sendSimple("你好！我是这里的出租车司机#b普索#k。给我3000金币，\r\n我会带你安全地送到别的地点.\r\n"+menu);
}

function action(mode, type, selection) {
    if (mode < 1) {
        cm.dispose();
    } else {
        if (selection == 0) {
            if (payment) {
                if (cm.getPlayer().getMeso() < 3000) {
                    cm.sendOk("我认为你没有足够的钱……");
                    cm.dispose();
                } else {
                    cm.gainMeso(-3000);

                }
            } else {
                cm.gainItem(4031242, -1);
            }
            cm.warp(atTown1 ? 501000000 : 500000000, 3);
            cm.dispose();
            return;
        } else if (selection == 1) {
            if (cm.getPlayer().getMeso() < 5000) {
                cm.sendOk("我认为你没有足够的钱……");
                cm.dispose();
                return;
            } else {
                cm.gainMeso(-5000);
                cm.warp(500020400, 1);
            }
        }
        else if (selection == 2) { //第三个选项备用
            if (cm.getPlayer().getMeso() < 5000) {
                cm.sendOk("我认为你没有足够的钱……");
                cm.dispose();
                return;
            } else {
                cm.gainMeso(-5000);
            }
        }
        cm.dispose();
    }
}
