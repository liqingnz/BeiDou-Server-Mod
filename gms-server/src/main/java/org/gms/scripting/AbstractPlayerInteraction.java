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
package org.gms.scripting;

import org.gms.client.Character;
import org.gms.client.*;
import org.gms.client.inventory.*;
import org.gms.client.inventory.manipulator.InventoryManipulator;
import org.gms.config.GameConfig;
import org.gms.constants.game.DelayedQuestUpdate;
import org.gms.constants.game.GameConstants;
import org.gms.constants.id.ItemId;
import org.gms.constants.id.MapId;
import org.gms.constants.id.NpcId;
import org.gms.constants.inventory.ItemConstants;
import org.gms.constants.string.ExtendType;
import org.gms.dao.entity.ExtendValueDO;
import org.gms.manager.ServerManager;
import org.gms.model.pojo.SkillEntry;
import org.gms.net.server.Server;
import org.gms.net.server.guild.Guild;
import org.gms.net.server.world.Party;
import org.gms.net.server.world.PartyCharacter;
import org.gms.scripting.event.EventInstanceManager;
import org.gms.scripting.event.EventManager;
import org.gms.scripting.npc.NPCScriptManager;
import org.gms.server.ItemInformationProvider;
import org.gms.service.MessageBoardService;
import org.gms.server.Marriage;
import org.gms.server.TimerManager;
import org.gms.server.expeditions.Expedition;
import org.gms.server.expeditions.ExpeditionBossLog;
import org.gms.server.expeditions.ExpeditionType;
import org.gms.server.life.*;
import org.gms.server.maps.MapObject;
import org.gms.server.maps.MapObjectType;
import org.gms.server.maps.MapleMap;
import org.gms.server.partyquest.PartyQuest;
import org.gms.server.partyquest.Pyramid;
import org.gms.server.quest.Quest;
import org.gms.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.*;
import java.util.List;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import static java.util.concurrent.TimeUnit.DAYS;

public class AbstractPlayerInteraction {

    private static final Logger log = LoggerFactory.getLogger(AbstractPlayerInteraction.class);

    private static final MessageBoardService messageBoardService = ServerManager.getApplicationContext().getBean(MessageBoardService.class);

    /**
     * 进行中的测谎，key 是被测角色id。登记入口只有 putIfAbsent 一处，同一目标同时只能有一场。
     */
    private static final Map<Integer, DetectSession> DETECT_SESSIONS = new ConcurrentHashMap<>();

    /**
     * 距目标上一次发动攻击多久之内才允许发起测谎。超过这个时间说明对方没在刷怪，不构成嫌疑。
     */
    private static final long DETECT_ATTACK_WINDOW_MS = 30_000L;

    public Client c;

    public AbstractPlayerInteraction(Client c) {
        this.c = c;
    }

    public Client getClient() {
        return c;
    }

    public Character getPlayer() {
        return c.getPlayer();
    }

    public Character getChar() {
        return c.getPlayer();
    }

    public int getJobId() {
        return getPlayer().getJob().getId();
    }

    public Job getJob() {
        return getPlayer().getJob();
    }

    public int getLevel() {
        return getPlayer().getLevel();
    }

    public MapleMap getMap() {
        return c.getPlayer().getMap();
    }

    public int getHourOfDay() {
        return Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
    }

    public int getMarketPortalId(int mapId) {
        return getMarketPortalId(getWarpMap(mapId));
    }

    private int getMarketPortalId(MapleMap map) {
        return (map.findMarketPortal() != null) ? map.findMarketPortal().getId() : map.getRandomPlayerSpawnpoint().getId();
    }

    public void warp(int mapid) {
        getPlayer().changeMap(mapid);
    }

    public void warp(int map, int portal) {
        getPlayer().changeMap(map, portal);
    }

    public void warp(int map, String portal) {
        getPlayer().changeMap(map, portal);
    }

    public void warpMap(int map) {
        getPlayer().getMap().warpEveryone(map);
    }

    public void warpParty(int id) {
        warpParty(id, 0);
    }

    public void warpParty(int id, int portalId) {
        int mapid = getMapId();
        warpParty(id, portalId, mapid, mapid);
    }

    public void warpParty(int map, String portalName) {

        int mapid = getMapId();
        var warpMap = c.getChannelServer().getMapFactory().getMap(map);

        var portal = warpMap.getPortal(portalName);

        if (portal == null) {
            portal = warpMap.getPortal(0);
        }

        var portalId = portal.getId();

        warpParty(map, portalId, mapid, mapid);

    }

    public void warpParty(int id, int fromMinId, int fromMaxId) {
        warpParty(id, 0, fromMinId, fromMaxId);
    }

    public void warpParty(int id, int portalId, int fromMinId, int fromMaxId) {
        for (Character mc : this.getPlayer().getPartyMembersOnline()) {
            if (mc.isLoggedInWorld()) {
                if (mc.getMapId() >= fromMinId && mc.getMapId() <= fromMaxId) {
                    mc.changeMap(id, portalId);
                }
            }
        }
    }

    public MapleMap getWarpMap(int map) {
        return getPlayer().getWarpMap(map);
    }

    public MapleMap getMap(int map) {
        return getWarpMap(map);
    }

    public int countAllMonstersOnMap(int map) {
        return getMap(map).countMonsters();
    }

    public int countMonster() {
        return getPlayer().getMap().countMonsters();
    }

    public void resetMapObjects(int mapid) {
        getWarpMap(mapid).resetMapObjects();
    }

    public EventManager getEventManager(String event) {
        return getClient().getEventManager(event);
    }

    public EventInstanceManager getEventInstance() {
        return getPlayer().getEventInstance();
    }

    public Inventory getInventory(int type) {
        return getPlayer().getInventory(InventoryType.getByType((byte) type));
    }

    public Inventory getInventory(InventoryType type) {
        return getPlayer().getInventory(type);
    }

    public boolean hasItem(int itemid) {
        return haveItem(itemid, 1);
    }

    public boolean hasItem(int itemid, int quantity) {
        return haveItem(itemid, quantity);
    }

    public boolean haveItem(int itemid) {
        return haveItem(itemid, 1);
    }

    public boolean haveItem(int itemid, int quantity) {
        return getPlayer().getItemQuantity(itemid, false) >= quantity;
    }

    public int getItemQuantity(int itemid) {
        return getPlayer().getItemQuantity(itemid, false);
    }

    public boolean haveItemWithId(int itemid) {
        return haveItemWithId(itemid, false);
    }

    public boolean haveItemWithId(int itemid, boolean checkEquipped) {
        return getPlayer().haveItemWithId(itemid, checkEquipped);
    }

    public boolean canHold(int itemid) {
        return canHold(itemid, 1);
    }

    public boolean canHold(int itemid, int quantity) {
        return canHoldAll(Collections.singletonList(itemid), Collections.singletonList(quantity), true);
    }

    public boolean canHold(int itemid, int quantity, int removeItemid, int removeQuantity) {
        return canHoldAllAfterRemoving(Collections.singletonList(itemid), Collections.singletonList(quantity), Collections.singletonList(removeItemid), Collections.singletonList(removeQuantity));
    }

    private List<Integer> convertToIntegerList(List<Object> objects) {
        List<Integer> intList = new ArrayList<>();

        for (Object object : objects) {
            intList.add((Integer) object);
        }

        return intList;
    }

