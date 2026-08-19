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
 * 大雄宝殿（702100000）准入。
 *
 * 挂在 2 个真入口上：702030000 山腰（portal h-top04）与 702050000 广场（portal out00）。
 * 寺内那几条通道不挂——人已经在门后了，再拦一道只会把人关在里面。
 *
 * 门槛不写在这里，直接问 TeleportRestriction：那张表是瞬移之石、家族传送、@goto
 * 共用的规则源，门槛与 GM 豁免口径都以它为准。脚本这层只负责展示和落点。
 *
 * 落点取 portal 自身配置，不能写死 warp(702100000, 8)——两个入口的目标 portal 不同。
 * 已知问题：702030000 的 h-top04 配的 tn 是 h-bottom01，而 702100000 并没有这个
 * portal，走这条路进殿会落到随机出生点。要修得动 wz（补 portal 或改 tn），
 * 得同步客户端，暂未处理。
 */
var TeleportRestriction = Java.type("org.gms.server.maps.TeleportRestriction");

function enter(pi) {
    var portal = pi.getPortal();
    var targetMapId = portal.getTargetMapId();

    var denial = TeleportRestriction.checkTeleport(pi.getPlayer(), targetMapId);
    if (denial.isPresent()) {
        pi.playerMessage(5, denial.get());
        return false;
    }

    pi.playPortalSound();
    pi.warp(targetMapId, portal.getTarget());
    return true;
}
