/**
 * @description 转生, 可转生10次
 * @author hzh
 */

var InventoryType = Java.type('org.gms.client.inventory.InventoryType');
var ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');
var InventoryManipulator = Java.type('org.gms.client.inventory.manipulator.InventoryManipulator');
var iip = ItemInformationProvider.getInstance();
var ByteBufInPacket = Java.type('org.gms.net.packet.ByteBufInPacket');
var RecvOpcode = Java.type('org.gms.net.opcodes.RecvOpcode');
var Unpooled = Java.type('io.netty.buffer.Unpooled');
var ByteBuf = Java.type('io.netty.buffer.ByteBuf');
var Charset = Java.type('java.nio.charset.Charset');
var CharBuffer = Java.type('java.nio.CharBuffer');
var ByteBuffer = Java.type('java.nio.ByteBuffer');
var text;
var times = -1;
var gmLevel = 0;
var relife = { // giftAp: 转生后赠送的属性点, hpmp 转生后的HP与MP
	1: {k:"转生一转", v:"completed", giftAp:200,  hpmp:200},
	2: {k:"转生二转", v:"completed", giftAp:400, hpmp:400},
	3: {k:"转生三转", v:"completed", giftAp:600, hpmp:600},
	4: {k:"转生四转", v:"completed", giftAp:800, hpmp:800},
	5: {k:"转生五转", v:"completed", giftAp:1000, hpmp:1000},
	6: {k:"转生六转", v:"completed", giftAp:1200, hpmp:1200},
	7: {k:"转生七转", v:"completed", giftAp:1400, hpmp:1400},
	8: {k:"转生八转", v:"completed", giftAp:1600, hpmp:1600},
	9: {k:"转生九转", v:"completed", giftAp:1800,hpmp:1800},
	10:{k:"转生十转", v:"completed", giftAp:2000,hpmp:2000},
};
var gift = { // 10次转生赠送的属性点装
	// (物品ID,力, 敏, 智, 运, Hp,  Mp, 物攻,魔攻,物防,魔防,命中,回避,hands,移速,跳跃,upgradeSlot,过期)
	1: [1112904,5,  5,  5,  5,  200, 100, 5,  5,  20, 20, 10,10, 0,40, 8, 0, -1], // 彩虹星环绕戒指
	2: [1112908,10, 10, 10, 10, 400, 200, 10, 10, 50, 50, 10,10, 0, 0, 0, 0, -1], // 极光戒指
	3: [1112908,18, 18, 18, 18, 500, 350, 18, 18, 80, 80, 10,10, 0, 0, 0, 0, -1], // 极光戒指
	4: [1112908,25, 25, 25, 25, 800, 600, 25, 25, 100,100,10,10, 0, 0, 0, 0, -1], // 极光戒指
	5: [1102196,40, 40, 40, 40, 1000,800, 40, 40, 120,120,10,10, 0, 0, 0, 0, -1], // 点点星光围巾
	6: [1012057,60, 60, 60, 60, 1200,1000,60, 60, 140,140,10,10, 0, 0, 0, 0, -1], // 透明面具
	7: [1002186,80, 80, 80, 80, 1500,1200,80, 80, 180,180,10,10, 0, 0, 0, 0, -1], // 透明帽
	8: [1082249,120,120,120,120,1800,1500,100,100,200,200,10,10, 0, 0, 0, 0, -1], // 荧光亮丽手镯
	9: [1022079,160,160,160,160,2000,2000,120,120,220,220,10,10, 0, 0, 0, 0, -1], // 透明眼镜
	10:[1032024,200,200,200,200,2000,2000,150,150,255,255,10,10, 0, 0, 0, 0, -1], // 透明耳环
};

function start() {
	text = "#e是否确认转生?（要求达到200级）#n\r\n\r\n";
	text += "说明：\r\n转生后，所有#r已装备物品将返回背包#k，";
	text += "请确认背包中是否有足够的空间，以免装备丢失；\r\n";
	text += "#n其次，你的等级将会#r重置为10级#k并成为新手，但会#r保留技能#k\r\n"
	text += "并返还相应的属性点, 最大HP与MP将进行初始化。\r\n花费为1000枫叶。\r\n";

	cm.sendNextLevel("Check1", text);
}

