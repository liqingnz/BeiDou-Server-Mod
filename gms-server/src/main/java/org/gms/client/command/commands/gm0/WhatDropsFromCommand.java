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
import org.gms.constants.id.NpcId;
import org.gms.server.ItemInformationProvider;
import org.gms.server.life.MonsterDropEntry;
import org.gms.server.life.MonsterInformationProvider;
import org.gms.util.I18nUtil;
import org.gms.util.MobTextUtil;
import org.gms.util.Pair;

import java.util.Iterator;

public class WhatDropsFromCommand extends Command {
    /**
     * 每只怪最多列几件掉落。
     * <p>
     * 客户端对话框高度固定且没有滚动条，装不下的部分不会画出来——服务端这边一个字都没截
     * （{@code npcTalk} 直到 {@code writeString} 全程无长度检查），所以只能自己收着发。
     * 超出的件数在末尾明说，免得玩家以为就这么多。
     */
    private static final int DROP_LIMIT = 12;

    {
        setDescription(I18nUtil.getMessage("WhatDropsFromCommand.message1"));
    }

    @Override
    public void execute(Client c, String[] params) {
        Character player = c.getPlayer();
        if (params.length < 1) {
            player.dropMessage(5, I18nUtil.getMessage("WhatDropsFromCommand.message2"));
            return;
        }
        String monsterName = player.getLastCommandMessage();
        StringBuilder output = new StringBuilder();
        int limit = 3;
        Iterator<Pair<Integer, String>> listIterator = MonsterInformationProvider.getMobsIDsFromName(monsterName).iterator();
        for (int i = 0; i < limit; i++) {
            if (listIterator.hasNext()) {
                Pair<Integer, String> data = listIterator.next();
                int mobId = data.getLeft();
                String mobName = data.getRight();
                // 立绘走 MobTextUtil：路径里的怪 id 必须是 link 解析过的，
                // 直接用 mobId 会让 20% 的怪（自己没有动作帧的 link 怪）把客户端搞崩
                output.append(MobTextUtil.mobImage(mobId)).append("\r\n")
                        .append("#r").append(mobName).append("#k ")
                        .append(I18nUtil.getMessage("WhatDropsFromCommand.message3")).append("\r\n\r\n");
                int shown = 0;
                int omitted = 0;
                for (MonsterDropEntry drop : MonsterInformationProvider.getInstance().retrieveDrop(mobId)) {
                    try {
                        String name = ItemInformationProvider.getInstance().getName(drop.itemId);
                        if (name == null || name.equals("null") || drop.chance == 0) {
                            continue;
                        }
                        if (shown >= DROP_LIMIT) {
                            omitted++;
                            continue;   // 继续走完循环才能数清剩几件，不能直接 break
                        }
                        // 计算精度丢失的问题
                        float chance = Math.max(1000000F / drop.chance / (!MonsterInformationProvider.getInstance().isBoss(mobId) ? player.getDropRate() : player.getBossDropRate()), 1);
                        // #v 物品图标 + #z 物品名，客户端富文本渲染（LK ac7830b5 的显示改进；保留按怪名搜索，不跟 LK 改成按 id）
                        output.append("- #v").append(drop.itemId).append("##z").append(drop.itemId).append("# (1/").append((int) chance).append(")\r\n");
                        shown++;
                    } catch (Exception ex) {
                        ex.printStackTrace();
                    }
                }
                if (omitted > 0) {
                    output.append(I18nUtil.getMessage("WhatDropsFromCommand.message4", omitted)).append("\r\n");
                }
                output.append("\r\n");
            }
        }

        c.getAbstractPlayerInteraction().npcTalk(NpcId.MAPLE_ADMINISTRATOR, output.toString());
    }
}
