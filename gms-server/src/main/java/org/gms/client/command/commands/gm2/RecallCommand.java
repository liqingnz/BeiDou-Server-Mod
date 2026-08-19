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
package org.gms.client.command.commands.gm2;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.net.server.coordinator.world.EventRecallCoordinator;
import org.gms.scripting.event.EventInstanceManager;
import org.gms.util.I18nUtil;

public class RecallCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("RecallCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.yellowMessage(I18nUtil.getMessage("RecallCommand.message2"));
            return;
        }

        // 名字或角色 id 都收，见 Command.resolveTarget。改用全区在线列表而非本频道：
        // eim 是按 victim 自己的角色 id 取的，召回落在他所在频道的副本里，与 GM 在哪条线无关
        Character victim = resolveTarget(c, params[0]);
        if (victim == null) {
            player.dropMessage(6, I18nUtil.getMessage("RecallCommand.message3", params[0]));
            return;
        }

        // 手动召回不受掉线时限与冷却约束，也不计入冷却
        EventInstanceManager eim = EventRecallCoordinator.getInstance().peekEventInstance(victim.getId());
        if (eim == null) {
            player.dropMessage(6, I18nUtil.getMessage("RecallCommand.message4", victim.getName()));
            return;
        }

        eim.registerPlayer(victim);
        player.dropMessage(6, I18nUtil.getMessage("RecallCommand.message5", victim.getName()));
    }
}
