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
            var sendStr = "Hi, #r#p" + cm.getNpc() + "##k here! I'm announcing all obtainable loots from the Gachapons. Which Gachapon machine would you like to look?\r\n\r\n#b";
            for (let i = 0; i < lootNames.length; i++) {
                sendStr += "#L" + i + "##b" + lootNames[i] + "#k#l\r\n";
            }
            cm.sendSimple(sendStr);
        } else if (status == 1) {
            // Grouped by reward pool: a flat list hides rarity. A pool is this server's "tier",
            // and the odds come from GachaponService (same formula as the admin panel and the actual roll)
            var sendStr = "Loots from #b" + lootNames[selection] + "#k, grouped by rarity\r\n";
            var ServerManager = Java.type('org.gms.manager.ServerManager');
            var gachaponService = ServerManager.getApplicationContext().getBean("gachaponService");
            var pools = gachaponService.getRewardsGroupedByNpcId(lootIds[selection]);
            for (let i = 0; i < pools.length; i++) {
                var pool = pools[i];
                sendStr += "\r\n#r" + pool.getPoolName() + "#k  (tier chance " + (pool.getRealProb() / 10000).toFixed(2) + "%)\r\n";
                // One per line blows the pool up to several screens, and the client dialog has no
                // scrollbar; pack icon+name inline and let the client wrap
                var rewards = pool.getRewards();
                for (let j = 0; j < rewards.length; j++) {
                    sendStr += "#v" + rewards[j].getItemId() + "##z" + rewards[j].getItemId() + "#  ";
                }
                sendStr += "\r\n";
            }
            sendStr += "\r\nItems within a tier are drawn with equal chance. Shared pools common to every gachapon are already listed above.";
            cm.sendPrev(sendStr);
        } else if (status == 2) {
            cm.dispose();
        }
    }
}