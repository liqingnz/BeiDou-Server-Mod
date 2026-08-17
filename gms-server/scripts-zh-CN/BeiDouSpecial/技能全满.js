/* Duey			
   Edited by: Sean360 of RZ			
   Latest edits and updates were made by the Maple4U Administrator			
*/			
			
			
var status = 0;
var cost;   //所需道具数目	 	
var ptcost=50;  //普通职业消耗枫叶
var qscost=30; //骑士团消耗枫叶

var slevel;  //所需等级	
var slevela=160;  //普通职业所需等级
var slevelb=120; //骑士团所需等级		
			
function start() {			
	status = -1;		
	action(1, 0, 0);		
}			
			
function action(mode, type, selection) {			
	if (mode == -1) {		
		cm.dispose();	
	} else {
		cost=ptcost;    //默认是普通职业
		slevel=slevela;
		if (Math.floor(cm.getJobId() / 1000)==1){  //判断为骑士团职业
			cost=qscost;  
			slevel=slevelb;
			}		
		if (mode == 1)	
			status++;

		else	
			status--;

		if (status == 0) {	
			cm.sendYesNo("当你达到"+slevel+"级，我可以帮你加满#e#d#r当前职业#k#n的技能，\r\n需要"+cost+"个#v4000313#。");
		} else if (status == 1 && cm.getLevel() >= slevel && cm.haveItem(4000313,cost)) {  //道具数目，4000313为黄金枫叶	
		             //GM skill updated by Maple4U Start	

		if(cm.getJobId() == 910){	//superGM

			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(9001000,1,1,-1);
cm.teachSkill(9001001,1,1,-1);
cm.teachSkill(9001002,1,1,-1);
cm.teachSkill(9101000,1,1,-1);
cm.teachSkill(9101001,1,1,-1);
cm.teachSkill(9101002,1,1,-1);
cm.teachSkill(9101003,1,1,-1);
cm.teachSkill(9101004,1,1,-1);
cm.teachSkill(9101005,1,1,-1);
cm.teachSkill(9101008,1,1,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 112) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(1000000,16,16,-1); //Start of max-level "16" skills
cm.teachSkill(1000001,10,10,-1); //Start of max-level "10" skills
cm.teachSkill(1000002,8,8,-1); //Start of max-level "8" skills
cm.teachSkill(1001003,20,20,-1); //Start of max-level "20" skills
cm.teachSkill(1001004,20,20,-1);
cm.teachSkill(1001005,20,20,-1);
cm.teachSkill(1100000,20,20,-1);
cm.teachSkill(1100001,20,20,-1); //Start of mastery's
cm.teachSkill(1100002,30,30,-1);
cm.teachSkill(1100003,30,30,-1);
cm.teachSkill(1101004,20,20,-1); //End of boosters
cm.teachSkill(1101005,20,20,-1);
cm.teachSkill(1101006,20,20,-1);
cm.teachSkill(1101007,30,30,-1);
cm.teachSkill(1110000,20,20,-1); //End of 3rd job skills
cm.teachSkill(1110001,20,20,-1);
cm.teachSkill(1111002,30,30,-1);
cm.teachSkill(1111003,30,30,-1);
cm.teachSkill(1111004,30,30,-1);
cm.teachSkill(1111005,30,30,-1);
cm.teachSkill(1111006,30,30,-1);
cm.teachSkill(1111007,20,20,-1);
cm.teachSkill(1111008,30,30,-1);
cm.teachSkill(1120003,30,30,-1);
cm.teachSkill(1120004,30,30,-1);
cm.teachSkill(1120005,30,30,-1);
cm.teachSkill(1121000,30,30,-1);
cm.teachSkill(1121001,30,30,-1);
cm.teachSkill(1121002,30,30,-1);
cm.teachSkill(1121006,30,30,-1);
cm.teachSkill(1121008,30,30,-1);
cm.teachSkill(1121010,30,30,-1);
cm.teachSkill(1121011,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 122) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(1000000,16,16,-1); //Start of max-level "16" skills
cm.teachSkill(1000001,10,10,-1); //Start of max-level "10" skills
cm.teachSkill(1000002,8,8,-1); //Start of max-level "8" skills
cm.teachSkill(1001003,20,20,-1); //Start of max-level "20" skills
cm.teachSkill(1001004,20,20,-1);
cm.teachSkill(1001005,20,20,-1);
cm.teachSkill(1200000,20,20,-1);
cm.teachSkill(1200001,20,20,-1);
cm.teachSkill(1200002,30,30,-1);
cm.teachSkill(1200003,30,30,-1);
cm.teachSkill(1201004,20,20,-1);
cm.teachSkill(1201005,20,20,-1);
cm.teachSkill(1201006,20,20,-1);
cm.teachSkill(1201007,30,30,-1);
cm.teachSkill(1210000,20,20,-1);
cm.teachSkill(1210001,20,20,-1);
cm.teachSkill(1211002,30,30,-1);
cm.teachSkill(1211003,30,30,-1);
cm.teachSkill(1211004,30,30,-1);
cm.teachSkill(1211005,30,30,-1);
cm.teachSkill(1211006,30,30,-1);
cm.teachSkill(1211007,30,30,-1);
cm.teachSkill(1211008,30,30,-1);
cm.teachSkill(1211009,20,20,-1);
cm.teachSkill(1220005,30,30,-1);
cm.teachSkill(1220006,30,30,-1);
cm.teachSkill(1220010,10,10,-1);
cm.teachSkill(1221000,30,30,-1);
cm.teachSkill(1221001,30,30,-1);
cm.teachSkill(1221002,30,30,-1);
cm.teachSkill(1221003,20,20,-1);
cm.teachSkill(1221004,20,20,-1);
cm.teachSkill(1221007,30,30,-1);
cm.teachSkill(1221009,30,30,-1);
cm.teachSkill(1221011,30,30,-1);
cm.teachSkill(1221012,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 132) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(1000000,16,16,-1); //Start of max-level "16" skills
cm.teachSkill(1000001,10,10,-1); //Start of max-level "10" skills
cm.teachSkill(1000002,8,8,-1); //Start of max-level "8" skills
cm.teachSkill(1001003,20,20,-1); //Start of max-level "20" skills
cm.teachSkill(1001004,20,20,-1);
cm.teachSkill(1001005,20,20,-1);
cm.teachSkill(1300000,20,20,-1);
cm.teachSkill(1300001,20,20,-1);
cm.teachSkill(1300002,30,30,-1);
cm.teachSkill(1300003,30,30,-1);
cm.teachSkill(1301004,20,20,-1);
cm.teachSkill(1301005,20,20,-1);
cm.teachSkill(1301006,20,20,-1);
cm.teachSkill(1301007,30,30,-1);
cm.teachSkill(1310000,20,20,-1);
cm.teachSkill(1311001,30,30,-1);
cm.teachSkill(1311002,30,30,-1);
cm.teachSkill(1311003,30,30,-1);
cm.teachSkill(1311004,30,30,-1);
cm.teachSkill(1311005,30,30,-1);
cm.teachSkill(1311006,30,30,-1);
cm.teachSkill(1311007,20,20,-1);
cm.teachSkill(1311008,20,20,-1);
cm.teachSkill(1320005,30,30,-1);
cm.teachSkill(1320006,30,30,-1);
cm.teachSkill(1320008,25,25,-1);
cm.teachSkill(1320009,25,25,-1);
cm.teachSkill(1321000,30,30,-1);
cm.teachSkill(1321001,30,30,-1);
cm.teachSkill(1321002,30,30,-1);
cm.teachSkill(1321003,30,30,-1);
cm.teachSkill(1321007,10,10,-1);
cm.teachSkill(1321010,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 212) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(2000000,16,16,-1);
cm.teachSkill(2000001,10,10,-1); //End of max-level "10" skills
cm.teachSkill(2001002,20,20,-1);
cm.teachSkill(2001003,20,20,-1);
cm.teachSkill(2001004,20,20,-1);
cm.teachSkill(2001005,20,20,-1);
cm.teachSkill(2100000,20,20,-1);
cm.teachSkill(2101001,20,20,-1);
cm.teachSkill(2101002,20,20,-1);
cm.teachSkill(2101003,20,20,-1);
cm.teachSkill(2101004,30,30,-1);
cm.teachSkill(2101005,30,30,-1);
cm.teachSkill(2110000,20,20,-1);
cm.teachSkill(2110001,30,30,-1);
cm.teachSkill(2111002,30,30,-1);
cm.teachSkill(2111003,30,30,-1);
cm.teachSkill(2111004,20,20,-1);
cm.teachSkill(2111005,20,20,-1);
cm.teachSkill(2111006,30,30,-1);
cm.teachSkill(2121000,30,30,-1);
cm.teachSkill(2121001,30,30,-1);
cm.teachSkill(2121002,30,30,-1);
cm.teachSkill(2121003,30,30,-1);
cm.teachSkill(2121004,30,30,-1);
cm.teachSkill(2121005,30,30,-1);
cm.teachSkill(2121006,30,30,-1);
cm.teachSkill(2121007,30,30,-1);
cm.teachSkill(2121008,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 222) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(2000000,16,16,-1);
cm.teachSkill(2000001,10,10,-1); //End of max-level "10" skills
cm.teachSkill(2001002,20,20,-1);
cm.teachSkill(2001003,20,20,-1);
cm.teachSkill(2001004,20,20,-1);
cm.teachSkill(2001005,20,20,-1);
cm.teachSkill(2200000,20,20,-1);
cm.teachSkill(2201001,20,20,-1);
cm.teachSkill(2201002,20,20,-1);
cm.teachSkill(2201003,20,20,-1);
cm.teachSkill(2201004,30,30,-1);
cm.teachSkill(2201005,30,30,-1);
cm.teachSkill(2210000,20,20,-1);
cm.teachSkill(2210001,30,30,-1);
cm.teachSkill(2211002,30,30,-1);
cm.teachSkill(2211003,30,30,-1);
cm.teachSkill(2211004,20,20,-1);
cm.teachSkill(2211005,20,20,-1);
cm.teachSkill(2211006,30,30,-1);
cm.teachSkill(2221000,30,30,-1);
cm.teachSkill(2221001,30,30,-1);
cm.teachSkill(2221002,30,30,-1);
cm.teachSkill(2221003,30,30,-1);
cm.teachSkill(2221004,30,30,-1);
cm.teachSkill(2221005,30,30,-1);
cm.teachSkill(2221006,30,30,-1);
cm.teachSkill(2221007,30,30,-1);
cm.teachSkill(2221008,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 232) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(2000000,16,16,-1);
cm.teachSkill(2000001,10,10,-1); //End of max-level "10" skills
cm.teachSkill(2001002,20,20,-1);
cm.teachSkill(2001003,20,20,-1);
cm.teachSkill(2001004,20,20,-1);
cm.teachSkill(2001005,20,20,-1);
cm.teachSkill(2300000,20,20,-1);
cm.teachSkill(2301001,20,20,-1);
cm.teachSkill(2301002,30,30,-1);
cm.teachSkill(2301003,20,20,-1);
cm.teachSkill(2301004,20,20,-1);
cm.teachSkill(2301005,30,30,-1);
cm.teachSkill(2310000,20,20,-1);
cm.teachSkill(2311001,20,20,-1);
cm.teachSkill(2311002,20,20,-1);
cm.teachSkill(2311003,30,30,-1);
cm.teachSkill(2311004,30,30,-1);
cm.teachSkill(2311005,30,30,-1);
cm.teachSkill(2311006,30,30,-1);
cm.teachSkill(2321000,30,30,-1);
cm.teachSkill(2321001,30,30,-1);
cm.teachSkill(2321002,30,30,-1);
cm.teachSkill(2321003,30,30,-1);
cm.teachSkill(2321004,30,30,-1);
cm.teachSkill(2321005,30,30,-1);
cm.teachSkill(2321006,10,10,-1);
cm.teachSkill(2321007,30,30,-1);
cm.teachSkill(2321008,30,30,-1);
cm.teachSkill(2321009,5,5,-1);


			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 312) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(3000000,16,16,-1); //End of max-level "16" skills
cm.teachSkill(3000001,20,20,-1);
cm.teachSkill(3000002,8,8,-1);
cm.teachSkill(3001003,20,20,-1);
cm.teachSkill(3001004,20,20,-1);
cm.teachSkill(3001005,20,20,-1);
cm.teachSkill(3100000,20,20,-1);
cm.teachSkill(3100001,30,30,-1);
cm.teachSkill(3101002,20,20,-1);
cm.teachSkill(3101003,20,20,-1);
cm.teachSkill(3101004,20,20,-1);
cm.teachSkill(3101005,30,30,-1);
cm.teachSkill(3110000,20,20,-1);
cm.teachSkill(3110001,20,20,-1);
cm.teachSkill(3111002,20,20,-1);
cm.teachSkill(3111003,30,30,-1);
cm.teachSkill(3111004,30,30,-1);
cm.teachSkill(3111005,30,30,-1);
cm.teachSkill(3111006,30,30,-1);
cm.teachSkill(3120005,30,30,-1);
cm.teachSkill(3121000,30,30,-1);
cm.teachSkill(3121002,30,30,-1);
cm.teachSkill(3121003,30,30,-1);
cm.teachSkill(3121004,30,30,-1);
cm.teachSkill(3121006,30,30,-1);
cm.teachSkill(3121007,30,30,-1);
cm.teachSkill(3121008,30,30,-1);
cm.teachSkill(3121009,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 322) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(3000000,16,16,-1); //End of max-level "16" skills
cm.teachSkill(3000001,20,20,-1);
cm.teachSkill(3000002,8,8,-1);
cm.teachSkill(3001003,20,20,-1);
cm.teachSkill(3001004,20,20,-1);
cm.teachSkill(3001005,20,20,-1);
cm.teachSkill(3200000,20,20,-1);
cm.teachSkill(3200001,30,30,-1);
cm.teachSkill(3201002,20,20,-1);
cm.teachSkill(3201003,20,20,-1);
cm.teachSkill(3201004,20,20,-1);
cm.teachSkill(3201005,30,30,-1);
cm.teachSkill(3210000,20,20,-1);
cm.teachSkill(3210001,20,20,-1);
cm.teachSkill(3211002,20,20,-1);
cm.teachSkill(3211003,30,30,-1);
cm.teachSkill(3211004,30,30,-1);
cm.teachSkill(3211005,30,30,-1);
cm.teachSkill(3211006,30,30,-1);
cm.teachSkill(3220004,30,30,-1);
cm.teachSkill(3221000,30,30,-1);
cm.teachSkill(3221001,30,30,-1);
cm.teachSkill(3221002,30,30,-1);
cm.teachSkill(3221003,30,30,-1);
cm.teachSkill(3221005,30,30,-1);
cm.teachSkill(3221006,30,30,-1);
cm.teachSkill(3221007,30,30,-1);
cm.teachSkill(3221008,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 412) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(4000000,20,20,-1);
cm.teachSkill(4000001,8,8,-1); //End of max-level "8" skills
cm.teachSkill(4001002,20,20,-1);
cm.teachSkill(4001003,20,20,-1);
cm.teachSkill(4001334,20,20,-1);
cm.teachSkill(4001344,20,20,-1);
cm.teachSkill(4100000,20,20,-1);
cm.teachSkill(4100001,30,30,-1);
cm.teachSkill(4100002,20,20,-1);
cm.teachSkill(4101003,20,20,-1);
cm.teachSkill(4101004,20,20,-1);
cm.teachSkill(4101005,30,30,-1);
cm.teachSkill(4110000,20,20,-1);
cm.teachSkill(4111001,20,20,-1);
cm.teachSkill(4111002,30,30,-1);
cm.teachSkill(4111003,20,20,-1);
cm.teachSkill(4111004,30,30,-1);
cm.teachSkill(4111005,30,30,-1);
cm.teachSkill(4111006,20,20,-1);
cm.teachSkill(4120002,30,30,-1);
cm.teachSkill(4120005,30,30,-1);
cm.teachSkill(4121000,30,30,-1);
cm.teachSkill(4121003,30,30,-1);
cm.teachSkill(4121004,30,30,-1);
cm.teachSkill(4121006,30,30,-1);
cm.teachSkill(4121007,30,30,-1);
cm.teachSkill(4121008,30,30,-1);
cm.teachSkill(4121009,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 422) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(4000000,20,20,-1);
cm.teachSkill(4000001,8,8,-1); //End of max-level "8" skills
cm.teachSkill(4001002,20,20,-1);
cm.teachSkill(4001003,20,20,-1);
cm.teachSkill(4001334,20,20,-1);
cm.teachSkill(4001344,20,20,-1);
cm.teachSkill(4200000,20,20,-1); //End of mastery's
cm.teachSkill(4200001,20,20,-1);
cm.teachSkill(4201002,20,20,-1);
cm.teachSkill(4201003,20,20,-1); //End of second-job skills and first-job
cm.teachSkill(4201004,30,30,-1);
cm.teachSkill(4201005,30,30,-1);
cm.teachSkill(4210000,20,20,-1);
cm.teachSkill(4211001,30,30,-1);
cm.teachSkill(4211002,30,30,-1);
cm.teachSkill(4211003,20,20,-1);
cm.teachSkill(4211004,30,30,-1);
cm.teachSkill(4211005,20,20,-1);
cm.teachSkill(4211006,30,30,-1);
cm.teachSkill(4220002,30,30,-1);
cm.teachSkill(4220005,30,30,-1);
cm.teachSkill(4221000,30,30,-1); //End of Maple Warrior // Also end of max-level "30" skills
cm.teachSkill(4221001,30,30,-1);
cm.teachSkill(4221003,30,30,-1);
cm.teachSkill(4221004,30,30,-1);
cm.teachSkill(4221006,30,30,-1);
cm.teachSkill(4221007,30,30,-1);
cm.teachSkill(4221008,5,5,-1); //End of max-level "1" skills

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 512) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(5000000,20,20,-1); //Bullet Time - [Master Level : 20]\nIncreases accuracy and avoidability.
cm.teachSkill(5001001,20,20,-1); //Flash Fist - [Master Level : 20]\nUses MP to speed up the punch to rapidly attack enemies.
cm.teachSkill(5001002,20,20,-1); //Sommersault Kick - [Master Level : 20]\nA devastating kick that accompanies a backward sommersault. Attacks all enemies in the vicinity.
cm.teachSkill(5001003,20,20,-1); //Double Shot - [Master Level : 20]\nFires two bullets at once to apply double damage to monsters.
cm.teachSkill(5001005,10,10,-1); //Dash - [Master Level : 10]\nPress left or right arrow twice to temporarily boost your speed and jump.
cm.teachSkill(5100000,10,10,-1); //Improve MaxHP - [Master Level : 10]\nApply AP to MaxHP to improve the rate of increase for MaxHP.
cm.teachSkill(5100001,20,20,-1); //Knuckler Mastery - [Master Level : 20]\nBoosts the accuracy and the mastery of Knucklers. This skill only applies when you equip a Knuckler.
cm.teachSkill(5101002,20,20,-1); //Backspin Blow - [Master Level : 20]\nThis skill allows you to quickly slide back and elbow multiple monsters at once to apply damage and temporarily stun them.
cm.teachSkill(5101003,20,20,-1); //Double Uppercut - [Master Level : 20]\nA quick round of two punches to apply damage and temporarily stun a monster.
cm.teachSkill(5101004,20,20,-1); //Corkscrew Blow - [Master Level : 20]\nThis skill allows you to run forward and punch multiple monsters in front at once.
cm.teachSkill(5101005,10,10,-1); //MP Recovery - [Master Level : 10]\nRecovers MP by using up a bit of HP.
cm.teachSkill(5101006,20,20,-1); //Knuckler Booster - [Master Level : 20]\nUses parts of HP and MP to temporarily boost the speed of a Knuckler. This skill can only be triggered when a Knuckler is equipped. \nRequired Skill : #cLevel 5 or above on Knuckler Mastery
cm.teachSkill(5101007,10,10,-1); //Oak Barrel - [Master Level : 10]\nThis skill will allow you to safely navigate your way through monsters without being recognized by them...by donning an Oak Barrel. Some clever monsters may be able to tell, though, so be careful. If you are lying down, it's literally
cm.teachSkill(5110000,20,20,-1); //Stun Mastery - [Master Level : 20]\nWhen attacking a monster that's stunned, the critical attack will be triggered at a set rate.
cm.teachSkill(5110001,40,40,-1); //Energy Charge - [Master Level : 40]\nA set amount of energy is charged after every attack. When the energy is fully charged, this will automatically trigger the effects of the Body Attack and Stance, and will allow you to use energy-related skills.
cm.teachSkill(5111002,30,30,-1); //Energy Blast - [Master Level : 30]\nBlasts a ball of energy to attack multiple monsters at once. This skill can only be used when #cthe energy is fully charged#.\nRequired Skill : #cLevel 1 of Energy Charge#
cm.teachSkill(5111004,20,20,-1); //Energy Drain - [Master Level : 20]\nUses energy to convert the lost HP of a monster into your own HP. This skill can only be used when #cthe energy is full charged#.\nRequired Skill : #cLevel 1 of Energy Charge#
cm.teachSkill(5111005,20,20,-1); //Transformation - [Master Level : 20]\nTransforms you into a more powerful state for 120 seconds. \nSkills available : Shockwave, Knuckle Booster, Energy Blast, Energy Drain, Maple Warrior, Will of the Warrior, Speed Infusion, Time Leap
cm.teachSkill(5111006,30,30,-1); //Shockwave - [Master Level : 30]\nStrikes the ground with tremendous force, affecting multiple monsters. This skill can only be used during #cTransformation or Super Transformation#.\nRequired Skill : #cLevel 1 of Transformation#
cm.teachSkill(5121000,30,30,-1); //Maple Warrior - For a set period of time, the stats of every member in your party will be boosted.
cm.teachSkill(5121001,30,30,-1); //Dragon Strike - Summons a sleeping dragon from the depths of the ground to apply damage to a number of monsters.
cm.teachSkill(5121002,30,30,-1); //Energy Orb - Uses a blast of powerful energy to strike a monster. If there are other monsters around the affected monster, they will also be affected by this potent ball of energy. Only available when the #cenergy is fully charged#.\nRequired Skill : #cLevel 1 of Energy Charge#
cm.teachSkill(5121003,20,20,-1); //Super Transformation - Increases power to extreme levels for 120 seconds. \nAvailable skills : Shockwave, Demolition, Snatch, Knuckle Booster, Energy Buster, Energy Drain, Maple Warrior, Will of the Warrior, Time Leap\nRequired Skill : #cLevel 20 of Transformation#
cm.teachSkill(5121004,30,30,-1); //Demolition - Apply a significant damage to a single monster by attacking it in a blinding speed. Only available when under a state of #cSuper Transformation#.\nRequired Skill : #cLevel 1 of Super Transformation#
cm.teachSkill(5121005,30,30,-1); //Snatch - Applies damage to a monster that's far away, and drags it right in front of you. Only available when under a state of #cSuper Transformation#.\nRequired Skill : #cLevel 1 of Super Transformation#
cm.teachSkill(5121007,30,30,-1); //Barrage - Attacks a monster nearby 6 times in quick succession.
cm.teachSkill(5121008,5,5,-1); //xxxx - Allows you to break out of an abnormal state. As its level increases, the number of abnormal states that can be broken out increases. \n#cWaiting time : 10 min.#
cm.teachSkill(5121009,20,20,-1); //Speed Infusion - Uses HP and MP to temporarily increase the attacking speed of a weapon. This can be combined with other boosters, and everyone in the party will have their attacking speed increased.\nRequired Skill : #cLevel 20 of Knuckle Booster#
cm.teachSkill(5121010,30,30,-1); //Time Leap - Resets the waiting time for skills for yourself and everyone in the party. This does not reset the waiting time for Time Leap.

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 522) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
cm.teachSkill(5000000,20,20,-1); //Bullet Time - [Master Level : 20]\nIncreases accuracy and avoidability.
cm.teachSkill(5001001,20,20,-1); //Flash Fist - [Master Level : 20]\nUses MP to speed up the punch to rapidly attack enemies.
cm.teachSkill(5001002,20,20,-1); //Sommersault Kick - [Master Level : 20]\nA devastating kick that accompanies a backward sommersault. Attacks all enemies in the vicinity.
cm.teachSkill(5001003,20,20,-1); //Double Shot - [Master Level : 20]\nFires two bullets at once to apply double damage to monsters.
cm.teachSkill(5001005,10,10,-1); //Dash - [Master Level : 10]\nPress left or right arrow twice to temporarily boost your speed and jump.
cm.teachSkill(5200000,20,20,-1); //Gun Mastery - [Master Level : 20]\nBoosts the accuracy and the mastery of your Guns. This skill only applies when you equip a Gun.
cm.teachSkill(5201001,20,20,-1); //Invisible Shot - [Master Level : 20]\nAttacks multiple monsters by quickly firing a few bullets, so fast that the naked eye can't see the shooting.
cm.teachSkill(5201002,20,20,-1); //Grenade - [Master Level : 20]\nAttacks a monster by throwing a grenade. The distance the grenade travels depends on how long you press the skill key.
cm.teachSkill(5201003,20,20,-1); //Gun Booster - [Master Level : 20]\nUses parts of HP and MP to temporarily boost the firing speed of the Gun.This skill can only be triggered when the Gun is equipped. \nRequired Skill : #cLevel 5 or above on Gun Mastery
cm.teachSkill(5201004,20,20,-1); //Blank Shot - [Master Level : 20]\nThis skill allows you to pretend shooting a gun, faking out the monsters, and instead of firing bullets, it'll fire a flag. This will temporarily stun up to 2 monsters.
cm.teachSkill(5201005,10,10,-1); //Wings - [Master Level : 10]\nAllows for a longer, more sustained jump than a regular jump.
cm.teachSkill(5201006,20,20,-1); //Recoil Shot - [Master Level : 20]\nUses the recoil of the gun to run back after a gunshot. \nRequired Skill : #cLevel 5 or above on Wings#
cm.teachSkill(5210000,20,20,-1); //Burst Fire - [Master Level : 20]\nIncreases the potency and the number of bullets fired when using Double Shot.\nRequired Skill : #cLevel 20 of Double Shot#
cm.teachSkill(5211001,30,30,-1); //Octopus - [Master Level : 30]\nSummons a loyal octopus that'll aid your attacks. The summoned octopus will not move, however.\n#cWaiting time until the next summon : 10 sec#
cm.teachSkill(5211002,30,30,-1); //Gaviota - [Master Level : 30]\nSummons Gaviota, who's trained to throw a grenade at monsters. The summoned Gaviota will seek a monster, and when it finds one, it'll toss the grenade and disappear. \n#cWaiting time : 5 sec.#
cm.teachSkill(5211004,30,30,-1); //Flamethrower - [Master Level : 30]\nAttacks a monster nearby with a fire-based attack. The affected monster will keep receiving damage for a short period of time.
cm.teachSkill(5211005,30,30,-1); //Ice Splitter - [Master Level : 30]\nAttacks the closest monster with an ice-based attack. The affected monster will be frozen for a short period of time.
cm.teachSkill(5211006,30,30,-1); //Homing Beacon - [Master Level : 30]\nSends a parrot that'll mark a target on a monster. From then on out, all attacks will be focused on that monster.
cm.teachSkill(5220001,30,30,-1); //Elemental Boost - Increases the potency of Flamethrower and Ice Splitter.
cm.teachSkill(5220002,20,20,-1); //Wrath of the Octopi - An additional octopus is summoned, increasing the fire rate and the damage.\nRequired Skill : #cLevel 30 of Octopus#
cm.teachSkill(5220011,20,20,-1); //Bullseye - Applies more damage to monsters under the effect of Homing Beacon.\nRequired Skill : #cLevel 30 of Homing Beacon#
cm.teachSkill(5221000,30,30,-1); //Maple Warrior - For a set period of time, the stats of every member in your party will be boosted.
cm.teachSkill(5221003,30,30,-1); //Aerial Strike - Uses the grenade attack of Gaviota to damage up to 6 monsters. \nRequired Skill : #cLevel 15 of Gaviota#
cm.teachSkill(5221004,30,30,-1); //Rapid Fire - Fires rounds of bullets very quickly. Hold on to the skill key for continued shooting.\nRequired Skill : #cLevel 20 of Burst Fire#
cm.teachSkill(5221006,10,10,-1); //Battleship - Calls forth a ship that you can mount and launch attacks from. The durability of the ship decreases per damage received, and when it reaches 0, you will not be able to get back on board for a short period of time. \nAvailable Skills : Battleship skills, G 
cm.teachSkill(5221007,30,30,-1); //Battleship Cannon - Rapidly fires a number of cannonballs. Only available when aboard the Battleship.\nRequired Skill : #cLevel 1 of Battleship#
cm.teachSkill(5221008,30,30,-1); //Battleship Torpedo - Fires a hardened cannonball that goes through monsters. Only available when aboard the Battleship.\nRequired Skill : #cLevel 1 of Battleship#
cm.teachSkill(5221009,20,20,-1); //Hypnotize - Hypnotizes monsters to temporarily make it attack other monsters instead of you.
cm.teachSkill(5221010,5,5,-1); //xxxx - Allows you to break out of an abnormal state. As its level increases, the number of abnormal states that can be broken out increases. \n#cWaiting time : 10 min.#

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 2112) {	//战神
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(20001000,3,3,-1);
cm.teachSkill(20001001,3,3,-1);
cm.teachSkill(20001002,3,3,-1);
cm.teachSkill(20001003,1,1,-1);
cm.teachSkill(20001004,1,1,-1);
cm.teachSkill(20001005,1,1,-1);
cm.teachSkill(21000000,10,10,-1);
cm.teachSkill(21000002,20,20,-1);
cm.teachSkill(21001001,15,15,-1);
cm.teachSkill(21001003,20,20,-1);
cm.teachSkill(21100000,20,20,-1);
cm.teachSkill(21100001,20,20,-1);
cm.teachSkill(21100002,30,30,-1);
cm.teachSkill(21100004,20,20,-1);
cm.teachSkill(21100005,20,20,-1);
cm.teachSkill(21101003,20,20,-1);
cm.teachSkill(21110000,20,20,-1);
cm.teachSkill(21110002,20,20,-1);
cm.teachSkill(21110003,30,30,-1);
cm.teachSkill(21110004,30,30,-1);
cm.teachSkill(21110006,20,20,-1);
cm.teachSkill(21111001,20,20,-1);
cm.teachSkill(21111005,20,20,-1);//21110007和21110008这两个是不可见技能
cm.teachSkill(21110007,20,20,-1);
cm.teachSkill(21110008,20,20,-1);
cm.teachSkill(21120001,30,30,-1);
cm.teachSkill(21120002,30,30,-1);
cm.teachSkill(21120004,30,30,-1);
cm.teachSkill(21120005,30,30,-1);
cm.teachSkill(21120006,30,30,-1);
cm.teachSkill(21120007,30,30,-1);
cm.teachSkill(21121000,30,30,-1);
cm.teachSkill(21121003,30,30,-1);//21120009和21120010这两个是不可见技能
cm.teachSkill(21120009,30,30,-1);
cm.teachSkill(21120010,30,30,-1);
cm.teachSkill(21121008,5,5,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 1112) {	//骑士团
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
cm.teachSkill(11000000,10,10,-1);
cm.teachSkill(11001001,10,10,-1);
cm.teachSkill(11001002,20,20,-1);
cm.teachSkill(11001003,20,20,-1);
cm.teachSkill(11001004,20,20,-1);
cm.teachSkill(11100000,20,20,-1);
cm.teachSkill(11101001,20,20,-1);
cm.teachSkill(11101002,30,30,-1);
cm.teachSkill(11101003,20,20,-1);
cm.teachSkill(11101004,30,30,-1);
cm.teachSkill(11101005,10,10,-1);
cm.teachSkill(11110000,20,20,-1);
cm.teachSkill(11110005,20,20,-1);
cm.teachSkill(11111001,20,20,-1);
cm.teachSkill(11111002,20,20,-1);
cm.teachSkill(11111003,20,20,-1);
cm.teachSkill(11111004,30,30,-1);
cm.teachSkill(11111006,30,30,-1);
cm.teachSkill(11111007,20,20,-1);


			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 1212) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
cm.teachSkill(12000000,10,10,-1);
cm.teachSkill(12001001,10,10,-1);
cm.teachSkill(12001002,10,10,-1);
cm.teachSkill(12001003,20,20,-1);
cm.teachSkill(12001004,20,20,-1);
cm.teachSkill(12101000,20,20,-1);
cm.teachSkill(12101001,20,20,-1);
cm.teachSkill(12101002,20,20,-1);
cm.teachSkill(12101003,20,20,-1);
cm.teachSkill(12101004,20,20,-1);
cm.teachSkill(12101005,20,20,-1);
cm.teachSkill(12101006,20,20,-1);
cm.teachSkill(12110000,20,20,-1);
cm.teachSkill(12110001,20,20,-1);
cm.teachSkill(12111002,20,20,-1);
cm.teachSkill(12111003,20,20,-1);
cm.teachSkill(12111004,20,20,-1);
cm.teachSkill(12111005,30,30,-1);
cm.teachSkill(12111006,30,30,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 1312) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
cm.teachSkill(13000000,20,20,-1);
cm.teachSkill(13000001,8,8,-1);
cm.teachSkill(13001002,10,10,-1);
cm.teachSkill(13001003,20,20,-1);
cm.teachSkill(13001004,20,20,-1);
cm.teachSkill(13100000,20,20,-1);
cm.teachSkill(13100004,20,20,-1);
cm.teachSkill(13101001,20,20,-1);
cm.teachSkill(13101002,30,30,-1);
cm.teachSkill(13101003,20,20,-1);
cm.teachSkill(13101005,20,20,-1);
cm.teachSkill(13101006,10,10,-1);
cm.teachSkill(13110003,20,20,-1);
cm.teachSkill(13111000,20,20,-1);
cm.teachSkill(13111001,30,30,-1);
cm.teachSkill(13111002,20,20,-1);
cm.teachSkill(13111004,20,20,-1);
cm.teachSkill(13111005,10,10,-1);
cm.teachSkill(13111006,20,20,-1);
cm.teachSkill(13111007,20,20,-1);


			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 1412) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
