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

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.util.I18nUtil;

/**
 * 测谎：给目标弹一道限时算术题，答不上来就按挂机脚本处理。
 * <p>
 * 不带参数时开当前地图的可测目标列表脚本，带参数时按角色名直接发起。
 * 具体判定与处罚在 {@code AbstractPlayerInteraction.detectPlayer} 里，那里也写了整套机制的适用前提。
 */
public class DetectCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("DetectCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, "detectMap");
            return;
        }

        // 原实现逐个频道遍历 getPlayerStorage()，改用全区在线列表，省得为了测别人先跳频道
        Character victim = c.getWorldServer().getPlayerStorage().getCharacterByName(params[0]);
        if (victim == null || !victim.isLoggedInWorld()) {
            player.dropMessage(6, I18nUtil.getMessage("DetectCommand.message2", params[0]));
            return;
        }
        player.getAbstractPlayerInteraction().detectPlayer(victim);
    }
}
