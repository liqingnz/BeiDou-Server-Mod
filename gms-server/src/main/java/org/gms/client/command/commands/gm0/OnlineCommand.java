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

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.net.server.Server;
import org.gms.net.server.channel.Channel;
import org.gms.util.I18nUtil;

import java.util.Collection;
import java.util.List;

public class OnlineCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("OnlineCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        // 不带参数 = 全世界所有频道；带任意非 0 数字 = 只看当前频道。
        // 原实现直接 Short.parseShort(params[0])，传非数字会抛未捕获异常把指令打断。
        boolean currentChannelOnly = false;
        if (params.length >= 1) {
            try {
                currentChannelOnly = Short.parseShort(params[0]) != 0;
            } catch (NumberFormatException e) {
                player.yellowMessage(I18nUtil.getMessage("OnlineCommand.message4"));
                return;
            }
        }

        if (currentChannelOnly) {
            listChannel(player, c.getChannel(), c.getChannelServer().getPlayerStorage().getAllCharacters());
        } else {
            for (Channel ch : Server.getInstance().getChannelsFromWorld(player.getWorld())) {
                listChannel(player, ch.getId(), ch.getPlayerStorage().getAllCharacters());
            }
        }
    }

    private static void listChannel(Character player, int channelId, Collection<Character> characters) {
        player.yellowMessage(I18nUtil.getMessage("OnlineCommand.message2") + " " + channelId + ":");
        for (Character chr : characters) {
            if (!isVisibleTo(player, chr)) {
                continue;
            }
            player.message(" >> " + describe(player, chr));
        }
    }

    /**
     * 普通玩家看不到任何 GM；GM 只看得到权限**严格低于**自己的 GM——
     * 同级之间互相不可见，也看不到自己。这一条照搬 LK，改成 &lt;= 就是同级可见。
     */
    private static boolean isVisibleTo(Character viewer, Character target) {
        if (!target.isGM()) {
            return true;
        }
        return viewer.isGM() && target.gmLevel() < viewer.gmLevel();
    }

    /**
     * 权限越高看到的身份信息越多：4 级以上连账号 id 一并给出，便于直接封禁/改档。
     */
    private static String describe(Character viewer, Character target) {
        String tail = "[" + Character.makeMapleReadable(target.getName()) + "] "
                + I18nUtil.getMessage("OnlineCommand.message3") + " " + target.getMap().getMapName();
        if (!viewer.isGM()) {
            return tail;
        }
        if (viewer.gmLevel() > 3) {
            return target.getAccountId() + " - " + target.getId() + " " + tail;
        }
        return target.getId() + " " + tail;
    }
}
