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
/* NPC: Donation Box (9000041)
	Victoria Road : Henesys
	
	NPC Bazaar:
        * @author Ronan Lana
*/

var options = ["EQUIP", "USE", "SET-UP", "ETC"];
var name;
var status;
var selectedType = 0;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    status++;
    if (mode != 1) {
        cm.dispose();
        return;
    }

    if (status == 0) {
        const GameConfig = Java.type('org.gms.config.GameConfig');
        if (!GameConfig.getServerBoolean("use_enable_custom_npc_script")) {
            cm.sendOk("你好，我是#b#p" + cm.getNpc() + "##k。");
            cm.dispose();
            return;
        }

        var selStr = "你好，你可以通过我回收你不需要的物品。#r注意#b：确保你输入的物品#r之后#b都是你要回收的物品。#k你也可以通过输入指令#b@sellinv#k更好的直接出售物品！";
        for (var i = 0; i < options.length; i++) {
            selStr += "\r\n#L" + i + "# " + options[i] + "#l";
        }
        cm.sendSimple(selStr);
    } else if (status == 1) {
        selectedType = selection;
        cm.sendGetText("你想从#r" + options[selectedType] + "#k栏哪个物品开始回收？（输入物品名）");
    } else if (status == 2) {
        name = cm.getText();
        var res = cm.getPlayer().sellAllItemsFromName(selectedType + 1, name);

        if (res > -1) {
            cm.sendOk("交易完成！你从这个行动中获得了#r" + cm.numberWithCommas(res) + "金币#k。");
        } else {
            cm.sendOk("你#b" + options[selectedType] + "#k栏中没有 #b'" + name + "'#k！");
        }

        cm.dispose();
    }
}