// 对话开始
function levelCheck1() {
	if (cm.getPlayer().getLevel() < 200) {
		cm.sendOk("等级不足200级, 请达到200级后再来~");
		cm.dispose(); // 关闭对话，防止后续报错
		return;
	}
	if (cm.getItemQuantity(4001126) < 1000) {
		cm.sendOk("您的枫叶数量不足~");
		cm.dispose(); // 关闭对话，防止后续报错
		return;
	}
	
	gmLevel = cm.getPlayer().gmLevel();
	text = "转生特别提醒:\r\n\r\n";
	text += "#r\t一:  请脱下所有装备或背包留足空位\r\n";
	text += "\t二:  转生后将重返10级新手\r\n";
	text += "\t三:  将初始化属性点（保留技能）\r\n";
	text += "\t四:  将初始化最大HP / MP\r\n";
	text += "\t五:  转生将消耗1000枫叶\r\n";
	text += "\t六:  转生后#e加技能点时如提示1-3转技能点不足#n，可以在config.ini里取消限制，如介意请勿使用转生功能#k\r\n\r\n"
	text += "\t确认完毕后，点击“下项”即刻转生\r\n";
	
	cm.sendNextLevel("Check2", text);
}

function levelCheck2() {
	var player = cm.getPlayer();
	var equippeds = player.getInventory(InventoryType.EQUIPPED);
	// 脱下装备到背包
	var equipArr = equippeds.list().toArray();
	for (let i = equipArr.length - 1; i >= 0; i--) {
		var equip = equipArr[i];
		if (!move(equip.getItemId(), equippeds)) {
			cm.sendOk("装备栏空间不足!~");
			cm.dispose(); // 关闭对话，防止后续报错
			return;
		}
	}
	// 检查正在进行第几次转生, times为次数
	var giftAp = 2000; // 赠送属性点
	var hpmp = 2000; // 初始HP/MP
	for (o in relife) {
		if (cm.getCharacterExtendValue(relife[o].k) == null) {
			times = o;
			giftAp = relife[o].giftAp;
			hpmp = relife[o].hpmp;
			break;
		}
	}
	
	player.setGM(6);
	// 重置等级，修改为10级，避开新手升级频繁弹窗
	sendPacket("!level 10" , 0x09); 
	//sendPacket("!level 1" , 0x08); //原脚本为1级
	// 新手
	sendPacket("!job 0" , 0x06);
	// 重新分配属性
	var i = player.getInt();
    var s = player.getStr();
    var l = player.getLuk();
    var d = player.getDex();
	var ap = i + s + l + d + 9 + giftAp;
	player.changeRemainingAp(ap, false);
	player.updateStrDexIntLuk(4);
	// 初始化HP / MP 
	player.updateMaxHpMaxMp(hpmp, hpmp);
	// 回到新手
	player.changeMap(10000);
	player.setGM(gmLevel);
	if (times == -1) {
		cm.dropMessage(1, "你转生已超过10次, 后续转生将默认赠送 " + giftAp + " 属性点");
	} else {
		cm.dropMessage(1, "恭喜你已经完成了第 " + times + " 次转生~ 赠送您 " + giftAp + " 属性点以及属性点装一份");
		var g = gift[times];
		player.gainEquip(g[0],g[1],g[2],g[3],g[4],g[5],g[6],g[7],g[8],g[9],g[10],g[11],g[12],g[13],g[14],g[15],g[16],g[17]);
		cm.gainItem(4001126, -1000, true);
		cm.saveOrUpdateCharacterExtendValue(relife[times].k , relife[times].v);
	}
	cm.dispose(); // 正常流程结束后关闭对话
}

function move(choose, equippeds) {
	if(cm.getInventory(1).isFull()){
		cm.dropMessage(0, "装备栏已满!");
		return false;
	}
	var selItem = equippeds.findById(choose);
	InventoryManipulator.unequip(cm.getPlayer().getClient(), selItem.getPosition(), cm.getInventory(1).getNextFreeSlot());
	return true;
}

function sendPacket(str, code) {
	var hexArray = stringToGbkHexBytes(str); // [3100_0800216C6576656C203100]
	var client = cm.getClient();
	var byteBuf = Unpooled.buffer(256);
	byteBuf.writeShortLE(RecvOpcode.GENERAL_CHAT.getValue());
	byteBuf.writeShortLE(code);
	byteBuf.writeBytes(hexArray);
	byteBuf.writeByte(0x00);
	var inPacket = new ByteBufInPacket(byteBuf);
	client.channelRead(null, inPacket);
}

function stringToGbkHexBytes(str) {
	var encoder = Charset.forName('GBK').newEncoder();
	var charBuffer = CharBuffer.wrap(str.split(''));
	var byteBuffer = encoder.encode(charBuffer);
	var byteValues = [];
	while (byteBuffer.hasRemaining()) {
		var b = byteBuffer.get() & 0xFF;
		byteValues.push(b > 127 ? b - 256 : b);
	}
	return byteValues;
}