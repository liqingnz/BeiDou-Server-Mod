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
/**
 * @author: Ronan
 * @npc: Pio
 * @func: Gachapon Loot Announcer
 */

var status;
var lootNames;
var lootIds;

function start() {
    const Gachapon = Java.type('org.gms.server.gachapon.Gachapon');
    lootNames = Gachapon.GachaponType.getLootNames();
    lootIds = Gachapon.GachaponType.getLootIds();

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
            var sendStr = "你好，我是#r#p" + cm.getNpc() + "##k！我可以向你展示所有扭蛋机的奖励列表，你想要查看哪一个呢？\r\n\r\n";
            for (let i = 0; i < lootNames.length; i++) {
                sendStr += "#L" + i + "##b" + lootNames[i] + "#k#l\r\n";
            }
            cm.sendSimple(sendStr);
        } else if (status == 1) {
            // 按奖池分档列出：平铺一大列看不出稀有度。奖池就是本服的「档」，
            // 概率由 GachaponService 算好（与后台奖池列表、实际抽奖同一个公式）
            var sendStr = "#b" + lootNames[selection] + "#k拥有以下奖励（按稀有度分档）\r\n";
            var ServerManager = Java.type('org.gms.manager.ServerManager');
            var gachaponService = ServerManager.getApplicationContext().getBean("gachaponService");
            var pools = gachaponService.getRewardsGroupedByNpcId(lootIds[selection]);
            for (let i = 0; i < pools.length; i++) {
                var pool = pools[i];
                sendStr += "\r\n#r" + pool.getPoolName() + "#k  （抽中本档 " + (pool.getRealProb() / 10000).toFixed(2) + "%）\r\n";
                // 一件一行会把奖池撑成好几屏，而客户端对话框没有滚动条；图标+名连排，换行交给客户端折
                var rewards = pool.getRewards();
                for (let j = 0; j < rewards.length; j++) {
                    sendStr += "#v" + rewards[j].getItemId() + "##z" + rewards[j].getItemId() + "#  ";
                }
                sendStr += "\r\n";
            }
            sendStr += "\r\n同一档内为等概率抽取。跨扭蛋机通用的公共奖池已包含在上表中。";
            cm.sendPrev(sendStr);
        } else if (status == 2) {
            cm.dispose();
        }
    }
}