cm.teachSkill(14000000,10,10,-1);
cm.teachSkill(14000001,8,8,-1);
cm.teachSkill(14001002,10,10,-1);
cm.teachSkill(14001003,10,10,-1);
cm.teachSkill(14001004,20,20,-1);
cm.teachSkill(14001005,20,20,-1);
cm.teachSkill(14100000,20,20,-1);
cm.teachSkill(14100001,30,30,-1);
cm.teachSkill(14100005,10,10,-1);
cm.teachSkill(14101006,20,20,-1);
cm.teachSkill(14101002,20,20,-1);
cm.teachSkill(14101003,20,20,-1);
cm.teachSkill(14101004,20,20,-1);
cm.teachSkill(14110003,20,20,-1);
cm.teachSkill(14110004,20,20,-1);
cm.teachSkill(14111000,30,30,-1);
cm.teachSkill(14111001,20,20,-1);
cm.teachSkill(14111002,30,30,-1);
cm.teachSkill(14111005,20,20,-1);
cm.teachSkill(14111006,30,30,-1);


			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 1512) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
cm.teachSkill(15000000,10,10,-1);
cm.teachSkill(15001001,20,20,-1);
cm.teachSkill(15001002,20,20,-1);
cm.teachSkill(15001003,10,10,-1);
cm.teachSkill(15001004,20,20,-1);
cm.teachSkill(15100000,10,10,-1);
cm.teachSkill(15100001,20,20,-1);
cm.teachSkill(15100004,20,20,-1);
cm.teachSkill(15101002,20,20,-1);
cm.teachSkill(15101003,20,20,-1);
cm.teachSkill(15101005,20,20,-1);
cm.teachSkill(15101006,20,20,-1);
cm.teachSkill(15110000,20,20,-1);
cm.teachSkill(15111001,20,20,-1);
cm.teachSkill(15111002,10,10,-1);
cm.teachSkill(15111003,20,20,-1);
cm.teachSkill(15111004,20,20,-1);
cm.teachSkill(15111005,20,20,-1);
cm.teachSkill(15111006,20,20,-1);
cm.teachSkill(15111007,30,30,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();
		}else if (cm.getJobId() == 000) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(1000,3,3,-1);
