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
package org.gms.client.command;

import lombok.Data;
import org.gms.client.Character;
import org.gms.client.Client;

@Data
public abstract class Command {

    protected int rank;
    protected String description;

    public abstract void execute(Client client, String[] params);

    /**
     * 按玩家敲进来的一个 token 找在线角色：先当角色名查，再当角色 id 查，都不中返回 null。
     * <p>
     * 中文角色名在聊天栏敲指令很痛苦，所以每个收角色的指令都该同时认 id。这里统一一份，
     * 免得各指令各写一遍——原先散落的写法用 {@code StringUtil.isNumeric} 判数字，
     * 而它对 {@code "1.5"} 和超出 int 范围的长数字都返回 true，随后的 parseInt 抛
     * NumberFormatException，且 {@code CommandsExecutor.handleInternal} 并没有兜异常。
     * 这里改成直接 try/catch 解析，解析不了就是"找不到"。
     * <p>
     * 一律查全区在线列表（{@code getWorldServer()}）：GM 不必为了操作别人先跳频道。
     *
     * @param token 玩家输入的角色名或角色 id
     * @return 在线角色；找不到返回 null，由调用方给自己的提示
     */
    protected static Character resolveTarget(Client c, String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }

        // PlayerStorage 内部按小写存名字，这里不必再自己转
        Character victim = c.getWorldServer().getPlayerStorage().getCharacterByName(token);
        if (victim != null) {
            return victim;
        }

        try {
            return c.getWorldServer().getPlayerStorage().getCharacterById(Integer.parseInt(token));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    protected String joinStringFrom(String[] arr, int start) {
        StringBuilder builder = new StringBuilder();
        for (int i = start; i < arr.length; i++) {
            builder.append(arr[i]);
            if (i != arr.length - 1) {
                builder.append(" ");
            }
        }
        return builder.toString();
    }
}

