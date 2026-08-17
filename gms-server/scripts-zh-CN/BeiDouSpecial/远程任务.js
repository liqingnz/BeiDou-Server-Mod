/**
 * @description 远程任务, 登录后首次使用因加载任务会有卡顿, 之后不会
 * @author hzh
 */
var ByteBufInPacket = Java.type('org.gms.net.packet.ByteBufInPacket');
var RecvOpcode = Java.type('org.gms.net.opcodes.RecvOpcode');
var Unpooled = Java.type('io.netty.buffer.Unpooled');
var ByteBuf = Java.type('io.netty.buffer.ByteBuf');
var Charset = Java.type('java.nio.charset.Charset');
var CharBuffer = Java.type('java.nio.CharBuffer');
var ByteBuffer = Java.type('java.nio.ByteBuffer');
var Quest = Java.type('org.gms.server.quest.Quest');
var StringBuilder = Java.type('java.lang.StringBuilder');
var text;
var sb;
var sel;
var gmLevel = 0;

function start() {
	text = "请输入任务名称:";
	var channel = cm.getPlayer().getClient().getChannelServer();
	cm.getInputTextLevel("SearchQuest", text);
	if (channel.getStoredVar(2<<10) != 1) {
		Quest.loadAllQuests();
		channel.setStoredVar(2<<10, 1);
	}
}

function levelSearchQuest() {
	const inputText = cm.getText();
	if (inputText.trim() == "") {
		cm.getInputTextLevel("SearchQuest", text);
		return;
	}
	sb = new StringBuilder(4096);
	sb.append("#e选择对应的任务以进行下一步操作.#n\r\n\r\n#n");
	var quests = Quest.getMatchedQuests(inputText);
	if (quests.size() == 0){
		cm.getInputTextLevel("SearchQuest", "#r未检测到任务, 请重新输入任务名称:");
		return;
	}
	quests.sort(function(q1, q2){
		return q1.getId() - q2.getId();
	});
	
	quests.forEach(function(quest) {
		var id = quest.getId();
		var parentName = quest.getParentName();
		var name = quest.getName();
		var qs = cm.getPlayer().getQuestStatus(id);
		var qsStr = (qs == 0 ? "(未开始)" : (qs == 1 ? "(进行中)" : "(已完成)"));
		if (!(parentName == null || parentName.trim() == ""))
			sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(parentName).append(" - ").append(name).append(qsStr).append("#l\r\n");
		else
			sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(name).append(qsStr).append("#l\r\n");
	});
	cm.sendNextSelectLevel("Perform", sb.toString());
}

function levelPerform(selection) {
	sel = selection;
	gmLevel = cm.getPlayer().gmLevel();
	text = "请选择任务操作:#n\r\n\r\n";
    text += "#L0#开始任务#l \t #L1#完成任务#l \t #L2#重置任务#l\r\n";
	cm.sendNextSelectLevel("Process", text);
}

function levelProcess(selection) {
	cm.getPlayer().setGM(6);
	if (selection == 0) {
		sendPacket("!startquest " + sel, 0x10);
	} else if (selection == 1) {
		sendPacket("!completequest " + sel, 0x13);
	} else if (selection == 2) {
		sendPacket("!resetquest " + sel, 0x10);
	} else {
		cm.dropMessage(0, "数据异常!");
	}
	cm.getPlayer().setGM(gmLevel);
	cm.dispose();
}



function sendPacket(str, code) {
	var hexArray = stringToGbkHexBytes(str);
	var client = cm.getClient();
	var byteBuf = Unpooled.buffer(256);
	byteBuf.writeShortLE(RecvOpcode.GENERAL_CHAT.getValue());
	byteBuf.writeShortLE(hexArray.length);
	//byteBuf.writeShortLE(code);
	byteBuf.writeBytes(hexArray);
	byteBuf.writeByte(code);
	//byteBuf.writeByte(0x00);
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