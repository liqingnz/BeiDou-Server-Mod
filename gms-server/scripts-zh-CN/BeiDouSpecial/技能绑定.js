/**
 * @description 任意技能绑定到键盘的 F12
 * @author hzh
 */

var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var KeyBinding = Java.type('org.gms.client.keybind.KeyBinding');
var SkillFactory = Java.type('org.gms.client.SkillFactory');
var DatabaseConnection = Java.type('org.gms.util.DatabaseConnection');
var Character = Java.type('org.gms.client.Character');



var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var text;
var sb;

function start() {
	text = "请输入技能名称 (将学会该技能, 并放置在键盘上) :";
	cm.getInputTextLevel("SearchSkill", text);
}

function levelSearchSkill() {
	var skillData = dataProvider.getData("Skill.img");
	const inputText = cm.getText();
	if (inputText.trim() == "") {
		cm.getInputTextLevel("SearchSkill", text);
		return;
	}
	sb = new StringBuilder(4096);
	sb.append("#r选定的技能将绑定到键盘.#n\r\n\r\n#n");
	var zero = true;
	skillData.getChildren().forEach(function(skill) {
		var id = parseInt(skill.getName());
		var skillName = DataTool.getString(skill.getChildByPath("name"), "NO-NAME");
		if (skillName.includes(inputText.toLowerCase())) {
			zero = false;
			sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(skillName).append("\r\n");
		}
			
	});
	if (zero) 
		cm.getInputTextLevel("SearchSkill", "#r未检测到技能, 请重新输入技能名称:");
	else
		cm.sendNextSelectLevel("Perform", sb.toString());
}

function levelPerform(skillId) {
	cm.getPlayer().setGM(6);
	var skill = SkillFactory.getSkill(skillId);
	// 学习技能
	cm.getPlayer().changeSkillLevel(skill, skill.getMaxLevel(), skill.getMaxLevel(), -1);
	var kb = new KeyBinding(1, skillId);
	// 绑定技能
	var keyCode = 88; // 这里的88是键盘码, 对应的是键盘F12按键. (如果你要修改绑定的按键, 请将88修改为别的数字, 哪个数字对应哪个按键请自行尝试或上网/AI查询)
	cm.getPlayer().changeKeybinding(keyCode, kb);
	cm.getPlayer().sendKeymap();
	cm.getPlayer().setGM(cm.getPlayer().gmLevel());	
	cm.dropMessage(0, "技能已经成功绑定到键盘");
	cm.dispose(); // 关闭对话，防止后续报错
	return;
}

