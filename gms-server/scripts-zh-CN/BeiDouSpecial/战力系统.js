var Icon = Array(
    Array("警报器", "#fUI/Basic/BtClaim/disabled/0#"),
    Array("奖杯", "#fUI/UIAchievement.img/achievement/pages/main/achievementForm/basic/difficultyIcon/unique#")
);
var txt, GDP, UDP;

var TemporaryGroup = [-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-15,-16,-17,-18,-19,-26,-27,-28,-29,-101,-102,-103,-104,-105,-106,-107,-108,-109,-110,-111,-112,-113,-114,-115,-116,-118,-119,-121,-127,-128];
var NameGroup = ["帽子","脸视","眼饰","耳环","衣服","裤子","鞋子","手套","披风","盾牌","武器","戒指","戒指","戒指","戒指","项链","骑宠","鞍子","勋章","戒指","戒指","腰带","时帽","时脸","时眼","时耳","时衣","时裤","时鞋","时手","时披","时盾","时武","时戒","时戒","宠装","时戒","时戒","时骑","时鞍","时项","时戒","时戒"];
var ThisRanking = [];
var Equ = [];
var ca = java.util.Calendar.getInstance();
var hour = ca.get(java.util.Calendar.HOUR_OF_DAY); //获得小时
var minute = ca.get(java.util.Calendar.MINUTE); //获得分钟
var second = ca.get(java.util.Calendar.SECOND); //获得秒
var status = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (status >= 0 && mode == 0) {
            cm.dispose();
            return;
        }
        if (mode == 1)
            status++;
        else
            status--;
        if (status == 0) {
          var Num = 0;
                for (i in TemporaryGroup) {
                    var Equip = cm.getInventory(-1).getItem(TemporaryGroup[i]);
                    if (Equip == null) continue;
                    Num += RuinStat(Equip);
                }
	txt = "#L997#" + Icon[0][1] + " #r战力评分榜#k " + Icon[0][1] + "#l\r\n\r\n\r\n";

                txt += "#d[ #r#h ##d ]#b 最强战力评分 : #r" + Num + "\r\n";
                for (i in TemporaryGroup) {
                    var Equip = cm.getInventory(-1).getItem(TemporaryGroup[i]);
                    if (i % 4 == 0) txt += "\r\n";
                    if (Equip == null) {
                        txt += "#L" + i + "##d" + NameGroup[i] + " #b" + format(" ", 7, ("0#l").toString());
                    } else {
                        txt += "#L" + i + "##d" + NameGroup[i] + " #b" + format(" ", 7, (RuinStat(Equip) + "#l").toString());
                    }
                }
                txt += "\r\n\r\n";
               /*
	if ((!cm.getPlayer().isGM())&&(hour < 22)) {
		var 角色id =cm.getPlayer().getId();
		战力更新(Num,角色id);
	}
	*/
                cm.sendSimple(txt);
        } else if (status == 1) {
	if(selection == 998){
		cm.openNpc(9040004,"战力奖励"); 
	}else if (selection == 997) {
                    txt = "\t\t\t\t #d" + Icon[0][1] + " 排行中心 " + Icon[0][1] + "\r\n\r\n";
                    txt += "#d　" + Icon[0][1] + " 职业 " + Icon[0][1] + "\t　" + Icon[0][1] + " 角色 " + Icon[0][1] + "\t　" + Icon[0][1] + " 评分 " + Icon[0][1] + "\r\n";
                    ThisRanking = RuinKing();
                    for (i in ThisRanking) {
                        //txt += "　#L" + i + "#" + format(" ", 25, cm.getJobName(ThisRanking[i]['job'].toString()))+ "　";
		txt += "　#L" + i + "#" + format(" ",25, cm.getJobName(ThisRanking[i]['job'].toString()));
                        txt += format(" ", 25, ThisRanking[i]['name'].toString()) + "　";
                        txt += ThisRanking[i]['max'] + "　";
                        txt += "#l\r\n";
                    }

                    cm.sendSimple(txt);
                } else {
                    var Equip = cm.getInventory(-1).getItem(TemporaryGroup[selection]);
                    if (Equip == null) {
                        txt = "\r\n\r\n\t\t\t抱歉..该类型为空\r\n ";
                    } else {
                        txt = "#i" + Equip.getItemId() + "#\r\n";
                        txt += "#d力量 : #r" + format(" ", 8, Equip.getStr().toString()) + " ";
                        txt += "#d敏捷 : #r" + format(" ", 8, Equip.getDex().toString()) + " ";
                        txt += "#d智力 : #r" + format(" ", 8, Equip.getInt().toString()) + "\r\n";

                        txt += "#d运气 : #r" + format(" ", 8, Equip.getLuk().toString()) + " ";
                        txt += "#d物攻 : #r" + format(" ", 8, Equip.getWatk().toString()) + " ";
                        txt += "#d魔攻 : #r" + format(" ", 8, Equip.getMatk().toString()) + "\r\n";

                        txt += "#d物防 : #r" + format(" ", 8, Equip.getWdef().toString()) + " ";
	        txt += "#d魔防 : #r" + format(" ", 8, Equip.getMdef().toString()) + " ";
                        txt += "#d可升 : #r" + format(" ", 8, Equip.getUpgradeSlots().toString()) + " \r\n";
                        txt += "#d已升 : #r" + format(" ", 8, Equip.getLevel().toString()) + " ";
                        //txt += "#d星级 : #r" + format(" ", 8, Equip.getEnhance().toString()) + "\r\n";
                    }
                    cm.sendOk(txt);
                    cm.dispose();
                }
            }else if(status ==2){
				GDP = selection;
                var Num = 0;
                Equ = RuinEquip(ThisRanking[selection]['id']);
                for (i in Equ) {
				//if (TemporaryGroup.indexOf(Equ[i]['position']) != -1) {
                    Num += Equ[i]['max'];
				
                }
                txt = "#d[ #r" + ThisRanking[selection]['name'] + "#d ]#b 最强战力评分 : #r" + Num + "\r\n";
	
                for (i in Equ) {
		if (i % 4 == 0) txt += "\r\n";
                    //Num += Equ[i]['max'];
                    if (TemporaryGroup.indexOf(Equ[i]['position']) == -1) {
                        txt += "#L" + i + "##d" + NameGroup[i] + " #b" + format(" ", 7, ("0#l").toString());
                    } else {
                        txt += "#L" + i + "##d" + NameGroup[TemporaryGroup.indexOf(Equ[i]['position'])] + " #b" + format(" ", 7, (Equ[i]['max'] + "#l").toString());
                    }
                }
                txt += "\r\n\r\n";
                cm.sendSimple(txt);
				
				
			}else if(status ==3){
				txt = "#i" + Equ[selection]['itemid'] + "#\r\n";
              //  txt = "#i" + Equ[selection]['itemid'] + "#" + Equ[selection]['position'] + "\r\n";
                txt += "#d力量 : #r" + format(" ", 8, (Equ[selection]['str']).toString()) + " ";
                txt += "#d敏捷 : #r" + format(" ", 8, (Equ[selection]['dex']).toString()) + " ";
                txt += "#d智力 : #r" + format(" ", 8, (Equ[selection]['int']).toString()) + "\r\n";

                txt += "#d运气 : #r" + format(" ", 8, (Equ[selection]['luk']).toString()) + " ";
                txt += "#d物攻 : #r" + format(" ", 8, (Equ[selection]['watk']).toString()) + " ";
                txt += "#d魔攻 : #r" + format(" ", 8, (Equ[selection]['matk']).toString()) + "\r\n";

				txt += "#d物防 : #r" + format(" ", 8, (Equ[selection]['wdef']).toString()) + " ";

                txt += "#d魔防 : #r" + format(" ", 8, (Equ[selection]['mdef']).toString()) + " ";

                txt += "#d可升 : #r" + format(" ", 8, (Equ[selection]['upgradeslots']).toString()) + "\r\n";
                txt += "#d已升 : #r" + format(" ", 8, (Equ[selection]['level']).toString()) + " ";
                //txt += "#d星级 : #r" + format(" ", 8, (Equ[selection]['enhance']).toString()) + "\r\n";
                cm.sendOk(txt);
                cm.dispose();
				
			} 

            
			
        }
    }
	