    public boolean canHoldAll(List<Object> itemids) {
        List<Object> quantity = new LinkedList<>();

        final int intOne = 1;
        for (int i = 0; i < itemids.size(); i++) {
            quantity.add(intOne);
        }

        return canHoldAll(itemids, quantity);
    }

    public boolean canHoldAll(List<Object> itemids, List<Object> quantity) {
        return canHoldAll(convertToIntegerList(itemids), convertToIntegerList(quantity), true);
    }

    private boolean canHoldAll(List<Integer> itemids, List<Integer> quantity, boolean isInteger) {
        int size = Math.min(itemids.size(), quantity.size());

        List<Pair<Item, InventoryType>> addedItems = new LinkedList<>();
        for (int i = 0; i < size; i++) {
            Item it = new Item(itemids.get(i), (short) 0, quantity.get(i).shortValue());
            addedItems.add(new Pair<>(it, ItemConstants.getInventoryType(itemids.get(i))));
        }

        return Inventory.checkSpots(c.getPlayer(), addedItems);
    }

    private List<Pair<Item, InventoryType>> prepareProofInventoryItems(List<Pair<Integer, Integer>> items) {
        List<Pair<Item, InventoryType>> addedItems = new LinkedList<>();
        for (Pair<Integer, Integer> p : items) {
            Item it = new Item(p.getLeft(), (short) 0, p.getRight().shortValue());
            addedItems.add(new Pair<>(it, InventoryType.CANHOLD));
        }

        return addedItems;
    }

    private List<List<Pair<Integer, Integer>>> prepareInventoryItemList(List<Integer> itemids, List<Integer> quantity) {
        int size = Math.min(itemids.size(), quantity.size());

        List<List<Pair<Integer, Integer>>> invList = new ArrayList<>(6);
        for (int i = InventoryType.UNDEFINED.getType(); i <= InventoryType.CASH.getType(); i++) {
            invList.add(new LinkedList<>());
        }

        for (int i = 0; i < size; i++) {
            int itemid = itemids.get(i);
            invList.get(ItemConstants.getInventoryType(itemid).getType()).add(new Pair<>(itemid, quantity.get(i)));
        }

        return invList;
    }

    public boolean canHoldAllAfterRemoving(List<Integer> toAddItemids, List<Integer> toAddQuantity, List<Integer> toRemoveItemids, List<Integer> toRemoveQuantity) {
        List<List<Pair<Integer, Integer>>> toAddItemList = prepareInventoryItemList(toAddItemids, toAddQuantity);
        List<List<Pair<Integer, Integer>>> toRemoveItemList = prepareInventoryItemList(toRemoveItemids, toRemoveQuantity);

        InventoryProof prfInv = (InventoryProof) this.getInventory(InventoryType.CANHOLD);
        prfInv.lockInventory();
        try {
            for (int i = InventoryType.EQUIP.getType(); i < InventoryType.CASH.getType(); i++) {
                List<Pair<Integer, Integer>> toAdd = toAddItemList.get(i);

                if (!toAdd.isEmpty()) {
                    List<Pair<Integer, Integer>> toRemove = toRemoveItemList.get(i);

                    Inventory inv = this.getInventory(i);
                    prfInv.cloneContents(inv);

                    for (Pair<Integer, Integer> p : toRemove) {
                        InventoryManipulator.removeById(c, InventoryType.CANHOLD, p.getLeft(), p.getRight(), false, false);
                    }

                    List<Pair<Item, InventoryType>> addItems = prepareProofInventoryItems(toAdd);

                    boolean canHold = Inventory.checkSpots(c.getPlayer(), addItems, true);
                    if (!canHold) {
                        return false;
                    }
                }
            }
        } finally {
            prfInv.flushContents();
            prfInv.unlockInventory();
        }

        return true;
    }

    //---- \/ \/ \/ \/ \/ \/ \/  NOT TESTED  \/ \/ \/ \/ \/ \/ \/ \/ \/ ----

    public final QuestStatus getQuestRecord(final int id) {
        return c.getPlayer().getQuestNAdd(Quest.getInstance(id));
    }

    public final QuestStatus getQuestNoRecord(final int id) {
        return c.getPlayer().getQuestNoAdd(Quest.getInstance(id));
    }

    //---- /\ /\ /\ /\ /\ /\ /\  NOT TESTED  /\ /\ /\ /\ /\ /\ /\ /\ /\ ----

    public void openNpc(int npcid) {
        openNpc(npcid, null);
    }

    public void openNpc(int npcid, String script) {
        if (c.getCM() != null) {
            return;
        }

        c.removeClickedNPC();
        NPCScriptManager.getInstance().dispose(c);
        NPCScriptManager.getInstance().start(c, npcid, script, null);
    }

    public int getQuestStatus(int id) {
        return c.getPlayer().getQuest(Quest.getInstance(id)).getStatus().getId();
    }

    private QuestStatus.Status getQuestStat(int id) {
        return c.getPlayer().getQuest(Quest.getInstance(id)).getStatus();
    }

