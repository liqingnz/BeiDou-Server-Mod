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
package org.gms.server.gachapon;

import lombok.Getter;
import org.gms.client.Character;
import org.gms.constants.id.NpcId;
import org.gms.util.I18nUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.gms.server.ItemInformationProvider;
import org.gms.util.Randomizer;

import java.util.Arrays;

/**
 * @author Alan (SharpAceX)
 */
public class Gachapon {
    private static final Logger log = LoggerFactory.getLogger(Gachapon.class);
    private static final Gachapon instance = new Gachapon();

    public static Gachapon getInstance() {
        return instance;
    }

    public enum GachaponType {

        GLOBAL(-1, -1, -1, -1, null, new Global()),
        HENESYS(NpcId.GACHAPON_HENESYS, 90, 8, 2, "GachaCommand.message2", new Henesys()),
        ELLINIA(NpcId.GACHAPON_ELLINIA, 90, 8, 2, "GachaCommand.message3", new Ellinia()),
        PERION(NpcId.GACHAPON_PERION, 90, 8, 2, "GachaCommand.message4", new Perion()),
        KERNING_CITY(NpcId.GACHAPON_KERNING, 90, 8, 2, "GachaCommand.message5", new KerningCity()),
        SLEEPYWOOD(NpcId.GACHAPON_SLEEPYWOOD, 90, 8, 2, "GachaCommand.message6", new Sleepywood()),
        MUSHROOM_SHRINE(NpcId.GACHAPON_MUSHROOM_SHRINE, 90, 8, 2, "GachaCommand.message7", new MushroomShrine()),
        SHOWA_SPA_MALE(NpcId.GACHAPON_SHOWA_MALE, 90, 8, 2, "GachaCommand.message8", new ShowaSpaMale()),
        SHOWA_SPA_FEMALE(NpcId.GACHAPON_SHOWA_FEMALE, 90, 8, 2, "GachaCommand.message9", new ShowaSpaFemale()),
        LUDIBRIUM(NpcId.GACHAPON_LUDIBRIUM, 90, 8, 2, "GachaCommand.message15", new Ludibrium()),
        NEW_LEAF_CITY(NpcId.GACHAPON_NLC, 90, 8, 2, "GachaCommand.message10", new NewLeafCity()),
        EL_NATH(NpcId.GACHAPON_EL_NATH, 90, 8, 2, "GachaCommand.message16", new ElNath()),
        LEAFRE(NpcId.GACHAPON_LEAFRE, 90, 8, 2, "GachaCommand.message17", new Leafre()),
        NAUTILUS_HARBOR(NpcId.GACHAPON_NAUTILUS, 90, 8, 2, "GachaCommand.message11", new NautilusHarbor());

        private static final GachaponType[] values = GachaponType.values();

        private final GachaponItems gachapon;
        @Getter
        private final int npcId;
        private final int common;
        private final int uncommon;
        private final int rare;
        /** i18n 键；GLOBAL 是兜底奖池、不对应任何扭蛋机，为 null */
        private final String nameKey;

        GachaponType(int npcid, int c, int u, int r, String nameKey, GachaponItems g) {
            this.npcId = npcid;
            this.gachapon = g;
            this.common = c;
            this.uncommon = u;
            this.rare = r;
            this.nameKey = nameKey;
        }

        private int getTier() {
            int chance = Randomizer.nextInt(common + uncommon + rare) + 1;
            if (chance > common + uncommon) {
                return 2; //Rare
            } else if (chance > common) {
                return 1; //Uncommon
            } else {
                return 0; //Common
            }
        }

        public int[] getItems(int tier) {
            return gachapon.getItems(tier);
        }

        public int getItem(int tier) {
            int[] gacha = getItems(tier);
            int[] global = GLOBAL.getItems(tier);
            int chance = Randomizer.nextInt(gacha.length + global.length);
            return chance < gacha.length ? gacha[chance] : global[chance - gacha.length];
        }

        public static GachaponType getByNpcId(int npcId) {
            for (GachaponType gacha : values) {
                if (npcId == gacha.npcId) {
                    return gacha;
                }
            }
            return null;
        }

        /** 真实存在的扭蛋机，按枚举顺序，不含兜底的 GLOBAL */
        private static GachaponType[] machines() {
            return Arrays.stream(values).filter(g -> g.nameKey != null).toArray(GachaponType[]::new);
        }

        public static String[] getLootNames() {
            return Arrays.stream(machines()).map(g -> I18nUtil.getMessage(g.nameKey)).toArray(String[]::new);
        }

        public static int[] getLootIds() {
            return Arrays.stream(machines()).mapToInt(GachaponType::getNpcId).toArray();
        }
    }

    public GachaponItem process(int npcId) {
        GachaponType gacha = GachaponType.getByNpcId(npcId);
        int tier = gacha.getTier();
        int item = gacha.getItem(tier);
        return new GachaponItem(tier, item);
    }

    public static class GachaponItem {
        private final int id;
        private final int tier;

        public GachaponItem(int t, int i) {
            id = i;
            tier = t;
        }

        public int getTier() {
            return tier;
        }

        public int getId() {
            return id;
        }
    }

    public static void log(Character player, int itemId, String map) {
        String itemName = ItemInformationProvider.getInstance().getName(itemId);
        log.info(I18nUtil.getLogMessage("Gachapon.log.info"), player.getName(), itemName, itemId, map);
    }
}