function RuinEquip(id) {
	 var rs = cm.sql_Select("SELECT chr.`name`, it.itemid, it.position, men.`str`, men.`dex` , men.`int`, men.`luk`, men.`watk`, men.`matk`, men.`mdef`, men.`wdef`, men.`upgradeslots`, men.`level`, SUM(men.`str`*10 + men.`dex`*10 + men.`int`*10 + men.`luk`*10 + men.`watk`*50 + men.`matk`*50  + men.`Mdef`+ men.`wdef` ) AS max FROM inventoryitems it, inventoryequipment men, characters chr WHERE (it.position < 0 AND it.inventoryitemid = men.inventoryitemid AND it.characterid = chr.id AND chr.id = '" + id + "') GROUP BY position DESC;");
    var Container = [];
    for (i in rs) {
        var RankGroup = [];
        RankGroup['name'] = rs.get(i).get("name");
        RankGroup['itemid'] = rs.get(i).get("itemid");
        RankGroup['position'] = rs.get(i).get("position");
        RankGroup['str'] = rs.get(i).get("str");
        RankGroup['dex'] = rs.get(i).get("dex");
        RankGroup['int'] = rs.get(i).get("int");
        RankGroup['luk'] = rs.get(i).get("luk");
        RankGroup['watk'] = rs.get(i).get("watk");
        RankGroup['matk'] = rs.get(i).get("matk");
        RankGroup['wdef'] = rs.get(i).get("wdef");
		RankGroup['mdef'] = rs.get(i).get("mdef");
        RankGroup['upgradeslots'] = rs.get(i).get("upgradeslots");
        RankGroup['level'] = rs.get(i).get("level");
        RankGroup['max'] = rs.get(i).get("max");
		//RankGroup['max']=RankGroup['str']+RankGroup['dex']+RankGroup['int']+RankGroup['luk'] +RankGroup['watk']+RankGroup['matk']+RankGroup['hp']+RankGroup['mp']+RankGroup['wdef']+RankGroup['upgradeslots']+RankGroup['level']+RankGroup['enhance']; 
        Container.push(RankGroup);
    }
    return Container;
}

