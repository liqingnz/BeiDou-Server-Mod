var status = 0;

function start() {
        	cm.sendYesNo("花费2000万金币，可直接学会三宠技能，是否学习？");
	}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (status == 1 && mode == 0) {
            cm.dispose();
            return;
        } else if (status >= 2 && mode == 0) {
            cm.dispose();
            return;
        }
        if (mode == 1)
            status++;
        else
            status--;
        if (status == 1) {
	 if (cm.getMeso() < 20000000) {
                          	cm.sendOk("#b需要2000W.....");
	        	cm.dispose();
	} else {
		cm.gainMeso(-20000000);
		cm.teachSkill(0000008,1,1,-1);  //教三宠技能
                          	cm.sendOk("学习三宠技能成功！");
		cm.dispose();  }
             }else {
		cm.dispose();
		}
	}
}