var d1 = new Array                                                              //第一档道具
(new Array                                             		//普通
(
new Array(2049100, 2, "混沌卷轴"),
new Array(2340000, 2, "祝福卷轴"),
new Array(1112400, 1, "炼金术士戒指"),
new Array(1112407, 1, "智力飞天猪戒指"), 
new Array(1112408, 1, "力量飞天猪戒指"), 
new Array(1012072, 1, "甜瓜雪糕"), 
new Array(1012073, 1, "西瓜雪糕"), 
new Array(1012060, 1, "匹诺曹的鼻子（智力）"), 
new Array(2049200, 2, "饰品力量卷轴70%"),         
new Array(2049202, 2, "饰品敏捷卷轴70%"),         
new Array(2049204, 2, "饰品智力卷轴70%"),         
new Array(2049206, 2, "饰品运气卷轴70%"),                             
new Array(2043002, 2, "单手剑攻击卷10%"),         
new Array(2043102, 2, "单手斧攻击卷10%"),           
new Array(2043202, 2, "单手钝器攻击卷10%"),         
new Array(2043302, 2, "短剑攻击卷10%"),          
new Array(2043702, 2, "短杖攻击卷10%"),          
new Array(2043802, 2, "长杖攻击卷10%"),           
new Array(2044002, 2, "双手剑攻击卷10%"),            
new Array(2044102, 2, "双手斧攻击卷10%"),              
new Array(2044202, 2, "双手钝器攻击卷10%"),          
new Array(2044302, 2, "枪攻击卷10%"),                   
new Array(2044402, 2, "矛攻击卷10%"),                         
new Array(2044502, 2, "弓攻击卷10%"),                     
new Array(2044602, 2, "弩攻击卷10%"),                       
new Array(2044702, 2, "拳套攻击卷10%"),                       
new Array(2044802, 2, "拳甲攻击卷10%"),                        
new Array(2044902, 2, "短枪攻击卷10%")
),                                     

new Array                                             //稀有
(
new Array(2070007, 1, "月牙镖"), 
new Array(1102042, 1, "浪人披风紫"), 
new Array(1102041, 1, "浪人披风粉"), 
new Array(1102040, 1, "浪人披风黄"), 
new Array(2040915, 3, "盾牌攻击卷60%"), 
new Array(2040919, 3, "盾牌魔力卷60%"), 
new Array(4310000, 3, "绝对音感"), 
new Array(1122017, 1, "精灵吊坠"), 
new Array(1012070, 1, "草莓雪糕"), 
new Array(1012071, 1, "巧克力雪糕"), 
new Array(1142070, 1, "反外挂勋章"), 
new Array(1142032, 1, "解开诅咒者勋章"), 
new Array(1112405, 1, "利琳的戒指"), 
new Array(1092050, 1, "冷艳剑盾"), 
new Array(2040303, 1, "随机必成卷"), 
new Array(2043303, 1, "随机必成卷"), 
new Array(2043703, 1, "随机必成卷"), 
new Array(2043803, 1, "随机必成卷"), 
new Array(2044003, 1, "随机必成卷"), 
new Array(2044303, 1, "随机必成卷"), 
new Array(2044403, 1, "随机必成卷"), 
new Array(2044503, 1, "随机必成卷"), 
new Array(2044603, 1, "随机必成卷"), 
new Array(2044703, 1, "随机必成卷"), 
new Array(2044815, 2, "随机必成卷"), 
new Array(2044908, 2, "随机必成卷"), 
new Array(2040807, 1, "手套攻击必成"), 
new Array(2043003, 1, "随机必成卷")
),

new Array                                             //极品
(
new Array(5050000, 20, "洗点卷轴"), 
new Array(2070016, 1, "水晶飞镖"), 
new Array(2070018, 1, "平衡之怒"), 
new Array(1122059, 1, "纳瑞坎之印"), 
new Array(2040759, 2, "鞋子攻击卷60%"), 
new Array(1142018, 1, "林中之城爱心勋章"), 
new Array(1142030, 1, "明珠港爱心勋章"), 
new Array(1112793, 1, "快乐指环"),
new Array(1092049, 1, "热情剑盾"),
new Array(1372039, 1, "属性杖"),
new Array(1372040, 1, "属性杖"),
new Array(1372041, 1, "属性杖"),
new Array(1372042, 1, "属性杖"),
new Array(1402037, 1, "龙背刃")
),

new Array                                             //神话
(
new Array(1332277, 1, "寻宝武器"),
new Array(1302336, 1, "寻宝武器"),  
new Array(1402253, 1, "寻宝武器"), 
new Array(1432216, 1, "寻宝武器"), 
new Array(1442270, 1, "寻宝武器"), 
new Array(1452255, 1, "寻宝武器"), 
new Array(1462241, 1, "寻宝武器"), 
new Array(1472263, 1, "寻宝武器"), 
new Array(1482218, 1, "寻宝武器"), 
new Array(1492233, 1, "寻宝武器"),
new Array(1372186, 1, "主教专属巨匠1"), 
new Array(1382220, 1, "主教专属巨匠2"),  
new Array(1382049, 1, "属性杖"),
new Array(1382050, 1, "属性杖"),
new Array(1382051, 1, "属性杖"),
new Array(1382052, 1, "属性杖"),
new Array(1122012, 1, "永恒玉佩")
)
);

