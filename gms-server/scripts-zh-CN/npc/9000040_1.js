/*
    This file is part of the HeavenMS MapleStory Server
    Copyleft (L) 2016 - 2019 RonanLana

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation version 3 as published by
    the Free Software Foundation. You may not use, modify or distribute
    this program under any other version of the GNU Affero General Public
    License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/* Dalair
	Medal NPC.

        NPC Equipment Merger:
        * @author Ronan Lana
 */

var status;
var mergeFee = 500000;
var name;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (mode == 0 && type > 0) {
            cm.dispose();
            return;
        }
        if (mode == 1) {
            status++;
        } else {
            status--;
        }

        if (status == 0) {
            const GameConfig = Java.type('org.gms.config.GameConfig');
            if (!GameConfig.getServerBoolean("use_enable_custom_npc_script")) {
                cm.sendOk("勋章排名系统目前不可用。");
                cm.dispose();
                return;
            }

            var levelLimit = !cm.getPlayer().isCygnus() ? 160 : 110;  //这两个数字分别为其他职业和骑士团的等级要求，大于200级即为关闭，可根据需要修改等级要求以开放
            var selStr = "勋章排名系统当前不可用，但是...我提供#e#b装备吸收#k#n服务!\r\n";

            const MakerProcessor = Java.type('org.gms.client.processor.action.MakerProcessor');
            if (!GameConfig.getServerBoolean("use_starter_merge") && (cm.getPlayer().getLevel() < levelLimit || MakerProcessor.getMakerSkillLevel(cm.getPlayer()) < 3)) {
                selStr += "然而, 你必须拥有#r3级锻造#k并且#r160级(骑士团110级)#k以上,支付#r" + cm.numberWithCommas(mergeFee) + "金币#k才可以使用这个服务.";
                cm.sendOk(selStr);
                cm.dispose();
            } else if (cm.getMeso() < mergeFee) {
                selStr += "很抱歉，看起来你没有#r" + cm.numberWithCommas(mergeFee) + "金币#k, 导致你现在无法支付服务费... 请以后再来.";
                cm.sendOk(selStr);
                cm.dispose();
            } else {
                selStr += "将你的背包中不需要的装备吸收到当前装备中，以获得属性提升！服务费用是#r" + cm.numberWithCommas(mergeFee) + "#k金币。";
                cm.sendNext(selStr);
            }
        } else if (status == 1) {
            selStr = "#r警告：#k请先在背包中准备好用来吸收的装备素材，再输入装备名称。#b这件装备以及之后所有的装备道具都会被吸收消失掉，同名装备请千万注意排列好顺序，因错误操作损失自负！#k.\r\n\r\n请注意，吸收获得过属性提升的装备将#b无法进行交易#k，也不能当做合并素材。\r\n\r\n";
            cm.sendGetText(selStr);
        } else if (status == 2) {
            name = cm.getText();

            if (cm.getPlayer().mergeAllItemsFromName(name)) {
                cm.gainMeso(-mergeFee);
                cm.sendOk("装备吸收完成！感谢您使用本服务，祝您享受新的装备属性。");
            } else {
                cm.sendOk("你的#b装备#k栏中没有#b'" + name + "'#k！");
            }

            cm.dispose();
        }
    }
}