function RuinKing() {
	var rs = cm.sql_Select("SELECT DISTINCT chr.`name`, chr.`job`, chr.`id` , SUM(men.`str`*10 + men.`dex`*10 + men.`int`*10 + men.`luk`*10 + men.`watk`*50 + men.`matk`*50  + men.`wdef`+ men.`Mdef`) AS max FROM inventoryitems it, inventoryequipment men,  characters chr WHERE (it.position < 0 AND it.inventoryitemid = men.inventoryitemid AND chr.id = it.characterid AND chr.gm <= 0  ) GROUP BY id ORDER BY max DESC;");
	
    var Container = [];
    for (i in rs) {
        var RankGroup = [];
        RankGroup['id'] = rs.get(i).get("id");
        RankGroup['name'] = rs.get(i).get("name");
        RankGroup['job'] = rs.get(i).get("job");
		
        RankGroup['max'] = rs.get(i).get("max");
        Container.push(RankGroup);
    }
    return Container;
}

function RuinStat(equip) {
    return equip.getStr()*10 + equip.getDex()*10 + equip.getInt()*10 + equip.getLuk()*10 + equip.getWatk()*50 + equip.getMatk()*50+ equip.getMdef() + equip.getWdef();
}


var format = function FormatString(c, length, content) { //符号 位置 代码 - 文本类型 .toString()
    var str = "";
    var cs = "";
    if (content.length > length) {
        str = content;
    } else {
        for (var j = 0; j < length - content.getBytes("GB2312").length; j++) {
            cs = cs + c;
        }
    }
    str = content + cs;
    return str;
}


function 战力更新(times,uid){
	var rs;
		rs = cm.sql_Select("SELECT characterid, combat FROM bastrranking");
	var 数值1 =0;
	var 数值2 =0;
		for (var i = 0; i < rs.size(); i++) {
			if (rs[i].get("characterid") == uid) {	
			数值1 = 1;	
			if(rs[i].get("combat")<times){
			数值2 = 1;		
			}
			
			}
		}
	if(数值1==0){	
	cm.sql_Insert("INSERT INTO bastrranking(id, characterid, combat) value(?,?,?)", null,uid,times);
	}else{
	if(数值2>0){	
	cm.sql_Update("update bastrranking set combat = ?  where characterid = ?", times,uid);	
	}
	}
	
}

