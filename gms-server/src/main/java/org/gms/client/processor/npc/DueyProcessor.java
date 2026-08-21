/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

    Copyleft (L) 2016 - 2019 RonanLana (HeavenMS)

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
package org.gms.client.processor.npc;

import org.gms.client.Character;
import org.gms.client.Client;
import org.gms.client.autoban.AutobanFactory;
import org.gms.client.inventory.Inventory;
import org.gms.client.inventory.InventoryType;
import org.gms.client.inventory.Item;
import org.gms.client.inventory.ItemFactory;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.client.inventory.manipulator.KarmaManipulator;
import org.gms.config.GameConfig;
import org.gms.constants.id.ItemId;
import org.gms.constants.inventory.ItemConstants;
import org.gms.net.server.channel.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.gms.server.DueyPackage;
import org.gms.server.ItemInformationProvider;
import org.gms.server.Trade;
import org.gms.util.DatabaseConnection;
import org.gms.util.I18nUtil;
import org.gms.util.PacketCreator;
import org.gms.util.Pair;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.*;

/**
 * @author RonanLana - synchronization of Duey modules
 */
public class DueyProcessor {
    private static final Logger log = LoggerFactory.getLogger(DueyProcessor.class);

    public enum Actions {
        TOSERVER_RECV_ITEM(0x00),
        TOSERVER_SEND_ITEM(0x02),
        TOSERVER_CLAIM_PACKAGE(0x04),
        TOSERVER_REMOVE_PACKAGE(0x05),
        TOSERVER_CLOSE_DUEY(0x07),
        TOCLIENT_OPEN_DUEY(0x08),
        TOCLIENT_SEND_ENABLE_ACTIONS(0x09),
        TOCLIENT_SEND_NOT_ENOUGH_MESOS(0x0A),
        TOCLIENT_SEND_INCORRECT_REQUEST(0x0B),
        TOCLIENT_SEND_NAME_DOES_NOT_EXIST(0x0C),
        TOCLIENT_SEND_SAMEACC_ERROR(0x0D),
        TOCLIENT_SEND_RECEIVER_STORAGE_FULL(0x0E),
        TOCLIENT_SEND_RECEIVER_UNABLE_TO_RECV(0x0F),
        TOCLIENT_SEND_RECEIVER_STORAGE_WITH_UNIQUE(0x10),
        TOCLIENT_SEND_MESO_LIMIT(0x11),
        TOCLIENT_SEND_SUCCESSFULLY_SENT(0x12),
        TOCLIENT_RECV_UNKNOWN_ERROR(0x13),
        TOCLIENT_RECV_ENABLE_ACTIONS(0x14),
        TOCLIENT_RECV_NO_FREE_SLOTS(0x15),
        TOCLIENT_RECV_RECEIVER_WITH_UNIQUE(0x16),
        TOCLIENT_RECV_SUCCESSFUL_MSG(0x17),
        TOCLIENT_RECV_PACKAGE_MSG(0x1B);
        final byte code;

        Actions(int code) {
            this.code = (byte) code;
        }

        public byte getCode() {
            return code;
        }
    }

    private static Pair<Integer, Integer> getAccountCharacterIdFromCNAME(String name) {
        Pair<Integer, Integer> ids = new Pair<>(-1, -1);
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("SELECT id,accountid FROM characters WHERE name = ?")) {
            ps.setString(1, name);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    ids.left = rs.getInt("accountid");
                    ids.right = rs.getInt("id");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return ids;
    }

