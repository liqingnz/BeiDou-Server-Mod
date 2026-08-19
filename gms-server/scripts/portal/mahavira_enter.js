/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

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
 * 大雄宝殿（702100000）准入：需先完成任务 8530「拜山门」。
 *
 * 本脚本挂在全部 6 个通往 702100000 的入口上，六个入口的目标 portal 各不相同
 * （h-bottom01 / in00 / out00 / h-top03 / out01），所以落点必须取 portal 自身的
 * 配置，不能像原实现那样写死 warp(702100000, 8)——那样所有人都会从同一个点进去。
 */
var QUEST_MAHAVIRA = 8530;

function enter(pi) {
    if (!pi.isQuestCompleted(QUEST_MAHAVIRA)) {
        pi.playerMessage(5, "You must complete the Mahavira Hall quest before entering.");
        return false;
    }

    var portal = pi.getPortal();
    pi.playPortalSound();
    pi.warp(portal.getTargetMapId(), portal.getTarget());
    return true;
}
