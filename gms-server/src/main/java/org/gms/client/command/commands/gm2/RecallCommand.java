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
import org.gms.net.server.PlayerStorage;
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

        // GM 手上通常只有名字；纯数字则按角色 id 再找一次。
        // 不能只靠 StringUtil.isNumeric 把关——它的正则是 -?\d+(\.\d+)?，
        // 既放行小数（"1.5"）也放行超出 int 范围的长数字，两种都会让 parseInt 抛异常
        PlayerStorage storage = c.getChannelServer().getPlayerStorage();
        Character victim = storage.getCharacterByName(params[0]);
        if (victim == null) {
            try {
                victim = storage.getCharacterById(Integer.parseInt(params[0]));
            } catch (NumberFormatException ignored) {
                // 不是角色名也不是合法角色 id，下面统一报「找不到」
            }
        }
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
