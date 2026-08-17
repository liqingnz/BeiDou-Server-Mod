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
package org.gms.server.life;

import org.gms.client.Character;
import org.gms.config.GameConfig;
import org.gms.net.server.Server;
import org.gms.util.Randomizer;

import java.awt.*;
import java.util.concurrent.atomic.AtomicInteger;

import static java.util.concurrent.TimeUnit.SECONDS;

public class SpawnPoint {
    private final int monster;
    private final int mobTime;
    private final int team;
    private final int fh;
    private final int f;
    private final Point pos;
    private long nextPossibleSpawn;
    private int mobInterval = 5000;
    private final AtomicInteger spawnedMonsters = new AtomicInteger(0);
    private final boolean immobile;
    private final boolean boss;
    private boolean denySpawn = false;

    public SpawnPoint(final Monster monster, Point pos, boolean immobile, int mobTime, int mobInterval, int team) {
        this.monster = monster.getId();
        this.boss = monster.isBoss();
        this.pos = new Point(pos);
        this.mobTime = mobTime;
        this.team = team;
        this.fh = monster.getFh();
        this.f = monster.getF();
        this.immobile = immobile;
        this.mobInterval = mobInterval;
        this.nextPossibleSpawn = Server.getInstance().getCurrentTime();
    }

    public int getSpawned() {
        return spawnedMonsters.intValue();
    }

    public void setDenySpawn(boolean val) {
        denySpawn = val;
    }

    public boolean getDenySpawn() {
        return denySpawn;
    }

    /** BOSS 点恒定只放一只，普通点的容量由配置决定，缺配置时取迁移脚本里的种子值 2 */
    private int spawnCapacity() {
        return boss ? 1 : Math.max(1, GameConfig.getServerInt("mob_spawn_point_capacity", 2));
    }

    /**
     * 只是预筛，真正的名额占用在 {@link #getMonster()} 里原子完成——两者之间存在窗口，
     * 而全局 RespawnTask（MapManager.updateMaps 遍历所有地图）与 MonsterCarnival 自己的
     * respawnTask 会并发对同一张地图调 respawn。
     */
    public boolean shouldSpawn() {
        if (denySpawn || mobTime < 0 || spawnedMonsters.get() >= spawnCapacity()) {
            return false;
        }
        return nextPossibleSpawn <= Server.getInstance().getCurrentTime();
    }

    public boolean shouldForceSpawn() {
        return mobTime >= 0 && spawnedMonsters.get() <= 0;
    }

    /**
     * 名额在这里原子占用：先自增再比对容量，超了立刻回退并返回 null，调用方跳过即可。
     * 失败路径不会留下未释放的名额（回退发生在建怪之前，也就不存在挂上监听器却不入场的怪）。
     *
     * @return 占不到名额时返回 null
     */
    public Monster getMonster() {
        if (spawnedMonsters.incrementAndGet() > spawnCapacity()) {
            spawnedMonsters.decrementAndGet();
            return null;
        }

        Monster mob = new Monster(LifeFactory.getMonster(monster));
        mob.setPosition(new Point(pos));
        mob.setTeam(team);
        mob.setFh(fh);
        mob.setF(f);
        mob.addListener(new MonsterListener() {
            @Override
            public void monsterKilled(int aniTime) {
                nextPossibleSpawn = Server.getInstance().getCurrentTime();
                if (mobTime > 0) {
                    if (boss) {
                        // BOSS 重生时间在 ±20% 内浮动，避免固定周期被蹲点
                        double timeMultiplier = 0.8 + Randomizer.nextDouble() * 0.4;
                        nextPossibleSpawn += SECONDS.toMillis(Math.round(mobTime * timeMultiplier));
                    } else {
                        nextPossibleSpawn += SECONDS.toMillis(mobTime);
                    }
                } else {
                    nextPossibleSpawn += aniTime;
                }
                spawnedMonsters.decrementAndGet();
            }

            @Override
            public void monsterDamaged(Character from, int trueDmg) {}

            @Override
            public void monsterHealed(int trueHeal) {}
        });
        if (mobTime == 0) {
            nextPossibleSpawn = Server.getInstance().getCurrentTime() + mobInterval;
        }
        return mob;
    }

    public int getMonsterId() {
        return monster;
    }

    public Point getPosition() {
        return pos;
    }

    public final int getF() {
        return f;
    }

    public final int getFh() {
        return fh;
    }

    public int getMobTime() {
        return mobTime;
    }

    public int getTeam() {
        return team;
    }
}
