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
package org.gms.client.command.commands.gm5;

import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.constants.id.NpcId;
import org.gms.util.I18nUtil;

/**
 * 按脚本名直接打开一个 NPC 脚本，用于调试脚本而不必先在地图上摆好 NPC。
 */
public class TestScriptCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("TestScriptCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        if (params.length < 1) {
            c.getPlayer().yellowMessage(I18nUtil.getMessage("TestScriptCommand.message2"));
            return;
        }
        c.getPlayer().getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, params[0]);
    }
}
