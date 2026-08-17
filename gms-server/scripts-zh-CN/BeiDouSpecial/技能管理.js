/**
 * @description 技能管理功能：升级、降级、初始化、删除非法获得的技能
 * @author hzh
 */
var SkillFactory = Java.type('org.gms.client.SkillFactory');
var GameConstants = Java.type('org.gms.constants.game.GameConstants');
var up = "#fUI/Login.img/CharSelect/icon/up#";
var down = "#fUI/Login.img/CharSelect/icon/down#";
var text, skillsStr = "", showTips = false;
var player;
var skills, selSkillId;
var illegal = [], legal = []; // illegal：非法技能ID，legal：合法技能ID

function start() {
	player = cm.getPlayer();
	skills = player.getSkills();
	skillsStr = "";
	text = !showTips ? "" : "#r 【问题说明】：由于北斗客户端进行了技能点判断，导致习得非本职业技能、转生后，升级技能时会提示X转技能点不足，只有将这类“脏数据”清理后才能正常升级当前职业的技能，所以建议将用不到的非法技能删掉，当然你也可在本页面升级技能，以跳过客户端的检测。\r\n";
	text += "#d\t\t\t\t\t\t\t\t\t【当前技能点：" + player.getRemainingSp() + "】\r\n";
	text += "#b 1.【删除】：删除不属于当前职业的技能，不返还技能点\r\n";
	text += "#b 2.【初始化】：重置技能为0级并返还技能点\r\n\r\n";
	text += "#b 3.  " + down + "：调整技能等级减一\r\n";
	text += "#b 4.  " + up + "：调整技能等级加一\r\n";
	text += (selSkillId != null ? "#L0#返回#l\r\n\r\n" : "#L0#取消#l \t\t\t #L1#一键删除#l \t\t\t #L2#一键初始化#l\r\n\r\n");

	skills.entrySet().stream().forEach((e) => {
		var id = e.getKey().getId();
		var v = e.getValue();
		var exRange = id % 10000000;
		var exRangeFlag = exRange == 100 || exRange == 1003 || exRange == 1007; //过滤掉一些全职业技能
		var b = GameConstants.isInJobTree(id, player.getJob().getId()); // 判断当前技能是否当前职业技能
		if (id > 1000000 && !exRangeFlag && !GameConstants.isHiddenSkills(id) && !GameConstants.isPqSkill(id)) {
			var changeTxt, levelup = `#L${id + 1000000000}#${up}#l`, levelDown = `#L${id + 2000000000}#${down}#l`;
			b ? legal.push(id) : illegal.push(id);
			var changeTxt = (v.skillLevel == 0 ? levelup : (v.skillLevel == v.masterLevel ? levelDown : levelDown + levelup));
			if (selSkillId == null || (selSkillId != null && selSkillId == id))
				skillsStr = `#L${id}##s${id}# #r#q${id}##d(Lv : ${v.skillLevel})， ${b ? "合法  【初始化】#k" + changeTxt : "#r非法  【删除】#k"}#l\r\n` + skillsStr;
		}
	});
	cm.sendNextSelectLevel("Perform", text + skillsStr);
}

function levelPerform(selection) {
	if (selection == 0 && selSkillId != null) { // 取消 / 返回
		selSkillId = null;
		start();
		return;
	} else if (selection == 1) { // 一键清除非法技能
		for (var i = 0; i < illegal.length; i++) 
			init(SkillFactory.getSkill(illegal[i]), false, -1, 0, null);
		cm.dropMessage(1, "所有非法技能已被清除!");
	} else if (selection == 2) { // 一键初始化技能等级为0
		for (var i = 0; i < legal.length; i++) {
			var skill = SkillFactory.getSkill(legal[i]);
			var skillEntry = skills.get(skill);
			init(skill, true, 0, skillEntry.masterLevel, null);
		}
		cm.dropMessage(1, "所有本职业技能已初始为0级, 技能点已返还!");
	} else if (selection > 1000000000 && selection < 2000000000) { // 技能升级
		var skill = SkillFactory.getSkill(selSkillId = (selection - 1000000000));
		var skillEntry = skills.get(skill);
		init(skill, true, skillEntry.skillLevel + 1, skillEntry.masterLevel, true);
		start();
		return;
	} else if (selection > 2000000000 && selection < 3000000000) { // 技能降级
		var skill = SkillFactory.getSkill(selSkillId = (selection - 2000000000));
		var skillEntry = skills.get(skill);
		init(skill, true, skillEntry.skillLevel - 1, skillEntry.masterLevel, false);
		start();
		return;
	} else { // 单个技能处理，合法的就初始化，不合法的就删除
		var skill = SkillFactory.getSkill(selection);
		var skillEntry = skills.get(skill);
		var islegal = GameConstants.isInJobTree(selection, player.getJob().getId());
		init(skill, islegal, (islegal ?  0 : -1), skillEntry.masterLevel, null);
		start();
		return;
	}
	cm.dispose();
}
/**
* skill : 技能对象
* islegal : 是否合法 true: 合法， false:不合法
* skillLev : 职业技能的新等级
* maxLevel ： 技能最大等级
* isLevelUp : true:表示升级， false:表示降级，null:都不是
*/
function init(skill, islegal, skillLev, maxLevel, isLevelUp) {
	if (!islegal) {
		player.changeSkillLevel(skill, -1, 0, -1);
		return true;
	}
	var rs = player.getRemainingSp();
	if (isLevelUp && rs <= 0) {
		cm.dropMessage(0, "技能点不足，升级技能失败~");
		return false;
	}
	var changeNum = isLevelUp ? -1 : (isLevelUp != null ? 1 : player.getSkillLevel(skill.getId()));
	//config.ini可以配置为不检测1-3转技能，这里改为无条件返还技能点
	//if (isLevelUp || rs < (player.getLevel() - 6) * 3) // 根据等级判断技能点数，并不准确（偷个懒，没什么影响）
		player.updateRemainingSp(rs + changeNum);
	player.changeSkillLevel(skill, skillLev, maxLevel, -1);
}