    public boolean isQuestCompleted(int id) {
        try {
            return getQuestStat(id) == QuestStatus.Status.COMPLETED;
        } catch (NullPointerException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean isQuestActive(int id) {
        return isQuestStarted(id);
    }

    public boolean isQuestStarted(int id) {
        try {
            return getQuestStat(id) == QuestStatus.Status.STARTED;
        } catch (NullPointerException e) {
            e.printStackTrace();
            return false;
        }
    }

    public void setQuestProgress(int id, String progress) {
        setQuestProgress(id, 0, progress);
    }

    public void setQuestProgress(int id, int progress) {
        setQuestProgress(id, 0, "" + progress);
    }

    public void setQuestProgress(int id, int infoNumber, int progress) {
        setQuestProgress(id, infoNumber, "" + progress);
    }

    public void setQuestProgress(int id, int infoNumber, String progress) {
        c.getPlayer().setQuestProgress(id, infoNumber, progress);
    }

    public String getQuestProgress(int id) {
        return getQuestProgress(id, 0);
    }

    public String getQuestProgress(int id, int infoNumber) {
        QuestStatus qs = getPlayer().getQuest(Quest.getInstance(id));

        if (qs.getInfoNumber() == infoNumber && infoNumber > 0) {
            qs = getPlayer().getQuest(Quest.getInstance(infoNumber));
            infoNumber = 0;
        }

        if (qs != null) {
            return qs.getProgress(infoNumber);
        } else {
            return "";
        }
    }

    public int getQuestProgressInt(int id) {
        try {
            return Integer.parseInt(getQuestProgress(id));
        } catch (NumberFormatException nfe) {
            return 0;
        }
    }

    public int getQuestProgressInt(int id, int infoNumber) {
        try {
            return Integer.parseInt(getQuestProgress(id, infoNumber));
        } catch (NumberFormatException nfe) {
            return 0;
        }
    }

    public void resetAllQuestProgress(int id) {
        QuestStatus qs = getPlayer().getQuest(Quest.getInstance(id));
        if (qs != null) {
            qs.resetAllProgress();
            getPlayer().announceUpdateQuest(DelayedQuestUpdate.UPDATE, qs, false);
        }
    }

    public void resetQuestProgress(int id, int infoNumber) {
        QuestStatus qs = getPlayer().getQuest(Quest.getInstance(id));
        if (qs != null) {
            qs.resetProgress(infoNumber);
            getPlayer().announceUpdateQuest(DelayedQuestUpdate.UPDATE, qs, false);
        }
    }

    public boolean forceStartQuest(int id) {
        return forceStartQuest(id, NpcId.MAPLE_ADMINISTRATOR);
    }

    public boolean forceStartQuest(int id, int npc) {
        return startQuest(id, npc);
    }

    public boolean forceCompleteQuest(int id) {
        return forceCompleteQuest(id, NpcId.MAPLE_ADMINISTRATOR);
    }

    public boolean forceCompleteQuest(int id, int npc) {
        return completeQuest(id, npc);
    }

    public boolean startQuest(short id) {
        return startQuest((int) id);
    }

    public boolean completeQuest(short id) {
        return completeQuest((int) id);
    }

    public boolean startQuest(int id) {
        return startQuest(id, NpcId.MAPLE_ADMINISTRATOR);
    }

    public boolean completeQuest(int id) {
        return completeQuest(id, NpcId.MAPLE_ADMINISTRATOR);
    }

    public boolean startQuest(short id, int npc) {
        return startQuest((int) id, npc);
    }

    public boolean completeQuest(short id, int npc) {
        return completeQuest((int) id, npc);
    }

    public boolean startQuest(int id, int npc) {
        try {
            return Quest.getInstance(id).forceStart(getPlayer(), npc);
        } catch (NullPointerException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    public boolean completeQuest(int id, int npc) {
        try {
            return Quest.getInstance(id).forceComplete(getPlayer(), npc);
        } catch (NullPointerException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    /**
     * 强制开始任务，起始NPC取任务数据里自己配置的那个。
     * <p>
     * 与 {@link #startQuest(int, int)} 的区别只在于不用调用方指定NPC。脚本重置任务时不必再去
     * 逐个任务查它归哪个NPC管，尤其是重置入口NPC与任务发布NPC不是同一个的场合。
     */
    public boolean startQuestPro(int id) {
        try {
            Quest quest = Quest.getInstance(id);
            return quest.forceStart(getPlayer(), quest.getNpcRequirement(false));
        } catch (NullPointerException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    public Item evolvePet(byte slot, int afterId) {
        Pet evolved = null;
        Pet target;

        long period = DAYS.toMillis(90);    //refreshes expiration date: 90 days


        target = getPlayer().getPet(slot);
        if (target == null) {
            getPlayer().message("Pet could not be evolved...");
            return (null);
        }

        Item tmp = gainItem(afterId, (short) 1, false, true, period, target);
            
            /*
            evolved = Pet.loadFromDb(tmp.getItemId(), tmp.getPosition(), tmp.getPetId());
            
            evolved = tmp.getPet();
            if(evolved == null) {
                getPlayer().message("Pet structure non-existent for " + tmp.getItemId() + "...");
                return(null);
            }
            else if(tmp.getPetId() == -1) {
                getPlayer().message("Pet id -1");
                return(null);
            }
            
            getPlayer().addPet(evolved);
            
            getPlayer().getMap().broadcastMessage(c.getPlayer(), PacketCreator.showPet(c.getPlayer(), evolved, false, false), true);
            c.sendPacket(PacketCreator.petStatUpdate(c.getPlayer()));
            c.sendPacket(PacketCreator.enableActions());
            chr.getClient().getWorldServer().registerPetHunger(chr, chr.getPetIndex(evolved));
            */

        InventoryManipulator.removeFromSlot(c, InventoryType.CASH, target.getPosition(), (short) 1, false);

        return evolved;
    }

    public void gainItem(int id, short quantity) {
        gainItem(id, quantity, false, true);
    }

    public void gainItem(int id, short quantity, boolean show) {//this will fk randomStats equip :P
        gainItem(id, quantity, false, show);
    }

    public void gainItem(int id, boolean show) {
        gainItem(id, (short) 1, false, show);
    }

    public void gainItem(int id) {
        gainItem(id, (short) 1, false, true);
    }

    public Item gainItem(int id, short quantity, boolean randomStats, boolean showMessage) {
        return gainItem(id, quantity, randomStats, showMessage, -1);
    }

    public Item gainItem(int id, short quantity, boolean randomStats, boolean showMessage, long expires) {
        return gainItem(id, quantity, randomStats, showMessage, expires, null);
    }

    public Item gainItem(int id, short quantity, boolean randomStats, boolean showMessage, long expires, Pet from) {
        Item item = null;
        Pet evolved;
        int petId = -1;

        if (quantity >= 0) {
            if (ItemConstants.isPet(id)) {
                petId = Pet.createPet(id);

                if (from != null) {
                    evolved = Pet.loadFromDb(id, (short) 0, petId);

                    Point pos = getPlayer().getPosition();
                    pos.y -= 12;
                    evolved.setPos(pos);
                    evolved.setFh(getPlayer().getMap().getFootholds().findBelow(evolved.getPos()).getId());
                    evolved.setStance(0);
                    evolved.setSummoned(true);

                    evolved.setName(from.getName().compareTo(ItemInformationProvider.getInstance().getName(from.getItemId())) != 0 ? from.getName() : ItemInformationProvider.getInstance().getName(id));
                    evolved.setTameness(from.getTameness());
                    evolved.setFullness(from.getFullness());
                    evolved.setLevel(from.getLevel());
                    evolved.setExpiration(System.currentTimeMillis() + expires);
                    evolved.saveToDb();
                }

                //InventoryManipulator.addById(c, id, (short) 1, null, petId, expires == -1 ? -1 : System.currentTimeMillis() + expires);
            }

            ItemInformationProvider ii = ItemInformationProvider.getInstance();

            if (ItemConstants.getInventoryType(id).equals(InventoryType.EQUIP)) {
                item = ii.getEquipById(id);

                if (item != null) {
                    // isUseCS 是「玩家此刻正处在制作/精炼NPC流程中」的标记，由那些NPC脚本 setCS(true) 打开，
                    // NPCScriptManager.dispose 时复位。下面两条都是制作规则，只在这个流程里生效。
                    if (c.getPlayer().isUseCS()) {
                        Equip it = (Equip) item;

                        // 制作出来的饰品补满 3 个卷孔，与 MakerProcessor.addBoostedMakerItem 的规则一致。
                        // upgradeSlots 取自 wz 的 tuc，<= 0 意味着这件饰品本来就没有卷孔（戒指基本都是）。
                        // 原实现这一条不受 isUseCS 约束，于是任务奖励、活动、扭蛋发出去的饰品也一并补孔，
                        // 结果同一枚戒指怪掉的 0 孔、NPC 给的 3 孔。补孔是制作系统的设定，不该覆盖所有发放路径。
                        if (ItemConstants.isAccessory(it.getItemId()) && it.getUpgradeSlots() <= 0) {
                            it.setUpgradeSlots(3);
                        }

                        if (GameConfig.getServerBoolean("use_enhanced_crafting")) {
                            if (!(c.getPlayer().isGM() && GameConfig.getServerBoolean("use_perfect_gm_scroll"))) {
                                it.setUpgradeSlots((byte) (it.getUpgradeSlots() + 1));
                            }
                            item = ii.scrollEquipWithId(item, ItemId.CHAOS_SCROll_60, true, ItemId.CHAOS_SCROll_60, c.getPlayer().isGM());
                        }
                    }
                }
            } else {
                item = new Item(id, (short) 0, quantity, petId);
            }

            if (expires >= 0) {
                item.setExpiration(System.currentTimeMillis() + expires);
            }

            if (!InventoryManipulator.checkSpace(c, id, quantity, "")) {
                c.getPlayer().dropMessage(1, "您的背包已满，请从" + ItemConstants.getInventoryType(id).name() + "栏移除一件物品。");
                return null;
            }
            if (ItemConstants.getInventoryType(id) == InventoryType.EQUIP) {
                if (randomStats) {
                    InventoryManipulator.addFromDrop(c, ii.randomizeStats((Equip) item), false, petId);
                } else {
                    InventoryManipulator.addFromDrop(c, item, false, petId);
                }
            } else {
                InventoryManipulator.addFromDrop(c, item, false, petId);
            }
        } else {
            InventoryManipulator.removeById(c, ItemConstants.getInventoryType(id), id, -quantity, true, false);
        }
        if (showMessage) {
            c.sendPacket(PacketCreator.getShowItemGain(id, quantity, true));
        }

        return item;
    }

    public void gainFame(int delta) {
        getPlayer().gainFame(delta);
    }

    public void changeMusic(String songName) {
        getPlayer().getMap().broadcastMessage(PacketCreator.musicChange(songName));
    }

    public void playerMessage(int type, String message) {
        c.sendPacket(PacketCreator.serverNotice(type, message));
    }

    public void message(String message) {
        getPlayer().message(message);
    }

    public void dropMessage(int type, String message) {
        getPlayer().dropMessage(type, message);
    }

    public void mapMessage(int type, String message) {
        getPlayer().getMap().broadcastMessage(PacketCreator.serverNotice(type, message));
    }

    public void mapEffect(String path) {
        c.sendPacket(PacketCreator.mapEffect(path));
    }

    public void mapSound(String path) {
        c.sendPacket(PacketCreator.mapSound(path));
    }

    public void displayAranIntro() {
        String intro = switch (c.getPlayer().getMapId()) {
            case MapId.ARAN_TUTO_1 -> "Effect/Direction1.img/aranTutorial/Scene0";
            case MapId.ARAN_TUTO_2 ->
                    "Effect/Direction1.img/aranTutorial/Scene1" + (c.getPlayer().getGender() == 0 ? "0" : "1");
            case MapId.ARAN_TUTO_3 ->
                    "Effect/Direction1.img/aranTutorial/Scene2" + (c.getPlayer().getGender() == 0 ? "0" : "1");
            case MapId.ARAN_TUTO_4 -> "Effect/Direction1.img/aranTutorial/Scene3";
            case MapId.ARAN_POLEARM ->
                    "Effect/Direction1.img/aranTutorial/HandedPoleArm" + (c.getPlayer().getGender() == 0 ? "0" : "1");
            case MapId.ARAN_MAHA -> "Effect/Direction1.img/aranTutorial/Maha";
            default -> "";
        };
        showIntro(intro);
    }

    public void showIntro(String path) {
        c.sendPacket(PacketCreator.showIntro(path));
    }

    public void showInfo(String path) {
        c.sendPacket(PacketCreator.showInfo(path));
        c.sendPacket(PacketCreator.enableActions());
    }

    public void guildMessage(int type, String message) {
        if (getGuild() != null) {
            getGuild().guildMessage(PacketCreator.serverNotice(type, message));
        }
    }

    public Guild getGuild() {
        try {
            return Server.getInstance().getGuild(getPlayer().getGuildId(), getPlayer().getWorld(), null);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public Party getParty() {
        return getPlayer().getParty();
    }

    public boolean isLeader() {
        return isPartyLeader();
    }

    public boolean isGuildLeader() {
        return getPlayer().isGuildLeader();
    }

    public boolean isPartyLeader() {
        if (getParty() == null) {
            return false;
        }

        return getParty().getLeaderId() == getPlayer().getId();
    }

    public boolean isEventLeader() {
        return getEventInstance() != null && getPlayer().getId() == getEventInstance().getLeaderId();
    }

    public void givePartyItems(int id, short quantity, List<Character> party) {
        for (Character chr : party) {
            Client cl = chr.getClient();
            if (quantity >= 0) {
                InventoryManipulator.addById(cl, id, quantity);
            } else {
                InventoryManipulator.removeById(cl, ItemConstants.getInventoryType(id), id, -quantity, true, false);
            }
            cl.sendPacket(PacketCreator.getShowItemGain(id, quantity, true));
        }
    }

    public void removeHPQItems() {
        int[] items = {ItemId.GREEN_PRIMROSE_SEED, ItemId.PURPLE_PRIMROSE_SEED, ItemId.PINK_PRIMROSE_SEED,
                ItemId.BROWN_PRIMROSE_SEED, ItemId.YELLOW_PRIMROSE_SEED, ItemId.BLUE_PRIMROSE_SEED};
        for (int item : items) {
            removePartyItems(item);
        }
    }

    public void removePartyItems(int id) {
        if (getParty() == null) {
            removeAll(id);
            return;
        }
        for (PartyCharacter mpc : getParty().getMembers()) {
            if (mpc == null || !mpc.isOnline()) {
                continue;
            }

            Character chr = mpc.getPlayer();
            if (chr != null && chr.getClient() != null) {
                removeAll(id, chr.getClient());
            }
        }
    }

    public void giveCharacterExp(int amount, Character chr) {
        chr.gainExp(NumberTool.floatToInt(amount * chr.getExpRate()), true, true);
    }

    public void givePartyExp(int amount, List<Character> party) {
        for (Character chr : party) {
            giveCharacterExp(amount, chr);
        }
    }

    public void givePartyExp(String PQ) {
        givePartyExp(PQ, true);
    }

    public void givePartyExp(String PQ, boolean instance) {
        //1 player  =  +0% bonus (100)
        //2 players =  +0% bonus (100)
        //3 players =  +0% bonus (100)
        //4 players = +10% bonus (110)
        //5 players = +20% bonus (120)
        //6 players = +30% bonus (130)
        Party party = getPlayer().getParty();
        int size = party.getMembers().size();

        if (instance) {
            for (PartyCharacter member : party.getMembers()) {
                if (member == null || !member.isOnline()) {
                    size--;
                } else {
                    Character chr = member.getPlayer();
                    if (chr != null && chr.getEventInstance() == null) {
                        size--;
                    }
                }
            }
        }

        int bonus = size < 4 ? 100 : 70 + (size * 10);
        for (PartyCharacter member : party.getMembers()) {
            if (member == null || !member.isOnline()) {
                continue;
            }
            Character player = member.getPlayer();
            if (player == null) {
                continue;
            }
            if (instance && player.getEventInstance() == null) {
                continue; // They aren't in the instance, don't give EXP.
            }
            int base = PartyQuest.getExp(PQ, player.getLevel());
            int exp = base * bonus / 100;
            if (GameConfig.getServerFloat("pq_bonus_exp_rate") > 0) {
                player.gainExp((int) (exp * GameConfig.getServerFloat("pq_bonus_exp_rate")), true, true);
            } else {
                player.gainExp(exp, true, true);
            }
        }
    }

    public void removeFromParty(int id, List<Character> party) {
        for (Character chr : party) {
            InventoryType type = ItemConstants.getInventoryType(id);
            Inventory iv = chr.getInventory(type);
            int possesed = iv.countById(id);
            if (possesed > 0) {
                InventoryManipulator.removeById(c, ItemConstants.getInventoryType(id), id, possesed, true, false);
                chr.sendPacket(PacketCreator.getShowItemGain(id, (short) -possesed, true));
            }
        }
    }

    public void removeAll(int id) {
        removeAll(id, c);
    }

    public void removeAll(int id, Client cl) {
        InventoryType invType = ItemConstants.getInventoryType(id);
        int possessed = cl.getPlayer().getInventory(invType).countById(id);
        if (possessed > 0) {
            InventoryManipulator.removeById(cl, ItemConstants.getInventoryType(id), id, possessed, true, false);
            cl.sendPacket(PacketCreator.getShowItemGain(id, (short) -possessed, true));
        }

        if (invType == InventoryType.EQUIP) {
            if (cl.getPlayer().getInventory(InventoryType.EQUIPPED).countById(id) > 0) {
                InventoryManipulator.removeById(cl, InventoryType.EQUIPPED, id, 1, true, false);
                cl.sendPacket(PacketCreator.getShowItemGain(id, (short) -1, true));
            }
        }
    }

    public void removeAllByInventory(int invType) {
        Inventory inv = getInventory(invType);
        for (Item item : new ArrayList<>(inv.list())) {
            InventoryManipulator.removeFromSlot(c, inv.getType(), item.getPosition(), item.getQuantity(), false);
        }
    }

    public void removeAllByInventorySlot(int invType, short slot) {
        Inventory inv = getInventory(invType);
        Item item = inv.getItem(slot);
        if (item != null) {
            InventoryManipulator.removeFromSlot(c, inv.getType(), item.getPosition(), item.getQuantity(), false);
        }
    }

    public int getMapId() {
        return c.getPlayer().getMap().getId();
    }

    public int getPlayerCount(int mapid) {
        return c.getChannelServer().getMapFactory().getMap(mapid).getCharacters().size();
    }

    public void showInstruction(String msg, int width, int height) {
        c.sendPacket(PacketCreator.sendHint(msg, width, height));
        c.sendPacket(PacketCreator.enableActions());
    }

    public void disableMinimap() {
        c.sendPacket(PacketCreator.disableMinimap());
    }

    public boolean isAllReactorState(final int reactorId, final int state) {
        return c.getPlayer().getMap().isAllReactorState(reactorId, state);
    }

    public void resetMap(int mapid) {
        getMap(mapid).resetReactors();
        getMap(mapid).killAllMonsters();
        for (MapObject i : getMap(mapid).getMapObjectsInRange(c.getPlayer().getPosition(), Double.POSITIVE_INFINITY, Arrays.asList(MapObjectType.ITEM))) {
            getMap(mapid).removeMapObject(i);
            getMap(mapid).broadcastMessage(PacketCreator.removeItemFromMap(i.getObjectId(), 0, c.getPlayer().getId()));
        }
    }

    public void useItem(int id) {
        ItemInformationProvider.getInstance().getItemEffect(id).applyTo(c.getPlayer());
        c.sendPacket(PacketCreator.getItemMessage(id));//Useful shet :3
    }

    public void cancelItem(final int id) {
        getPlayer().cancelEffect(ItemInformationProvider.getInstance().getItemEffect(id), false, -1);
    }

    public void teachSkill(int skillid, byte level, byte masterLevel, long expiration) {
        teachSkill(skillid, level, masterLevel, expiration, false);
    }

    public void teachSkill(int skillid, byte level, byte masterLevel, long expiration, boolean force) {
        Skill skill = SkillFactory.getSkill(skillid);
        SkillEntry skillEntry = getPlayer().getSkills().get(skill);
        if (skillEntry != null) {
            if (!force && level > -1) {
                getPlayer().changeSkillLevel(skill, (byte) Math.max(skillEntry.skillLevel, level), Math.max(skillEntry.masterLevel, masterLevel), expiration == -1 ? -1 : Math.max(skillEntry.expiration, expiration));
                return;
            }
        } else if (GameConstants.isAranSkills(skillid)) {
            c.sendPacket(PacketCreator.showInfo("Effect/BasicEff.img/AranGetSkill"));
        }

        getPlayer().changeSkillLevel(skill, level, masterLevel, expiration);
    }

    public void removeEquipFromSlot(short slot) {
        Item tempItem = c.getPlayer().getInventory(InventoryType.EQUIPPED).getItem(slot);
        InventoryManipulator.removeFromSlot(c, InventoryType.EQUIPPED, slot, tempItem.getQuantity(), false, false);
    }

    public void gainAndEquip(int itemid, short slot) {
        final Item old = c.getPlayer().getInventory(InventoryType.EQUIPPED).getItem(slot);
        if (old != null) {
            InventoryManipulator.removeFromSlot(c, InventoryType.EQUIPPED, slot, old.getQuantity(), false, false);
        }
        final Item newItem = ItemInformationProvider.getInstance().getEquipById(itemid);
        newItem.setPosition(slot);
        c.getPlayer().getInventory(InventoryType.EQUIPPED).addItemFromDB(newItem);
        c.sendPacket(PacketCreator.modifyInventory(false, Collections.singletonList(new ModifyInventory(0, newItem))));
    }

    public void spawnNpc(int npcId, Point pos, MapleMap map) {
        NPC npc = LifeFactory.getNPC(npcId);
        if (npc != null) {
            npc.setPosition(pos);
            npc.setCy(pos.y);
            npc.setRx0(pos.x + 50);
            npc.setRx1(pos.x - 50);
            npc.setFh(map.getFootholds().findBelow(pos).getId());
            map.addMapObject(npc);
            map.broadcastMessage(PacketCreator.spawnNPC(npc));
        }
    }

    public void spawnMonster(int id, int x, int y) {
        Monster monster = LifeFactory.getMonster(id);
        monster.setPosition(new Point(x, y));
        getPlayer().getMap().spawnMonster(monster);
    }

    public Monster getMonsterLifeFactory(int mid) {
        return LifeFactory.getMonster(mid);
    }

    public void spawnGuide() {
        c.sendPacket(PacketCreator.spawnGuide(true));
    }

    public void removeGuide() {
        c.sendPacket(PacketCreator.spawnGuide(false));
    }

    public void displayGuide(int num) {
        c.sendPacket(PacketCreator.showInfo("UI/tutorial.img/" + num));
    }

    public void goDojoUp() {
        c.sendPacket(PacketCreator.dojoWarpUp());
    }

    public void resetDojoEnergy() {
        c.getPlayer().setDojoEnergy(0);
    }

    public void resetPartyDojoEnergy() {
        for (Character pchr : c.getPlayer().getPartyMembersOnSameMap()) {
            pchr.setDojoEnergy(0);
        }
    }

    public void enableActions() {
        c.sendPacket(PacketCreator.enableActions());
    }

    public void showEffect(String effect) {
        c.sendPacket(PacketCreator.showEffect(effect));
    }

    public void dojoEnergy() {
        c.sendPacket(PacketCreator.getEnergy("energy", getPlayer().getDojoEnergy()));
    }

    public void talkGuide(String message) {
        c.sendPacket(PacketCreator.talkGuide(message));
    }

    public void guideHint(int hint) {
        c.sendPacket(PacketCreator.guideHint(hint));
    }

    public void updateAreaInfo(Short area, String info) {
        c.getPlayer().updateAreaInfo(area, info);
        c.sendPacket(PacketCreator.enableActions());//idk, nexon does the same :P
    }

    public boolean containsAreaInfo(short area, String info) {
        return c.getPlayer().containsAreaInfo(area, info);
    }

    public void earnTitle(String msg) {
        c.sendPacket(PacketCreator.earnTitleMessage(msg));
    }

    public void showInfoText(String msg) {
        c.sendPacket(PacketCreator.showInfoText(msg));
    }

    public void openUI(byte ui) {
        c.sendPacket(PacketCreator.openUI(ui));
    }

    public void lockUI() {
        c.sendPacket(PacketCreator.disableUI(true));
        c.sendPacket(PacketCreator.lockUI(true));
    }

    public void unlockUI() {
        c.sendPacket(PacketCreator.disableUI(false));
        c.sendPacket(PacketCreator.lockUI(false));
    }

    public void playSound(String sound) {
        getPlayer().getMap().broadcastMessage(PacketCreator.environmentChange(sound, 4));
    }

    public void environmentChange(String env, int mode) {
        getPlayer().getMap().broadcastMessage(PacketCreator.environmentChange(env, mode));
    }

    public String numberWithCommas(int number) {
        return GameConstants.numberWithCommas(number);
    }

    public Pyramid getPyramid() {
        return (Pyramid) getPlayer().getPartyQuest();
    }

    public int createExpedition(ExpeditionType type) {
        return createExpedition(type, false, 0, 0);
    }

    /**
     * 用远征类型自带的人数上下限创建远征，只指定是否静默。
     * <p>
     * 传 0 会走 {@link Expedition} 里「取该类型默认值」的分支，与 {@link #createExpedition(ExpeditionType)} 一致。
     */
    public int createExpedition(ExpeditionType type, boolean silent) {
        return createExpedition(type, silent, 0, 0);
    }

    public int createExpedition(ExpeditionType type, boolean silent, int minPlayers, int maxPlayers) {
        Character player = getPlayer();
        Expedition exped = new Expedition(player, type, silent, minPlayers, maxPlayers);

        int channel = player.getMap().getChannelServer().getId();
        if (!ExpeditionBossLog.attemptBoss(player.getId(), channel, exped, false)) {    // thanks Conrad for noticing missing expeditions entry limit
            return 1;
        }

        if (exped.addChannelExpedition(player.getClient().getChannelServer())) {
            return 0;
        } else {
            return -1;
        }
    }

    public void endExpedition(Expedition exped) {
        exped.dispose(true);
        exped.removeChannelExpedition(getPlayer().getClient().getChannelServer());
    }

    public Expedition getExpedition(ExpeditionType type) {
        return getPlayer().getClient().getChannelServer().getExpedition(type);
    }

    public String getExpeditionMemberNames(ExpeditionType type) {
        String members = "";
        Expedition exped = getExpedition(type);
        for (String memberName : exped.getMembers().values()) {
            members += "" + memberName + ", ";
        }
        return members;
    }

    public boolean isLeaderExpedition(ExpeditionType type) {
        Expedition exped = getExpedition(type);
        return exped.isLeader(getPlayer());
    }

    public long getJailTimeLeft() {
        return getPlayer().getJailExpirationTimeLeft();
    }

    public List<Pet> getDriedPets() {
        List<Pet> list = new LinkedList<>();

        long curTime = System.currentTimeMillis();
        for (Item it : getPlayer().getInventory(InventoryType.CASH).list()) {
            if (ItemConstants.isPet(it.getItemId()) && it.getExpiration() < curTime) {
                Pet pet = it.getPet();
                if (pet != null) {
                    list.add(pet);
                }
            }
        }

        return list;
    }

    public List<Item> getUnclaimedMarriageGifts() {
        return Marriage.loadGiftItemsFromDb(this.getClient(), this.getPlayer().getId());
    }

    public boolean startDungeonInstance(int dungeonid) {
        return c.getChannelServer().addMiniDungeon(dungeonid);
    }

    public boolean canGetFirstJob(int jobType) {
        if (GameConfig.getServerBoolean("use_auto_assign_starters_ap")) {
            return true;
        }

        Character chr = this.getPlayer();

        switch (jobType) {
            case 1:
                return chr.getStr() >= 35;

            case 2:
                return chr.getInt() >= 20;

            case 3:
            case 4:
                return chr.getDex() >= 25;

            case 5:
                return chr.getDex() >= 20;

            default:
                return true;
        }
    }

    public String getFirstJobStatRequirement(int jobType) {
        switch (jobType) {
            case 1:
                return "力量 " + 35;

            case 2:
                return "智力 " + 20;

            case 3:
            case 4:
                return "敏捷 " + 25;

            case 5:
                return "敏捷 " + 20;
        }

        return null;
    }

    public void npcTalk(int npcid, String message) {
        c.sendPacket(PacketCreator.getNPCTalk(npcid, (byte) 0, message, "00 00", (byte) 0));
    }

    public long getCurrentTime() {
        return Server.getInstance().getCurrentTime();
    }

    public void weakenAreaBoss(int monsterId, String message) {
        MapleMap map = c.getPlayer().getMap();
        Monster monster = map.getMonsterById(monsterId);
        if (monster == null) {
            return;
        }

        applySealSkill(monster);
        applyReduceAvoid(monster);
        sendBlueNotice(map, message);
    }

    private void applySealSkill(Monster monster) {
        MobSkill sealSkill = MobSkillFactory.getMobSkillOrThrow(MobSkillType.SEAL_SKILL, 1);
        sealSkill.applyEffect(monster);
    }

    private void applyReduceAvoid(Monster monster) {
        MobSkill reduceAvoidSkill = MobSkillFactory.getMobSkillOrThrow(MobSkillType.EVA, 2);
        reduceAvoidSkill.applyEffect(monster);
    }

    private void sendBlueNotice(MapleMap map, String message) {
        map.dropMessage(6, message);
    }

    /**
     * 判断是否是可回收的卷轴。
     * <p>
     * 卷轴的物品id段是 2040000 ~ 2049999。
     *
     * @param item           待判定的物品
     * @param excludePerfect 是否把成功率100%的卷轴排除在外（这类卷轴回收没有意义）
     */
    public boolean isRecyclableScroll(Item item, boolean excludePerfect) {
        if (item == null) {
            return false;
        }
        int itemId = item.getItemId();
        if (itemId < ItemId.SCROLL_RANGE_START || itemId >= ItemId.SCROLL_RANGE_END) {
            return false;
        }
        if (excludePerfect) {
            // 原实现直接对 getEquipStats(...).get("success") 拆箱比较，而 getEquipStats 在
            // 物品数据缺失时会返回 null，成功率字段也可能不存在，这里两处都要兜住
            Map<String, Integer> stats = ItemInformationProvider.getInstance().getEquipStats(itemId);
            if (stats == null) {
                return false;
            }
            Integer success = stats.get("success");
            return success == null || success != 100;
        }
        return true;
    }

    /**
     * 测谎：给目标弹一道限时算术题，答不上来就按挂机脚本处理（关监狱并罚没点券）。
     * <p>
     * 移植自 LichKingMod 的同名方法。整套机制默认关闭，由 {@code use_player_detect} 控制——
     * 它允许普通玩家花点券去处罚另一个玩家，是一条现成的骚扰渠道（比如专挑对方打BOSS时发起），
     * 开之前请先想清楚运营上是否接受。开关关闭时仍可由GM发起，GM本来就不花钱也不受这条限制。
     * <p>
     * 相对原实现的改动：
     * <ul>
     *   <li>目标为空时原实现只发了条消息没有 return，下一句就对 null 调 getLastAttack() 直接崩</li>
     *   <li>补三条前置校验：不能测自己（否则把自己关进监狱）、不能测GM（与 {@code JailCommand} 一致）、
     *       目标正在与NPC对话时不发起</li>
     *   <li>目标掉线时原实现直接写 accounts 表扣点券。这里不跟：掉线角色的点券还在内存的
     *       CashShop 对象里，登出保存与这条 UPDATE 谁后写谁生效，时序不可控，
     *       轻则罚款丢失，重则把登出时保存的其它点券改动一起冲掉。改为不处罚并退还发起方</li>
     *   <li>原实现有一句 {@code dropMessage("player nx: " + victimNX)}，把别人的点券余额播给发起方，删掉</li>
     *   <li>成本、赏金、监禁时长、答题时限全部改成 {@code game_config} 项，不再硬编码</li>
     * </ul>
     * <p>
     * <b>判罚与答对的竞争不靠取消定时任务，靠 {@link DetectSession#settled} 这个 CAS。</b>
     * {@code ScheduledFuture.cancel(false)} 拦不住已经开跑的结算，答题包与倒计时同时到达时，
     * 玩家会看到「通过」而结算线程照样扣券关监狱。现在两条路径都要先抢到 {@code settled}，
     * 抢输的一方直接退出，取消 future 只是省一次无谓唤醒。
     */
    public void detectPlayer(Character victim) {
        Character player = getPlayer();
        boolean freeOfCharge = player.gmLevel() >= 2;

        if (!freeOfCharge && !GameConfig.getServerBoolean("use_player_detect")) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message1"));
            return;
        }
        if (victim == null || !victim.isLoggedInWorld()) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message2"));
            return;
        }
        if (victim.getId() == player.getId()) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message3"));
            return;
        }
        // GM 一律不可被测。只挡「自己」是不够的：开了 use_player_detect 之后普通玩家能对正在打怪的GM
        // 发起检测并罚走其点券，低权限GM也能处罚高权限GM。JailCommand 同样直接拒绝 victim.isGM()。
        if (victim.isGM()) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message13"));
            return;
        }

        // 构成「挂机刷怪」嫌疑的两个条件：目标近期发动过攻击，且所在地图确实有怪
        if (Server.getInstance().getCurrentTime() - victim.getLastAttack() > DETECT_ATTACK_WINDOW_MS) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message4"));
            return;
        }
        MapleMap victimMap = victim.getMap();
        if (victimMap == null || victimMap.getMapObjectsInRange(victim.getPosition(), Double.POSITIVE_INFINITY,
                Collections.singletonList(MapObjectType.MONSTER)).isEmpty()) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message5"));
            return;
        }

        int cost = GameConfig.getServerInt("detect_cost_nx");
        if (!freeOfCharge && player.getCashShop().getCash(1) < cost) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message7", cost));
            return;
        }

        final int victimId = victim.getId();
        final String victimName = victim.getName();

        // 抢占目标：putIfAbsent 是唯一的登记入口，两人同时对同一目标发起时只有一个能进
        DetectSession session = new DetectSession(player, freeOfCharge, cost);
        if (DETECT_SESSIONS.putIfAbsent(victimId, session) != null) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message8"));
            return;
        }

        long answerMs = GameConfig.getServerInt("detect_answer_seconds") * 1000L;
        session.verdict = TimerManager.getInstance().schedule(() -> settleDetection(victimId, victimName), answerMs);

        // 题必须确认真的弹出去了，才收费、才让判罚生效。openNpc 遇到目标已有会话是静默返回的，
        // 前面那道 getCM() 预检与这里之间目标随时可能自己点开别的NPC，脚本加载失败也是同样结果——
        // 这些情况下目标压根没看到题，不能扣他券关他监狱。
        if (!openDetectionPrompt(victim)) {
            abortDetection(victimId, session);
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message6"));
            return;
        }

        if (!freeOfCharge) {
            player.getCashShop().gainCash(1, -cost);
        }
        player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message10", victimName));
    }

    /**
     * 给目标弹出测谎答题框，返回题是否真的弹出去了。
     * <p>
     * {@link #openNpc(int, String)} 在目标已有会话时静默返回 void，调用方无从判断，所以这里另起一份。
     * 开头那道 {@code getCM()} 也不能省：{@link NPCScriptManager#start} 自己会把已存在的会话
     * {@code dispose} 掉再开新的，等于把目标正在进行的对话顶掉。
     * <p>
     * 判定成功与否<b>不能只看 {@code start} 的返回值</b>。它有三条出口：脚本加载不到返回 false；
     * 正常开起来返回 true；而目标处在 500 毫秒点击NPC冷却里（{@code canClickNPC()} 为假）时，
     * 它只补发一个 {@code enableActions} 就 <b>照样返回 true</b>，对话框根本没弹。
     * 可靠的事后判据是会话有没有真的登记进去——只有成功那条分支才会 {@code cms.put}。
     */
    private static boolean openDetectionPrompt(Character victim) {
        Client victimClient = victim.getClient();
        if (victimClient.getCM() != null) {
            return false;
        }
        victimClient.removeClickedNPC();
        NPCScriptManager.getInstance().dispose(victimClient);
        return NPCScriptManager.getInstance().start(victimClient, NpcId.BEI_DOU_NPC_BASE, "detected", null)
                && victimClient.getCM() != null;
    }

    /**
     * 目标答对了。由 detected.js 在验证答案之后调用，返回是否赶在判罚之前。
     * <p>
     * 返回 false 有两种情况：本来就没在被检测，或者判罚已经先一步抢到了 {@code settled}——
     * 后者意味着玩家答对了但超时，处罚照旧，脚本不能显示「通过」。
     */
    public boolean passDetection() {
        Character chr = getPlayer();
        DetectSession session = DETECT_SESSIONS.get(chr.getId());
        if (session == null || !session.settled.compareAndSet(false, true)) {
            return false;
        }
        DETECT_SESSIONS.remove(chr.getId(), session);
        cancelVerdict(session);

        if (session.initiator.isLoggedInWorld()) {
            session.initiator.dropMessage(6,
                    I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message9", chr.getName()));
        }
        return true;
    }

    /**
     * 题没能弹出去时撤销整场检测：占住 settled 让倒计时到点后直接退出，再把登记撤掉。
     * 此时还没收费，所以没有退款动作。
     */
    private static void abortDetection(int victimId, DetectSession session) {
        session.settled.set(true);
        DETECT_SESSIONS.remove(victimId, session);
        cancelVerdict(session);
    }

    private static void cancelVerdict(DetectSession session) {
        ScheduledFuture<?> verdict = session.verdict;
        if (verdict != null) {
            verdict.cancel(false);   // 只为省一次无谓唤醒，判定本身由 settled 决定
        }
    }

    /**
     * 测谎倒计时结束后的结算。抢不到 {@code settled} 说明目标已经答对了，直接退出。
     */
    private static void settleDetection(int victimId, String victimName) {
        DetectSession session = DETECT_SESSIONS.get(victimId);
        if (session == null || !session.settled.compareAndSet(false, true)) {
            return;
        }
        DETECT_SESSIONS.remove(victimId, session);

        // 发起方自己也可能在这十几秒里下线。判罚照做，但退款与赏金不再发放——
        // 往一个已登出的 CashShop 对象里记账没人会保存，钱等于凭空消失，还不如不动。
        Character player = session.initiator;
        boolean initiatorPresent = player.isLoggedInWorld();

        Character victim = player.getWorldServer().getPlayerStorage().getCharacterById(victimId);
        if (victim == null || !victim.isLoggedInWorld()) {
            // 目标在倒计时里掉线了，不处罚，退还发起方的花费，理由见 detectPlayer 的注释
            if (initiatorPresent) {
                if (!session.freeOfCharge) {
                    player.getCashShop().gainCash(1, session.cost);
                }
                player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message11", victimName));
            }
            return;
        }

        NPCScriptManager.getInstance().dispose(victim.getClient());

        int reward = 0;
        if (initiatorPresent) {
            reward = Math.min(GameConfig.getServerInt("detect_reward_nx"), victim.getCashShop().getCash(1));
            if (reward > 0) {
                victim.getCashShop().gainCash(1, -reward);
                player.getCashShop().gainCash(1, reward);
            }
        }

        long jailMs = GameConfig.getServerInt("detect_jail_minutes") * 60L * 1000L;
        victim.addJailExpirationTime(jailMs);
        if (victim.getMapId() != MapId.JAIL) {   // 已经在监狱里的不用再搬一次，出狱时会按存档位置放回去
            // 只写 JAIL 这一个存档位。saveLocationOnWarp 会把当前地图灌进 savedLocations 的每一个
            // 空槽，连带占掉自由市场、活动、副本的返回点，而出狱脚本只读 JAIL。JailCommand 也是这么写的。
            victim.saveLocation("JAIL");
            victim.changeMap(victim.getClient().getChannelServer().getMapFactory().getMap(MapId.JAIL));
        }
        if (initiatorPresent) {
            player.dropMessage(6, I18nUtil.getMessage("AbstractPlayerInteraction.detectPlayer.message12", victimName, reward));
        }
    }

    /**
     * 一次测谎的运行时状态，按被测角色id登记在 {@link #DETECT_SESSIONS} 里。
     * <p>
     * {@code settled} 是判罚与答对之间唯一的裁决点，两边都要 CAS 成功才能继续往下做。
     * 持有发起方的 {@code Character} 引用是可接受的：这是一次性任务，最长只活到答题时限结束。
     */
    private static final class DetectSession {
        private final AtomicBoolean settled = new AtomicBoolean(false);
        private final Character initiator;
        private final boolean freeOfCharge;
        private final int cost;
        private volatile ScheduledFuture<?> verdict;

        private DetectSession(Character initiator, boolean freeOfCharge, int cost) {
            this.initiator = initiator;
            this.freeOfCharge = freeOfCharge;
            this.cost = cost;
        }
    }

/////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取角色扩展表某字段的值
     *
     * @param extendName 扩展字段名
     * @return 扩展字段值
     */
    public String getCharacterExtendValue(String extendName) {
        ExtendValueDO extendValueDO = ExtendUtil.getExtendValue(String.valueOf(getPlayer().getId()), ExtendType.CHARACTER_EXTEND.getType(), extendName);
        return extendValueDO == null ? null : extendValueDO.getExtendValue();
    }

    /**
     * 获取每日/每周角色扩展表某字段的值
     *
     * @param extendName 扩展字段名
     * @param isDaily    是否是每日，否则为每周
     * @return 扩展字段值
     */
    public String getCharacterExtendValue(String extendName, boolean isDaily) {
        ExtendValueDO extendValueDO = ExtendUtil.getExtendValue(String.valueOf(getPlayer().getId()),
                isDaily ? ExtendType.CHARACTER_EXTEND_DAILY.getType() : ExtendType.CHARACTER_EXTEND_WEEKLY.getType(),
                extendName);
        return extendValueDO == null ? null : extendValueDO.getExtendValue();
    }

    /**
     * 获取账号扩展表某字段的值
     *
     * @param extendName 扩展字段名
     * @return 扩展字段值
     */
    public String getAccountExtendValue(String extendName) {
        ExtendValueDO extendValueDO = ExtendUtil.getExtendValue(String.valueOf(getPlayer().getAccountId()), ExtendType.ACCOUNT_EXTEND.getType(), extendName);
        return extendValueDO == null ? null : extendValueDO.getExtendValue();
    }

    /**
     * 获取每日/每周账号扩展表某字段的值
     *
     * @param extendName 扩展字段名
     * @param isDaily    是否是每日，否则为每周
     * @return 扩展字段值
     */
    public String getAccountExtendValue(String extendName, boolean isDaily) {
        ExtendValueDO extendValueDO = ExtendUtil.getExtendValue(String.valueOf(getPlayer().getAccountId()),
                isDaily ? ExtendType.ACCOUNT_EXTEND_DAILY.getType() : ExtendType.ACCOUNT_EXTEND_WEEKLY.getType(),
                extendName);
        return extendValueDO == null ? null : extendValueDO.getExtendValue();
    }
///////////////////////////////////////////////////////////////////////////////////////////////////

    /***
     * 永久保存或者更新角色扩展表指定的值
     * @param extendName
     * @param extendValue
     */
    public void saveOrUpdateCharacterExtendValue(String extendName, String extendValue) {
        ExtendUtil.saveOrUpdateExtendValue(String.valueOf(getPlayer().getId()), ExtendType.CHARACTER_EXTEND.getType(), extendName, extendValue);
    }

    /***
     * 保存每日/每周账号扩展表某字段的值
     * @param extendName
     * @param extendValue
     * @param isDaily 是否为每日刷新，否则为周刷新
     */
    public void saveOrUpdateCharacterExtendValue(String extendName, String extendValue, boolean isDaily) {
        ExtendUtil.saveOrUpdateExtendValue(String.valueOf(getPlayer().getId()), isDaily ? ExtendType.CHARACTER_EXTEND_DAILY.getType() : ExtendType.CHARACTER_EXTEND_WEEKLY.getType(),
                extendName, extendValue);
    }

    public void saveOrUpdateAccountExtendValue(String extendName, String extendValue) {
        ExtendUtil.saveOrUpdateExtendValue(String.valueOf(getPlayer().getAccountId()), ExtendType.ACCOUNT_EXTEND.getType(), extendName, extendValue);
    }

    public void saveOrUpdateAccountExtendValue(String extendName, String extendValue, boolean isDaily) {
        ExtendUtil.saveOrUpdateExtendValue(String.valueOf(getPlayer().getAccountId()), isDaily ? ExtendType.ACCOUNT_EXTEND_DAILY.getType() : ExtendType.ACCOUNT_EXTEND_WEEKLY.getType(),
                extendName, extendValue);
    }

    public void gainEquip(Equip equip) {
        if (!InventoryManipulator.checkSpace(getClient(), equip.getItemId(), 1, equip.getOwner())) {
            message(I18nUtil.getMessage("AbstractPlayerInteraction.gainEquip.message2", InventoryType.EQUIP.getName()));
        }
        InventoryManipulator.addFromDrop(getClient(), equip, false);
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////
    /***
     * 获取账户在线时间
     * @return 返回当前账户角色在线时间，单位分钟
     */
    public int getOnlineTime()
    {
        return getPlayer().getCurrentOnlineTime();
    }

    /**
     * 全服留言板的展示文本，最新的在最上面。
     */
    public String getMessageBoard() {
        return messageBoardService.getMessages();
    }

    /**
     * 往全服留言板写一条留言。
     *
     * @return 写入成功才返回 true。<b>脚本必须按返回值决定扣不扣钱</b>——内容超长或入库失败都会返回 false。
     */
    public boolean addMessageBoardEntry(String message) {
        return messageBoardService.addMessage(getPlayer(), message);
    }





}