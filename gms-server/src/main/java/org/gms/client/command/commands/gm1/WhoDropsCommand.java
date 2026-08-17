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
package org.gms.client.command.commands.gm1;

import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.util.I18nUtil;

/**
 * 物品掉落查询入口。
 * <p>
 * 查询逻辑本身在脚本中心的「当前地图掉落_物品查询」里：按 11 个大类浏览、分页展示，
 * 点开单个物品可看掉落来源、基础爆率与角色实际爆率，比原先的按名搜索完善。
 */
public class WhoDropsCommand extends Command {
    private static final String SCRIPT_NAME = "当前地图掉落_物品查询";

    {
        setDescription(I18nUtil.getMessage("WhoDropsCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        // 脚本中心目前只有中文层有，en-US 下开不起来。开不起来要说一声，不能让玩家对着没反应的指令猜
        if (!c.getPlayer().getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, SCRIPT_NAME)) {
            c.getPlayer().yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }
}