cm.teachSkill(1001,3,3,-1);
cm.teachSkill(1002,3,3,-1);
cm.teachSkill(1003,1,1,-1);
cm.teachSkill(1004,1,1,-1);
cm.teachSkill(1005,1,1,-1);
//cm.teachSkill(8,1,1,-1);
//cm.teachSkill(1006,1,1,-1);
//cm.teachSkill(1007,3,3,-1);
//cm.teachSkill(1009,1,1,-1);
//cm.teachSkill(1010,1,1,-1);
//cm.teachSkill(1011,1,1,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

		}else if (cm.getJobId() == 1000) {	
			cm.gainItem(4000313,-cost); //扣除道具
cm.teachSkill(10001000,3,3,-1);
cm.teachSkill(10001001,3,3,-1);
cm.teachSkill(10001002,3,3,-1);
cm.teachSkill(10001003,1,1,-1);
cm.teachSkill(10001004,1,1,-1);
cm.teachSkill(10001005,1,1,-1);
//cm.teachSkill(10000008,1,1,-1);
//cm.teachSkill(10001006,1,1,-1);
//cm.teachSkill(10001007,3,3,-1);
//cm.teachSkill(10001009,1,1,-1);
//cm.teachSkill(10001010,1,1,-1);
//cm.teachSkill(10001011,1,1,-1);

			cm.sendOk("技能全满成功！");
			cm.dispose();

			}else{
			cm.sendOk("请确定达到"+slevel+"级并完成全部转职。");
			cm.dispose();
			}
		}
			else if(status == 1) {
                                                       cm.sendOk("等级未达到"+slevel+"级，或者#v4000313#不够！");	
                         		       cm.dispose();			
			}
			else{
                         		       cm.dispose();			
			}
		}	
	}		
