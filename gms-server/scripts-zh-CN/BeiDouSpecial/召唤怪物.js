/**
 * @description 召唤怪物
 * @author hzh
 */

var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var KeyBinding = Java.type('org.gms.client.keybind.KeyBinding');
var LifeFactory = Java.type('org.gms.server.life.LifeFactory');
var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var text;
var sb;
var sel;

function start() {
	text = "请输入怪物名称:";
	cm.getInputTextLevel("SearchMob", text);
}

function levelSearchMob() {
	var mobData = dataProvider.getData("Mob.img");
	const inputText = cm.getText();
	if (inputText.trim() == "") {
		cm.getInputTextLevel("SearchMob", text);
		return;
	}
	sb = new StringBuilder(4096);
	sb.append("#r请选择要召唤的怪物.#n\r\n\r\n#n");
	var zero = true;
	mobData.getChildren().forEach(function(mob) {
		var id = parseInt(mob.getName());
		var mobName = DataTool.getString(mob.getChildByPath("name"), "NO-NAME");
		if (mobName.includes(inputText.toLowerCase())) {
			zero = false;
			sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(mobName).append("\r\n");
		}
	});
	if (zero) 
		cm.getInputTextLevel("SearchMob", "#r未检测到怪物, 请重新输入怪物名称:");
	else
		cm.sendNextSelectLevel("Perform", sb.toString());
}

function levelPerform(mobId) {
	sel = mobId;
	text = "请选择召唤个数:#n\r\n\r\n";
    text += "#L1#1个#l \t #L20#20个#l \t #L50#50个#l \t #L100#100个#l\r\n";
	cm.sendNextSelectLevel("Process", text);
}

function levelProcess(num) {
	var monster = LifeFactory.getMonster(sel);
	if (monster.isBoss() && num > 1) {
		num = 1;
		cm.dropMessage(1, "检测到召唤了BOSS, 只允许召唤1只!");
	}
	let cx = cm.getPlayer().getPosition().getX();
	let cy = cm.getPlayer().getPosition().getY();
	for (var i = 1; i <= num; i++) {
		cm.spawnMonster(sel, cx, cy);
	}
	cm.dispose();
}