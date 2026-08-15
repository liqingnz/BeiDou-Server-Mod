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
package org.gms.client.command.commands.gm2;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.Stat;
import org.gms.client.command.Command;
import org.gms.client.command.commands.CommandManager;
import org.gms.constants.id.NpcId;
import org.gms.constants.inventory.ItemConstants;
import org.gms.server.ItemInformationProvider;
import org.gms.server.TimerManager;
import org.gms.util.I18nUtil;

import java.util.concurrent.ScheduledFuture;

/**
 * 造型预览。
 * <p>
 * 默认走脚本中心的 Salon，用客户端原生的 sendStyle 预览窗口，不修改角色数据。
 * <p>
 * 保留 LichKingMod 的遍历式预览作为备用分支，需显式传入 face/hair 与起始id 才会进入。
 * 该分支会真实修改角色的发型/脸型并推送属性更新，只适合排查造型资源是否存在，
 * 不建议作为常规预览手段。
 */
public class CosPreviewCommand extends Command {
    private static final String SALON_SCRIPT = "Salon";
    private static final String CATEGORY_FACE = "FacePreview";
    private static final String CATEGORY_HAIR = "HairPreview";
    /**
     * 遍历分支每次切换造型的间隔，单位毫秒。
     */
    private static final long PREVIEW_INTERVAL_MS = 800L;
    /**
     * 脸型id相邻取值相差1，发型id相邻取值相差10。
     */
    private static final int FACE_STEP = 1;
    private static final int HAIR_STEP = 10;

    {
        setDescription(I18nUtil.getMessage("CosPreviewCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();

        // 默认路径：打开 Salon，不进入遍历分支
        if (params.length < 2) {
            player.getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, SALON_SCRIPT);
            return;
        }

        String type = params[0].toLowerCase();
        boolean face = "face".equals(type);
        if (!face && !"hair".equals(type)) {
            player.dropMessage(3, I18nUtil.getMessage("CosPreviewCommand.message2"));
            return;
        }

        int startId;
        try {
            startId = Integer.parseInt(params[1]);
        } catch (NumberFormatException e) {
            player.yellowMessage(I18nUtil.getMessage("CosPreviewCommand.message3"));
            return;
        }

        String category = face ? CATEGORY_FACE : CATEGORY_HAIR;
        CommandManager.getInstance().cancelRunningCommands(category, player.getId());
        CommandManager.getInstance().setIntMap(player.getId(), startId);

        ScheduledFuture<?> sf = TimerManager.getInstance().register(
                () -> stepPreview(player, face, category), PREVIEW_INTERVAL_MS);
        CommandManager.getInstance().registerRunningCommands(category, player.getId(), sf);
    }

    private void stepPreview(Character player, boolean face, String category) {
        Integer current = CommandManager.getInstance().getIntMap(player.getId());
        if (current == null) {
            CommandManager.getInstance().cancelRunningCommands(category, player.getId());
            return;
        }
        CommandManager.getInstance().setIntMap(player.getId(), current + (face ? FACE_STEP : HAIR_STEP));

        boolean valid = face ? ItemConstants.isFace(current) : ItemConstants.isHair(current);
        if (!valid || ItemInformationProvider.getInstance().getName(current) == null) {
            player.yellowMessage(I18nUtil.getMessage("CosPreviewCommand.message4", current));
            return;
        }

        if (face) {
            player.setFace(current);
            player.updateSingleStat(Stat.FACE, current);
        } else {
            player.setHair(current);
            player.updateSingleStat(Stat.HAIR, current);
        }
        player.equipChanged();
        player.dropMessage(2, I18nUtil.getMessage("CosPreviewCommand.message5", current));
    }
}
