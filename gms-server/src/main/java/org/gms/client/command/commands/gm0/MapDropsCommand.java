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
package org.gms.client.command.commands.gm0;

import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.util.I18nUtil;

/**
 * 当前地图掉落查询的快捷入口。
 * <p>
 * 只负责打开脚本中心已有的「当前地图掉落」脚本，查询逻辑本身不在这里实现——
 * BeiDou 的脚本版按 BOSS/普通分组、可逐个怪物下钻、显示怪物属性与立绘、
 * 区分基础掉率与角色实际掉率，比 LichKingMod 的一次性文本输出完善得多。
 * 此前该功能只能从 9900001 的菜单进入，这里补一个指令入口。
 */
public class MapDropsCommand extends Command {
    private static final String SCRIPT_NAME = "当前地图掉落_当前地图";

    {
        setDescription(I18nUtil.getMessage("MapDropsCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        // 脚本中心目前只有中文层有，en-US 下开不起来。开不起来要说一声，不能让玩家对着没反应的指令猜
        if (!c.getPlayer().getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, SCRIPT_NAME)) {
            c.getPlayer().yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }
}