    private static void showDueyNotification(Client c, Character player) {
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("SELECT SenderName, Type FROM dueypackages WHERE ReceiverId = ? AND Checked = 1 ORDER BY Type DESC")) {

            ps.setInt(1, player.getId());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    try (PreparedStatement ps2 = con.prepareStatement("UPDATE dueypackages SET Checked = 0 where ReceiverId = ?")) {
                        ps2.setInt(1, player.getId());
                        ps2.executeUpdate();

                        c.sendPacket(PacketCreator.sendDueyParcelReceived(rs.getString("SenderName"), rs.getInt("Type") == 1));
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private static void deletePackageFromInventoryDB(Connection con, int packageId) throws SQLException {
        ItemFactory.DUEY.saveItems(new LinkedList<>(), packageId, con);
    }

    private static void removePackageFromDB(int packageId) {
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("DELETE FROM dueypackages WHERE PackageId = ?")) {
            ps.setInt(1, packageId);
            ps.executeUpdate();

            deletePackageFromInventoryDB(con, packageId);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    /**
     * 原子消费一张快递单：以 DELETE 的影响行数作为这件快递的唯一凭据。
     * <p>
     * 只有恰好删掉一行，才说明这件快递归本次调用所有，调用方才可以发货。单据行与它的物品行放在
     * 同一个事务里删，避免单没了、物品行还留在 inventoryitems 里成为孤儿。
     * <p>
     * ReceiverId 一并进 WHERE：既是归属校验（原实现只按 packageId 删，改包就能删别人的快递），
     * 也让「同一件快递被并发领取」交给数据库仲裁——后到的那次影响行数为 0，拿不到凭据就什么都不发。
     *
     * @return true 表示本次调用抢到了这件快递
     * @throws SQLException 数据库出错。<b>不能吞</b>：吞掉就等于「单没删成、货照发」，也就是复制
     */
    private static boolean consumePackageFromDB(int packageId, int receiverId) throws SQLException {
        try (Connection con = DatabaseConnection.getConnection()) {
            con.setAutoCommit(false);
            try {
                int deleted;
                try (PreparedStatement ps = con.prepareStatement("DELETE FROM dueypackages WHERE PackageId = ? AND ReceiverId = ?")) {
                    ps.setInt(1, packageId);
                    ps.setInt(2, receiverId);
                    deleted = ps.executeUpdate();
                }

                if (deleted != 1) {
                    con.rollback();
                    return false;
                }

                deletePackageFromInventoryDB(con, packageId);
                con.commit();
                return true;
            } catch (SQLException | RuntimeException e) {
                con.rollback();
                throw e;
            } finally {
                try {
                    con.setAutoCommit(true);
                } catch (SQLException se) {
                    // 还回连接池前恢复失败就算了，不能让它盖掉真正的异常，也不能改写已提交的结果
                }
            }
        }
    }

    private static DueyPackage getPackageFromDB(ResultSet rs) {
        try {
            int packageId = rs.getInt("PackageId");

            List<Pair<Item, InventoryType>> dueyItems = ItemFactory.DUEY.loadItems(packageId, false);
            DueyPackage dueypack;

            if (!dueyItems.isEmpty()) {     // in a duey package there's only one item
                dueypack = new DueyPackage(packageId, dueyItems.get(0).getLeft());
            } else {
                dueypack = new DueyPackage(packageId);
            }

            dueypack.setSender(rs.getString("SenderName"));
            dueypack.setMesos(rs.getInt("Mesos"));
            dueypack.setSentTime(rs.getTimestamp("TimeStamp"), rs.getBoolean("Type"));
            dueypack.setMessage(rs.getString("Message"));
            dueypack.setReceiverId(rs.getInt("ReceiverId"));

            return dueypack;
        } catch (SQLException sqle) {
            sqle.printStackTrace();
            return null;
        }
    }

    private static List<DueyPackage> loadPackages(Character chr) {
        List<DueyPackage> packages = new LinkedList<>();
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("SELECT * FROM dueypackages dp WHERE ReceiverId = ?")) {
            ps.setInt(1, chr.getId());

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    DueyPackage dueypack = getPackageFromDB(rs);
                    if (dueypack == null) {
                        continue;
                    }

                    packages.add(dueypack);
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return packages;
    }

    private static int createPackage(int mesos, String message, String sender, int toCid, boolean quick) {
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("INSERT INTO `dueypackages` (ReceiverId, SenderName, Mesos, TimeStamp, Message, Type, Checked) VALUES (?, ?, ?, ?, ?, ?, 1)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, toCid);
            ps.setString(2, sender);
            ps.setInt(3, mesos);
            ps.setTimestamp(4, new Timestamp(System.currentTimeMillis()));
            ps.setString(5, message);
            ps.setInt(6, quick ? 1 : 0);

            int updateRows = ps.executeUpdate();
            if (updateRows < 1) {
                log.error("Error trying to create package [mesos: {}, sender: {}, quick: {}, receiver chrId: {}]", mesos, sender, quick, toCid);
                return -1;
            }

            final int packageId;
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    packageId = rs.getInt(1);
                } else {
                    log.error("Failed inserting package [mesos: {}, sender: {}, quick: {}, receiver chrId: {}]", mesos, sender, quick, toCid);
                    return -1;
                }
            }

            return packageId;
        } catch (SQLException sqle) {
            sqle.printStackTrace();
        }

        return -1;
    }

    private static boolean insertPackageItem(int packageId, Item item) {
        Pair<Item, InventoryType> dueyItem = new Pair<>(item, InventoryType.getByType(item.getItemType()));
        try (Connection con = DatabaseConnection.getConnection()) {
            ItemFactory.DUEY.saveItems(Collections.singletonList(dueyItem), packageId, con);
            return true;
        } catch (SQLException sqle) {
            sqle.printStackTrace();
        }

        return false;
    }

    private static int addPackageItemFromInventory(int packageId, Client c, byte invTypeId, short itemPos, short amount) {
        if (invTypeId > 0) {
            ItemInformationProvider ii = ItemInformationProvider.getInstance();

            InventoryType invType = InventoryType.getByType(invTypeId);
            Inventory inv = c.getPlayer().getInventory(invType);

            Item item;
            inv.lockInventory();
            try {
                item = inv.getItem(itemPos);
                if (item != null && item.getQuantity() >= amount) {
                    if (item.isUntradeable() || ii.isUnmerchable(item.getItemId())) {
                        return -1;
                    }

                    if (ItemConstants.isRechargeable(item.getItemId())) {
                        InventoryManipulator.removeFromSlot(c, invType, itemPos, item.getQuantity(), true);
                    } else {
                        InventoryManipulator.removeFromSlot(c, invType, itemPos, amount, true, false);
                    }

                    item = item.copy();
                } else {
                    return -2;
                }
            } finally {
                inv.unlockInventory();
            }

            KarmaManipulator.toggleKarmaFlagToUntradeable(item);
            item.setQuantity(amount);

            if (!insertPackageItem(packageId, item)) {
                return 1;
            }
        }

        return 0;
    }

    public static void dueySendItem(Client c, byte invTypeId, short itemPos, short amount, int sendMesos, String sendMessage, String recipient, boolean quick) {
        if (c.tryacquireClient()) {
            try {
                if (c.getPlayer().isGM() && c.getPlayer().gmLevel() < GameConfig.getServerInt("minimum_gm_level_to_use_duey")) {
                    c.getPlayer().message("You cannot use Duey to send items at your GM level.");
                    log.info(String.format("GM %s tried to send a package to %s", c.getPlayer().getName(), recipient));
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_INCORRECT_REQUEST.getCode()));
                    return;
                }

                // 修复发快递给别人扣钱的问题
                if (sendMesos < 0) {
                    AutobanFactory.PACKET_EDIT.alert(c.getPlayer(), c.getPlayer().getName() + " tried to packet edit with sendMesos on duey.");
                    log.warn("Chr {} tried to use duey with mesos {}", c.getPlayer().getName(), sendMesos);
                    c.disconnect(true, false);
                    return;
                }
                int fee = Trade.getFee(sendMesos);
                if (sendMessage != null && sendMessage.length() > 100) {
                    AutobanFactory.PACKET_EDIT.alert(c.getPlayer(), c.getPlayer().getName() + " tried to packet edit with Quick Delivery on duey.");
                    log.warn("Chr {} tried to use duey with too long of a text", c.getPlayer().getName());
                    c.disconnect(true, false);
                    return;
                }
                if (!quick) {
                    fee += 5000;
                } else if (!c.getPlayer().haveItem(ItemId.QUICK_DELIVERY_TICKET)) {
                    AutobanFactory.PACKET_EDIT.alert(c.getPlayer(), c.getPlayer().getName() + " tried to packet edit with Quick Delivery on duey.");
                    log.warn("Chr {} tried to use duey with Quick Delivery without a ticket, mesos {} and amount {}", c.getPlayer().getName(), sendMesos, amount);
                    c.disconnect(true, false);
                    return;
                }

                long finalcost = (long) sendMesos + fee;
                if (finalcost < 0 || finalcost > Integer.MAX_VALUE || (amount < 1 && sendMesos == 0)) {
                    AutobanFactory.PACKET_EDIT.alert(c.getPlayer(), c.getPlayer().getName() + " tried to packet edit with duey.");
                    log.warn("Chr {} tried to use duey with mesos {} and amount {}", c.getPlayer().getName(), sendMesos, amount);
                    c.disconnect(true, false);
                    return;
                }

                if (c.getPlayer().getMeso() < finalcost) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_NOT_ENOUGH_MESOS.getCode()));
                    return;
                }

                var accIdCid = getAccountCharacterIdFromCNAME(recipient);
                var recipientAccId = accIdCid.getLeft();
                var recipientCid = accIdCid.getRight();

                if (recipientAccId == -1 || recipientCid == -1) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_NAME_DOES_NOT_EXIST.getCode()));
                    return;
                }

                if (recipientAccId == c.getAccID()) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_SAMEACC_ERROR.getCode()));
                    return;
                }

                if (quick) {
                    InventoryManipulator.removeById(c, InventoryType.CASH, ItemId.QUICK_DELIVERY_TICKET, (short) 1, false, false);
                }

                int packageId = createPackage(sendMesos, sendMessage, c.getPlayer().getName(), recipientCid, quick);
                if (packageId == -1) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_ENABLE_ACTIONS.getCode()));
                    return;
                }
                c.getPlayer().gainMeso((int) -finalcost, false);

                int res = addPackageItemFromInventory(packageId, c, invTypeId, itemPos, amount);
                if (res == 0) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_SUCCESSFULLY_SENT.getCode()));
                } else if (res > 0) {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_ENABLE_ACTIONS.getCode()));
                } else {
                    c.sendPacket(PacketCreator.sendDueyMSG(DueyProcessor.Actions.TOCLIENT_SEND_INCORRECT_REQUEST.getCode()));
                }

                Client rClient = null;
                int channel = c.getWorldServer().find(recipient);
                if (channel > -1) {
                    Channel rcserv = c.getWorldServer().getChannel(channel);
                    if (rcserv != null) {
                        Character rChr = rcserv.getPlayerStorage().getCharacterByName(recipient);
                        if (rChr != null) {
                            rClient = rChr.getClient();
                        }
                    }
                }

                if (rClient != null && rClient.isLoggedIn() && !rClient.getPlayer().isAwayFromWorld()) {
                    showDueyNotification(rClient, rClient.getPlayer());
                }
            } finally {
                c.releaseClient();
            }
        }
    }

    /**
     * 客户端「删除」按钮走这里，把快递单连同里面的物品一并丢弃。
     * <p>
     * 删除限定在自己的快递上：原实现只按 packageId 删，改一下包里的 id 就能删掉任意玩家的快递。
     */
    public static void dueyRemovePackage(Client c, int packageid, boolean playerRemove) {
        if (c.tryacquireClient()) {
            try {
                Character chr = c.getPlayer();
                boolean removed;
                try {
                    removed = consumePackageFromDB(packageid, chr.getId());
                } catch (SQLException e) {
                    log.error(I18nUtil.getLogMessage("DueyProcessor.dueyRemovePackage.error1"), chr.getName(), packageid, e);
                    c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                    return;
                }

                if (!removed) {
                    AutobanFactory.PACKET_EDIT.alert(chr, chr.getName() + " tried to packet edit with duey.");
                    log.warn(I18nUtil.getLogMessage("DueyProcessor.dueyRemovePackage.warn1"), chr.getName(), packageid);
                    c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                    return;
                }

                c.sendPacket(PacketCreator.removeItemFromDuey(playerRemove, packageid));
            } finally {
                c.releaseClient();
            }
        }
    }

    /**
     * 领取快递。顺序是<b>先删单、后发货</b>。
     * <p>
     * 原实现反过来——先 addFromDrop 把东西给出去，再调 dueyRemovePackage 删单，而删单那一步整个包在
     * {@code if (c.tryacquireClient())} 里（许可只有 7 个，抢不到就是个空操作，不报错也不回滚），
     * removePackageFromDB 又把 SQLException 吞掉正常返回。两条路都落在同一个状态上：
     * 货已到手、单还在库——玩家再点一次「取」就再来一份，可无限重复，装备也照复制。
     * 现在改由 DELETE 的影响行数当发货凭据，抢不到凭据就什么都不发，见 {@link #consumePackageFromDB}。
     * <p>
     * 原来的 synchronized 一并去掉：它锁的是整个类，横跨数据库往返把全服领快递串行化，
     * 却挡不住上面那两种失败——真正的互斥点在数据库的那一行上。这里改用按客户端的
     * tryacquireClient，抢不到就让玩家重试，方向上是「宁可不发」而不是「宁可多发」。
     */
    public static void dueyClaimPackage(Client c, int packageId) {
        if (!c.tryacquireClient()) {
            c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
            return;
        }

        try {
            Character chr = c.getPlayer();

            DueyPackage dp = null;
            try (Connection con = DatabaseConnection.getConnection();
                 PreparedStatement ps = con.prepareStatement("SELECT * FROM dueypackages dp WHERE PackageId = ?")) {
                ps.setInt(1, packageId);

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        dp = getPackageFromDB(rs);
                    }
                }
            } catch (SQLException e) {
                log.error(I18nUtil.getLogMessage("DueyProcessor.dueyClaimPackage.error1"), chr.getName(), packageId, e);
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                return;
            }

            if (dp == null) {
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                log.warn(I18nUtil.getLogMessage("DueyProcessor.dueyClaimPackage.warn1"), chr.getName(), packageId);
                return;
            }

            // 判断是否本人快递，不是本人那就是改包了
            if (!Objects.equals(dp.getReceiverId(), chr.getId())) {
                AutobanFactory.PACKET_EDIT.alert(chr, chr.getName() + " tried to packet edit with duey.");
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                log.warn(I18nUtil.getLogMessage("DueyProcessor.dueyClaimPackage.warn2"), chr.getName(), packageId, dp.getReceiverId());
                return;
            }

            if (dp.isDeliveringTime()) {
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                return;
            }

            // 金币上限校验挪到物品判断之外：原来嵌在 if (dpItem != null) 里，
            // 只带金币不带物品的快递会跳过校验，超出上限的部分被 gainMeso 静默吃掉
            if (!chr.canHoldMeso(dp.getMesos())) {
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                return;
            }

            Item dpItem = dp.getItem();
            if (dpItem != null && !InventoryManipulator.checkSpace(c, dpItem.getItemId(), dpItem.getQuantity(), dpItem.getOwner())) {
                int itemid = dpItem.getItemId();
                if (ItemInformationProvider.getInstance().isPickupRestricted(itemid)
                        && chr.getInventory(ItemConstants.getInventoryType(itemid)).findById(itemid) != null) {
                    c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_RECEIVER_WITH_UNIQUE.getCode()));
                } else {
                    c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_NO_FREE_SLOTS.getCode()));
                }
                return;
            }

            // 校验全过，先删单换取发货凭据
            boolean claimed;
            try {
                claimed = consumePackageFromDB(packageId, chr.getId());
            } catch (SQLException e) {
                log.error(I18nUtil.getLogMessage("DueyProcessor.dueyClaimPackage.error1"), chr.getName(), packageId, e);
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                return;
            }

            if (!claimed) {     // 这件快递已经被在此之前的某次请求领走了
                c.sendPacket(PacketCreator.sendDueyMSG(Actions.TOCLIENT_RECV_UNKNOWN_ERROR.getCode()));
                return;
            }

            if (dpItem != null && !InventoryManipulator.addFromDrop(c, dpItem, false)) {
                // 预检通过却仍放不下（校验与发放之间背包被别的线程填满），单据已经删掉退不回去，
                // 只能落一条 error 供人工补发，物品信息要记全，光记 packageId 事后查不出发的是什么
                log.error(I18nUtil.getLogMessage("DueyProcessor.dueyClaimPackage.error2"),
                        chr.getId(), chr.getName(), packageId, dpItem.getItemId(), dpItem.getQuantity());
            }

            chr.gainMeso(dp.getMesos(), false);
            c.sendPacket(PacketCreator.removeItemFromDuey(false, packageId));
        } finally {
            c.releaseClient();
        }
    }

    public static void dueySendTalk(Client c, boolean quickDelivery) {
        if (c.tryacquireClient()) {
            try {
                long timeNow = System.currentTimeMillis();
                if (timeNow - c.getPlayer().getNpcCooldown() < GameConfig.getServerInt("block_npc_race_condition")) {
                    c.sendPacket(PacketCreator.enableActions());
                    return;
                }
                c.getPlayer().setNpcCooldown(timeNow);

                if (quickDelivery) {
                    c.sendPacket(PacketCreator.sendDuey(0x1A, null));
                } else {
                    c.sendPacket(PacketCreator.sendDuey(0x8, loadPackages(c.getPlayer())));
                }
            } finally {
                c.releaseClient();
            }
        }
    }

    public static void dueyCreatePackage(Item item, int mesos, String sender, int recipientCid) {
        int packageId = createPackage(mesos, null, sender, recipientCid, false);
        if (packageId != -1) {
            insertPackageItem(packageId, item);
        }
    }

    public static void runDueyExpireSchedule() {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DATE, -30);
        final Timestamp ts = new Timestamp(c.getTime().getTime());

        try (Connection con = DatabaseConnection.getConnection()) {
            List<Integer> toRemove = new LinkedList<>();
            try (PreparedStatement ps = con.prepareStatement("SELECT `PackageId` FROM dueypackages WHERE `TimeStamp` < ?")) {
                ps.setTimestamp(1, ts);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        toRemove.add(rs.getInt("PackageId"));
                    }
                }
            }

            for (Integer pid : toRemove) {
                removePackageFromDB(pid);
            }

            try (PreparedStatement ps = con.prepareStatement("DELETE FROM dueypackages WHERE `TimeStamp` < ?")) {
                ps.setTimestamp(1, ts);
                ps.executeUpdate();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
