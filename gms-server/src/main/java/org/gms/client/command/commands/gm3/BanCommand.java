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
package org.gms.client.command.commands.gm3;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.command.Command;
import org.gms.net.server.Server;
import org.gms.server.TimerManager;
import org.gms.util.DatabaseConnection;
import org.gms.util.I18nUtil;
import org.gms.util.PacketCreator;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class BanCommand extends Command {
    {
        setDescription(I18nUtil.getMessage("BanCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 2) {
            player.yellowMessage(I18nUtil.getMessage("BanCommand.message2"));
            return;
        }
        String ign = params[0];
        String reason = joinStringFrom(params, 1);
        // 原实现只在本频道找人（getChannelServer）。目标在别的频道时 target 为 null，
        // 于是静默落到下面的离线分支——那条路不封 IP、不封 MAC、不给目标提示、也不踢线，
        // 等于跨频道封人被悄悄降级成「只标记账号」。改用全区在线列表
        Character target = resolveTarget(c, ign);
        if (target != null) {
            String readableTargetName = Character.makeMapleReadable(target.getName());
            String ip = target.getClient().getRemoteAddress();
            //Ban ip
            try (Connection con = DatabaseConnection.getConnection()) {
                if (ip.matches("[0-9]{1,3}\\..*")) {
                    try (PreparedStatement ps = con.prepareStatement("INSERT INTO ipbans VALUES (DEFAULT, ?, ?)")) {
                        ps.setString(1, ip);
                        ps.setString(2, String.valueOf(target.getClient().getAccID()));

                        ps.executeUpdate();
                    }
                }
            } catch (SQLException ex) {
                ex.printStackTrace();
                c.getPlayer().message(I18nUtil.getMessage("BanCommand.message3"));
                c.getPlayer().message(I18nUtil.getMessage("BanCommand.message4", target.getName(), ip));
            }
            target.getClient().banMacs();
            reason = I18nUtil.getMessage("BanCommand.message5", c.getPlayer().getName(), readableTargetName, reason, ip, c.getMacs());
            target.ban(reason);
            target.yellowMessage(I18nUtil.getMessage("BanCommand.message6", c.getPlayer().getName()));
            target.yellowMessage(I18nUtil.getMessage("BanCommand.message7", reason));
            c.sendPacket(PacketCreator.getGMEffect(4, (byte) 0));
            final Character rip = target;
            TimerManager.getInstance().schedule(() -> rip.getClient().disconnect(false, false), 5000); //5 Seconds
            // 播报用查到的角色名而不是 ign：现在 ign 也可能是一串角色 id，全服公告不该显示数字
            Server.getInstance().broadcastMessage(c.getWorld(), PacketCreator.serverNotice(6, I18nUtil.getMessage("BanCommand.message8", readableTargetName)));
        } else if (Character.ban(ign, reason, false)) {
            c.sendPacket(PacketCreator.getGMEffect(4, (byte) 0));
            Server.getInstance().broadcastMessage(c.getWorld(), PacketCreator.serverNotice(6, I18nUtil.getMessage("BanCommand.message8", ign)));
        } else {
            c.sendPacket(PacketCreator.getGMEffect(6, (byte) 1));
        }
    }
}
