/**
 *9330048 

 */
var status = 0;

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
            cm.sendNext("我就是101第一猛男。看我的肌肉，帅吧！");
    } else if (status == 1){
            cm.openShopNPC(9330048); 
            cm.dispose();
    } 
        return;
}