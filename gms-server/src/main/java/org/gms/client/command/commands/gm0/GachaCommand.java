/*
    This file is part of the HeavenMS MapleStory Server, commands OdinMS-based
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

/*
   @Author: Arthur L - Refactored command content into modules
*/
package org.gms.client.command.commands.gm0;

import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.dao.entity.GachaponRewardDO;
import org.gms.manager.ServerManager;
import org.gms.model.dto.GachaponPoolRewardsDTO;
import org.gms.server.gachapon.Gachapon;
import org.gms.service.GachaponService;
import org.gms.util.I18nUtil;

public class GachaCommand extends Command {
    /** 不带参数时拉起的选单脚本，与 NPC「扭蛋奖励播报员」是同一份 */
    private static final String SCRIPT_NAME = "gachaponInfo";

    {
        setDescription(I18nUtil.getMessage("GachaCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        String search = c.getPlayer().getLastCommandMessage().trim();

        // 不带参数就开选单，别逼玩家把城镇名一字不差地敲对。脚本本身早就在，只是没接到指令上，
        // 与 @goto / @cospreview / @droptable 一个做法
        if (search.isEmpty()) {
            if (!c.getPlayer().getAbstractPlayerInteraction().openNpc(NpcId.MAPLE_ADMINISTRATOR, SCRIPT_NAME)) {
                c.getPlayer().yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
            }
            return;
        }

        Gachapon.GachaponType gacha = null;
        String gachaName = "";
        String[] names = Gachapon.GachaponType.getLootNames();
        int[] ids = Gachapon.GachaponType.getLootIds();
        for (int i = 0; i < names.length; i++) {
            if (search.equalsIgnoreCase(names[i])) {
                gachaName = names[i];
                gacha = Gachapon.GachaponType.getByNpcId(ids[i]);
            }
        }
        if (gacha == null) {
            c.getPlayer().yellowMessage(I18nUtil.getMessage("GachaCommand.message12"));
            for (String name : names) {
                c.getPlayer().yellowMessage(name);
            }
            return;
        }
        StringBuilder talkStr = new StringBuilder("#b" + gachaName + "#k");
        talkStr.append(I18nUtil.getMessage("GachaCommand.message13"));
        talkStr.append("\r\n");
        GachaponService gachaponService = ServerManager.getApplicationContext().getBean(GachaponService.class);
        // 按奖池分档展示：平铺一大列看不出稀有度。奖池就是 BeiDou 这边的「档」
        for (GachaponPoolRewardsDTO pool : gachaponService.getRewardsGroupedByNpcId(gacha.getNpcId())) {
            talkStr.append("\r\n#r").append(pool.getPoolName()).append("#k  ")
                    .append(I18nUtil.getMessage("GachaCommand.message18", formatProb(pool.getRealProb())))
                    .append("\r\n");
            // 一件一行会把奖池撑成好几屏，而客户端对话框没有滚动条、看不见的部分就是看不见。
            // 图标+名连排，换行交给客户端自己折
            for (GachaponRewardDO reward : pool.getRewards()) {
                talkStr.append("#v").append(reward.getItemId()).append("##z").append(reward.getItemId()).append("#  ");
            }
            talkStr.append("\r\n");
        }
        talkStr.append("\r\n");
        talkStr.append(I18nUtil.getMessage("GachaCommand.message14"));

        c.getAbstractPlayerInteraction().npcTalk(NpcId.MAPLE_ADMINISTRATOR, talkStr.toString());
    }

    /** realProb 单位是 1/1000000，化成百分数保留两位 */
    static String formatProb(int realProb) {
        return String.format("%.2f", realProb / 10000f);
    }
}
