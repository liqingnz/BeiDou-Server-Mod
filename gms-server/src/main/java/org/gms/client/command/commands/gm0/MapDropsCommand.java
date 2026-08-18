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
 * 掉落查询的快捷入口。
 * <p>
 * 只负责打开 scripts-zh-CN/MapleLand/mapdrops.js，查询逻辑本身不在这里实现——
 * 脚本版开头列出全服掉落，接着按 BOSS/普通分组列当前地图存活的怪物，可逐个下钻看
 * 怪物属性、立绘、以及基础掉率与角色实际掉率，比 LichKingMod 的一次性文本输出完善得多。
 */
public class MapDropsCommand extends Command {
    private static final String SCRIPT_NAME = "mapdrops";

    {
        setDescription(I18nUtil.getMessage("MapDropsCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        // MapleLand 的脚本目前只有中文层有，en-US 下开不起来。开不起来要说一声，不能让玩家对着没反应的指令猜
        if (!c.getPlayer().getAbstractPlayerInteraction().openNpc(NpcId.MAPLE_ADMINISTRATOR, SCRIPT_NAME)) {
            c.getPlayer().yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SCRIPT_NAME));
        }
    }
}
