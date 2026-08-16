/*
    This file is part of the HeavenMS MapleStory Server
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
package org.gms.server.expeditions;

import org.gms.config.GameConfig;
import org.gms.util.DatabaseConnection;
import org.gms.util.Pair;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Calendar;
import java.util.LinkedList;
import java.util.List;

import static java.util.concurrent.TimeUnit.HOURS;

/**
 * @author Conrad
 * @author Ronan
 */
public class ExpeditionBossLog {

    public enum BossLogEntry {
        ZAKUM(2, 1, false),
        HORNTAIL(2, 1, false),
        PINKBEAN(2, 1, false),
        SCARGA(2, 1, false),
        PAPULATUS(2, 1, false),
        // 以下四个 BOSS 此前没有条目，getBossEntryByName 返回 null 时 attemptBoss 直接放行，
        // 等于完全不受次数限制
        BALROG_NORMAL(2, 1, false),
        KREXEL(2, 1, false),
        SHOWA(2, 1, false),
        YAOSENG(4, 1, true);

        private final int entries;
        private final int timeLength;
        private final int minChannel;
        private final int maxChannel;
        private final boolean week;

        BossLogEntry(int entries, int timeLength, boolean week) {
            this(entries, 0, Integer.MAX_VALUE, timeLength, week);
        }

        BossLogEntry(int entries, int minChannel, int maxChannel, int timeLength, boolean week) {
            this.entries = entries;
            this.minChannel = minChannel;
            this.maxChannel = maxChannel;
            this.timeLength = timeLength;
            this.week = week;
        }

        private static List<Pair<Timestamp, BossLogEntry>> getBossLogResetTimestamps(Calendar timeNow, boolean week) {
            List<Pair<Timestamp, BossLogEntry>> resetTimestamps = new LinkedList<>();

            Timestamp ts = new Timestamp(timeNow.getTime().getTime());  // reset all table entries actually, thanks Conrad
            for (BossLogEntry b : BossLogEntry.values()) {
                if (b.week == week) {
                    resetTimestamps.add(new Pair<>(ts, b));
                }
            }

            return resetTimestamps;
        }

        private static BossLogEntry getBossEntryByName(String name) {
            for (BossLogEntry b : BossLogEntry.values()) {
                if (name.contentEquals(b.name())) {
                    return b;
                }
            }

            return null;
        }

    }

    public static void resetBossLogTable() {
        /*
        Boss logs resets 12am, weekly thursday 12AM - thanks Smitty Werbenjagermanjensen (superadlez) - https://www.reddit.com/r/Maplestory/comments/61tiup/about_reset_time/
        */

        // Calendar.HOUR 是 12 小时制（0-11）且不会动 AM_PM，下午启动时算出来的是当天中午而不是零点，
        // 会把当天上午的挑战记录一起删掉，等于白送一次次数。两处都必须用 HOUR_OF_DAY
        Calendar weeklyReset = Calendar.getInstance();
        weeklyReset.set(Calendar.DAY_OF_WEEK, Calendar.THURSDAY);
        weeklyReset.set(Calendar.HOUR_OF_DAY, 0);
        weeklyReset.set(Calendar.MINUTE, 0);
        weeklyReset.set(Calendar.SECOND, 0);
        weeklyReset.set(Calendar.MILLISECOND, 0);

        Calendar now = Calendar.getInstance();

        // set(DAY_OF_WEEK) 只在本周内移动，周日到周三会指到未来的周四。那样 deltaTime 为负、
        // 取模后仍为负，判定恒真，于是拿一个未来时间戳把整张周榜删光
        if (weeklyReset.after(now)) {
            weeklyReset.add(Calendar.DAY_OF_MONTH, -7);
        }

        long deltaTime = now.getTimeInMillis() - weeklyReset.getTimeInMillis();
        if (deltaTime < HOURS.toMillis(12)) {
            ExpeditionBossLog.resetBossLogTable(true, weeklyReset);
        }

        now.set(Calendar.HOUR_OF_DAY, 0);
        now.set(Calendar.MINUTE, 0);
        now.set(Calendar.SECOND, 0);
        now.set(Calendar.MILLISECOND, 0);

        ExpeditionBossLog.resetBossLogTable(false, now);
    }

    private static void resetBossLogTable(boolean week, Calendar c) {
        List<Pair<Timestamp, BossLogEntry>> resetTimestamps = BossLogEntry.getBossLogResetTimestamps(c, week);

        try (Connection con = DatabaseConnection.getConnection()) {
            for (Pair<Timestamp, BossLogEntry> p : resetTimestamps) {
                try (PreparedStatement ps = con.prepareStatement("DELETE FROM " + getBossLogTable(week) + " WHERE attempttime <= ? AND bosstype LIKE ?")) {
                    ps.setTimestamp(1, p.getLeft());
                    ps.setString(2, p.getRight().name());
                    ps.executeUpdate();
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private static String getBossLogTable(boolean week) {
        return week ? "bosslog_weekly" : "bosslog_daily";
    }

    private static int countPlayerEntries(int cid, BossLogEntry boss) {
        int ret_count = 0;
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("SELECT COUNT(*) FROM " + getBossLogTable(boss.week) + " WHERE characterid = ? AND bosstype LIKE ?")) {
            ps.setInt(1, cid);
            ps.setString(2, boss.name());

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    ret_count = rs.getInt(1);
                } else {
                    ret_count = -1;
                }
            }
            return ret_count;
        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    private static void insertPlayerEntry(int cid, BossLogEntry boss) {
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("INSERT INTO " + getBossLogTable(boss.week) + " (characterid, bosstype) VALUES (?,?)")) {
            ps.setInt(1, cid);
            ps.setString(2, boss.name());
            ps.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static boolean attemptBoss(int cid, int channel, Expedition exped, boolean log) {
        return attemptBoss(cid, channel, exped.getType().name(), log);
    }

    public static boolean attemptBoss(int cid, int channel, String bossName, boolean log) {
        if (!GameConfig.getServerBoolean("use_enable_daily_expeditions")) {
            return true;
        }

        BossLogEntry boss = BossLogEntry.getBossEntryByName(bossName);
        if (boss == null) {
            return true;
        }

        if (channel < boss.minChannel || channel > boss.maxChannel) {
            return false;
        }

        if (countPlayerEntries(cid, boss) >= boss.entries) {
            return false;
        }

        if (log) {
            insertPlayerEntry(cid, boss);
        }
        return true;
    }
}