var itemSet;
var itemSet1 = d1[0];
var itemSet2 = d1[1];
var itemSet3 = d1[2];
var itemSet4 = d1[3];

var sh1 = 50;      //神话属性浮动
var sh2 = 10;      //神话全属性加成

var zgl = new Array              //3个档位3种物品概率
(
new Array(600, 90, 8,2),             //第1档
new Array(900, 300, 80,3),             //第2档
new Array(1000, 900, 400,10),          //第3档
new Array(20, 8, 2,1)             //第0档
);

var co = new Array(1000000,5000000,20000000, 100000);     //4个档位需要金币

var status = 0;
var gl;     //该档位的4种概率
var jilv = 1000;
var cost;
var qty;   //数量
var mz;   //名字
var jp;     //奖品

function start() {
    action(1, 0, 0);
}


function GetRandomNum(Min, Max) {
    var Range = Max - Min;
    var Rand = Math.random();
    return (Min + Math.round(Rand * Range));
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
	qty = (selection > 0) ? selection : (selection < 0 ? -selection : 1);
	cost=qty*co;
            var add = "欢迎你：#d"+cm.getName()+"#k,这里是本服道具抽奖系统#k\r\n";
            add += "本服提供3个档位的抽奖体验.\r\n ";
            add += "#r档位越高,越容易出好东西.\r\n ";
            add += "☆但是赌神就算是最低档位一样出极品.\r\n\r\n";
            add += "#r☆#r当前您拥有金币：#b" + cm.getMeso() + " 金币\r\n";
            add += "#L1#" +  "-[#b第一档：需要" +co[0] + "#k]#l\r\n";
            add += "#L2#" +  "-[#b第二档：需要" +co[1] + "#k]#l\r\n";
            add += "#L3#" +  "-[#b第三档：需要" +co[2] + "#k]#l\r\n";
            add += "#L4#" +  "-[#b赌神模式：需要" +co[3] + "#k]#l\r\n";
            add += "#L5#" +  "-[#b查看奖池#k]#l\r\n\r\n\r\n";
            add += "中奖概率公示：\r\n";
            add += "第一档位（普通:"+zgl[0][0]/10  + "%; 稀有:"+zgl[0][1]/10  + "%;极品:"+zgl[0][2]/10  + "%;神话:"+zgl[0][3]/10  + "%）\r\n";
            add += "第二档位（普通:"+zgl[1][0]/10  + "%; 稀有:"+zgl[1][1]/10  + "%;极品:"+zgl[1][2]/10  + "%;神话:"+zgl[1][3]/10  + "%）\r\n";
            add += "第三档位（普通:"+zgl[2][0]/10  + "%; 稀有:"+zgl[2][1]/10  + "%;极品:"+zgl[2][2]/10  + "%;神话:"+zgl[2][3]/10  + "%）\r\n";
            add += "赌神档位（普通:"+zgl[3][0]/10  + "%; 稀有:"+zgl[3][1]/10  + "%;极品:"+zgl[3][2]/10  + "%;神话:"+zgl[3][3]/10  + "%）\r\n";
            cm.sendSimple(add, 2);
       } else if (status == 2) {
            if (selection == 1) {
	cost = co[0];
                gl = zgl[0];
                var add = "#b<#e#r 道具抽奖 #n#b>\r\n\r\n";
                add += "" +  "-您选择的是[#r第一档#b].\r\n";
                add += "" +  "-您的花费为[#r" + cost + "金币#b].\r\n";
                add += "" +  "\r\n";
                add += "" +  "-点击[#r是#b]开始抽奖,点击[#r不是#b]放弃抽奖.";
                cm.sendYesNo(add);

            } else if (selection == 2) {
	cost = co[1];
                gl = zgl[1];
                var add = "#b<#e#r 道具抽奖 #n#b>\r\n\r\n";
                add += "" +  "-您选择的是[#r第二档#b].\r\n";
                add += "" +  "-您的花费为[#r" + cost + "金币#b].\r\n";
                add += "" +  "\r\n";
                add += "" +  "-点击[#r是#b]开始抽奖,点击[#r不是#b]放弃抽奖.";
                cm.sendYesNo(add);

            } else if (selection == 3) {
	cost = co[2];
                gl = zgl[2];
                var add = "#b<#e#r 道具抽奖 #n#b>\r\n\r\n";
                add += "" +  "-您选择的是[#r第三档#b].\r\n";
                add += "" +  "-您的花费为[#r" + cost + "金币#b].\r\n";
                add += "" +  "\r\n";
                add += "" +  "-点击[#r是#b]开始抽奖,点击[#r不是#b]放弃抽奖.";
                cm.sendYesNo(add);

            } else if (selection == 4) {
	cost = co[3];
                gl = zgl[3];
                var add = "#b<#e#r 道具抽奖 #n#b>\r\n\r\n";
                add += "" +  "-您选择的是[#r赌神模式#b].\r\n";
                add += "" +  "-您的花费为[#r" + cost + "金币#b].\r\n";
                add += "" +  "\r\n";
                add += "" +  "-点击[#r是#b]开始抽奖,点击[#r不是#b]放弃抽奖.";
                cm.sendYesNo(add);

            } else if (selection == 5) {
                var add = "#b<#e#r 道具抽奖 #n#b>\r\n\r\n";
                add += "" +  "下列为抽奖的奖池\r\n";
                add += "" +  "#r 普通 #n\r\n";
	itemSet = itemSet1;
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "#L" + i + "##v " + itemSet[i][0] + "##z";
                    add += itemSet[i][0]+"#      数量：" + itemSet[i][1] + "\r\n";
                };

                add += "\r\n#r 稀有 #n\r\n";
	itemSet = itemSet2;
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "#L" + i + "##v " + itemSet[i][0] + "##z";
                    add += itemSet[i][0]+"#      数量：" + itemSet[i][1] + "\r\n";
                };

                add += "\r\n#r 极品 #n\r\n";
	itemSet = itemSet3;
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "#L" + i + "##v " + itemSet[i][0] + "##z";
                    add += itemSet[i][0]+"#      数量：" + itemSet[i][1] + "\r\n";
                };

                add += "\r\n#r 神话 #n\r\n";
                add += "\神话装备浮动"+ sh1 + "%，全属性+" + sh2 + "\r\n";
	itemSet = itemSet4;
                for (var i = 0; i < itemSet.length; i++) {	
                    add += "#L" + i + "##v " + itemSet[i][0] + "##z";
                    add += itemSet[i][0]+"#      数量：" + itemSet[i][1] + "\r\n";
                };

                cm.sendSimple(add);
            	cm.dispose();
            }

        } else if (status == 3) {
                    if (cm.getMeso() < cost) {
                          	cm.sendOk("#b您的金钱不足.....");
	        	cm.dispose();
                    } else {
		var zj = 1;
		var pd = 0;   //判断你是否神话
                        	jiaru = GetRandomNum(0, jilv);
                        	if (jiaru < gl[3] ) {                            //神话
			pd = 1;
                            		var pj = "神话";
			itemSet = itemSet4;
                        	} else if ( jiaru < gl[2] ) {
                            		var pj = "极品";
			itemSet = itemSet3;
                        	} else if ( jiaru < gl[1] ) {
                            		var pj = "稀有";
			itemSet = itemSet2;
                        	} else if ( jiaru < gl[0] ) {
                            		var pj = "普通";
			itemSet = itemSet1;
                        	} else  {
                            		zj = 0;
                        	}

		if (zj == 1) {
			var jpid = Math.floor(Math.random() * itemSet.length);
			jp = itemSet[jpid][0];
			qty = itemSet[jpid][1];	
			mz = itemSet[jpid][2];	
                            		//cm.gainItem(jp,1);
                            		cm.gainMeso(-cost);

			if ( pd == 1 ) {
				cm.gainItemBM(jp, qty, true, true, sh1,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,sh2,0,0);//力量,敏捷,智力,运气,魔攻,物攻,命中,闪避,跳跃,移速,物防,魔抗,HP,MP,未知, 砸卷次数（如果75为-1,则为设置,否则为随机后增加）
			} else  {
				cm.gainItemBM(jp, qty, true, true, 30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);//力量,敏捷,智力,运气,魔攻,物攻,命中,闪避,跳跃,移速,物防,魔抗,HP,MP,未知, 砸卷次数（如果75为-1,则为设置,否则为随机后增加）
			}

                            		cm.sendOk("#b恭喜,您抽到" + pj + "!!!!!\r\n普通概率：" + gl[0]/10 + "%\r\n稀有概率：" + gl[1]/10 + "%\r\n极品概率："+ gl[2]/10+ "%\r\n神话概率："+ gl[3]/10+ "%\r\n你的概率："+ jiaru/10 + "%");
	           		var text;
	           		text = "[恭喜]" + cm.getPlayer().getName() + " : " + "在道具抽奖中抽到" + pj + "道具:    " + mz + qty +"个！！";
	           		cm.getPlayer().getWorldServer().broadcastPacket(Packages.tools.MaplePacketCreator.serverNotice(6, text));
	        		cm.dispose();
                        	} else  {
                            		cm.gainMeso(-cost);
                            		cm.sendOk("抱歉,你运气太差,毛豆没有~\r\n您抽到普通概率：" + gl[0]/10 + "%\r\n稀有概率：" + gl[1]/10 + "%\r\n极品概率："+ gl[2]/10+ "%\r\n你的概率："+ jiaru/10 + "%");
	        		cm.dispose();
                        	}
                    }
        }
}