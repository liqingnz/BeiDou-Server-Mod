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
import java.util.concurrent.atomic.AtomicInteger;

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

        // 默认路径：打开 Salon，不进入遍历分支。
        // Salon 目前只有中文层有，en-US 下开不起来，得给玩家一句提示
        if (params.length < 2) {
            if (!player.getAbstractPlayerInteraction().openNpc(NpcId.BEI_DOU_NPC_BASE, SALON_SCRIPT)) {
                player.yellowMessage(I18nUtil.getMessage("Command.scriptMissing", SALON_SCRIPT));
            }
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

        // 计数器放在任务闭包里而不是 CommandManager 的共享 intMap：intMap 只按角色id分键、
        // 取消却按类别分类，同时开 face 和 hair 两个预览会以 +1/+10 交错改同一个计数器
        AtomicInteger cursor = new AtomicInteger(startId);
        ScheduledFuture<?> sf = TimerManager.getInstance().register(
                () -> stepPreview(player, face, category, cursor), PREVIEW_INTERVAL_MS);
        CommandManager.getInstance().registerRunningCommands(category, player.getId(), sf);
    }

    private void stepPreview(Character player, boolean face, String category, AtomicInteger cursor) {
        // 角色下线后没有任何地方会来收这个任务，它会一直每 800ms 对一个已登出的 Character
        // 调 setFace/updateSingleStat，把整个角色对象一起留在内存里
        if (!player.isLoggedInWorld()) {
            CommandManager.getInstance().cancelRunningCommands(category, player.getId());
            return;
        }

        int current = cursor.getAndAdd(face ? FACE_STEP : HAIR_STEP);

        // 越过号段就自停。原先只发一条提示不取消任务，脸型从 30000 空转到 50000
        // 要刷屏四个多小时，之后更是永久无效地跑下去
        boolean valid = face ? ItemConstants.isFace(current) : ItemConstants.isHair(current);
        if (!valid) {
            player.yellowMessage(I18nUtil.getMessage("CosPreviewCommand.message4", current));
            CommandManager.getInstance().cancelRunningCommands(category, player.getId());
            return;
        }
        // 号段内但本服没有这一款，跳过继续找下一款
        if (ItemInformationProvider.getInstance().getName(current) == null) {
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
