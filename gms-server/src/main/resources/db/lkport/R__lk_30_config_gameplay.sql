-- ----------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：玩法机制参数（game_config）
-- ---------------------------------------------------------------------------
--
-- 【R__ = Flyway 可重复迁移】没有版本号，Flyway 每次启动比对本文件的 checksum，
--   内容一变就整份重跑；不变则跳过。迁移期反复调数值就靠这个——改完重启服务端即可，
--   不必新编版本号、不必删库、不必手工执行 SQL。执行时机在所有 V__ 版本化迁移之后，
--   多个 R__ 之间按文件名字典序，所以文件名里的两位数字就是执行顺序。
--
-- 【纪律】本文件必须幂等：任何一条语句重跑都不能改变最终状态。写法只用三种——
--   INSERT ... SELECT ... WHERE NOT EXISTS、先 DELETE 同键再 INSERT、无条件 UPDATE/DELETE。
--   新增内容时照抄这三种之一，不要写裸 INSERT ... VALUES。
--
-- 【取舍】重跑会覆盖运营在 gms-ui 后台对同范围数据的手工改动——迁移期这是有意为之：
--   本文件是这批数据的唯一真源。上线前把所有 R__ 改名成 V1000.3.x（内容不动）即可冻结。
--
-- 【幂等性】同上，config_code 已存在则跳过。
-- 【顺序】召回小节的 @recall 指令注册在 R__lk_10_commands.sql。
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- [V1000.0.7] insert_game_config_equip_growth.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G4：极品装备属性（Godly）、装备属性浮动范围、成长装备的等级门槛、元素武器升级方式。
--
-- equip_godly_max_bonus 是原实现里写死在 getRandStat 里的 20 行 if-else：每档 1% 概率，
-- 命中即在常规浮动之上再加该档位的点数。这里参数化后，配 0 就是关闭（属性与引入前逐位相同），
-- 配 5 等价于原实现。作用面是全部装备掉落（怪物/反应堆/脚本发放）与专业技能制作产物。
--
-- equip_stat_randomize_range 的实际约束面比看上去小：浮动区间是
-- min(ceil(属性值 * 0.1), 本配置)，所以只有属性值大于 50 时本配置才可能成为约束，
-- 低等级装备调它没有效果。默认 5 与调整前的硬编码值一致。
--
-- use_equip_growth_level_limit 打开后，成长装备每升 1 级穿戴要求 +5，
-- 且只有玩家已达到「下一级的穿戴要求」时装备才继续吃经验——避免长成一件自己穿不上的装备。
-- 达到 max_level_cap 的玩家不受此限制。
--
-- max_level_cap / cygnus_max_level_cap 本批由成长门槛消费，等级上限本身的其余改动在 G10。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'equip_godly_max_bonus', '5', 'equip_godly_max_bonus', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'equip_godly_max_bonus');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'equip_stat_randomize_range', '5', 'equip_stat_randomize_range', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'equip_stat_randomize_range');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_equip_growth_level_limit', 'true', 'use_equip_growth_level_limit', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_equip_growth_level_limit');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_elemental_weapon_gms_levelup', 'true', 'use_elemental_weapon_gms_levelup', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_level_cap', '200', 'max_level_cap', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_level_cap');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'equip_godly_max_bonus', '极品装备属性的最高加成点数，每档1%概率，0为关闭', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'equip_godly_max_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'equip_stat_randomize_range', '装备掉落时的属性浮动范围上限（防御/HP/MP为其2倍）；实际浮动取本值与属性值10%的较小者，故对属性值50以下的装备无效', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'equip_stat_randomize_range');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_equip_growth_level_limit', '成长装备每升1级穿戴要求+5，且玩家等级不够时装备停止获得经验', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_equip_growth_level_limit');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_elemental_weapon_gms_levelup', '元素武器按GMS原版方式升级（读wz的小幅成长）；关闭则与普通装备一样升级', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_level_cap', '冒险家与战神的等级上限', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_level_cap');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'equip_godly_max_bonus', 'Highest godly stat bonus an equip can roll, 1% chance per tier; 0 disables it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'equip_godly_max_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'equip_stat_randomize_range', 'Cap on equip stat variance when dropped (doubled for def/HP/MP); the actual spread is the smaller of this and 10% of the stat, so it has no effect below stat 50', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'equip_stat_randomize_range');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_equip_growth_level_limit', 'Each equip level adds 5 to its level requirement, and an equip stops gaining EXP while the player is below that requirement', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_equip_growth_level_limit');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_elemental_weapon_gms_levelup', 'Level elemental weapons the GMS way (small wz-defined gains); disable to level them like ordinary equips', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_level_cap', 'Level cap for adventurers and Aran', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_level_cap');

-- ---------------------------------------------------------------------------
-- [V1000.0.9] insert_game_config_mob_spawn.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G1：刷怪倍率随地图人数变化。
--
-- 原公式是 0.70 + 0.05 * min(6, 人数)。现在改为
-- mob_spawn_base_rate + min(有效玩家数, mob_spawnrate_max_players) * mob_spawnrate_to_player_count。
-- 「有效玩家」指等级不低于本图最高等级玩家 30 级的人，避免挂机小号拉高刷怪率。
-- 人数上限保留原公式的 6，落成配置项；置 0 表示不封顶（即原移植来源的行为）。
--
-- mob_spawn_point_capacity 是单个刷怪点能同时存在的怪物数，原实现是写死的 1。
-- BOSS 刷怪点不受此配置影响，恒为 1。
--
-- use_wz_map_mob_rate 启用 Map.wz 里 info/mobRate 这份地图密度数据。
-- 该字段 MapFactory 一直在解析、MapleMap 一直存着，但此前全仓库没有第二处引用，是死字段；
-- 5364 张地图 img 里 5363 张带这个值，取值 0.4~10 连续分布。
-- 这替代了原实现里按地图 id 段硬编码 x2 的做法——那种写法只覆盖三段 id，
-- 且其中「玩具城」那段 wz 本来就特意调低到 0.4~1.1，硬编码 x2 与数据意图相反。
-- 关掉本开关即恢复到启用之前的表现（所有地图一律按 1 倍）。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Float', 'mob_spawn_base_rate', '0.7', 'mob_spawn_base_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawn_base_rate');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Float', 'mob_spawnrate_to_player_count', '0.1', 'mob_spawnrate_to_player_count', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mob_spawnrate_max_players', '6', 'mob_spawnrate_max_players', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawnrate_max_players');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mob_spawn_point_capacity', '2', 'mob_spawn_point_capacity', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawn_point_capacity');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_wz_map_mob_rate', 'true', 'use_wz_map_mob_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_wz_map_mob_rate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawnrate_max_players', '计入刷怪倍率的有效玩家数上限，0表示不封顶', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawnrate_max_players');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawn_base_rate', '地图刷怪基础倍率（乘以刷怪点数得出怪物数上限）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawn_base_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawnrate_to_player_count', '每多一名有效玩家增加的刷怪倍率；有效玩家指等级不低于本图最高等级玩家30级的人', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawn_point_capacity', '单个刷怪点可同时存在的怪物数，BOSS点恒为1', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawn_point_capacity');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_wz_map_mob_rate', '按wz地图数据(info/mobRate)区分各图刷怪密度；关闭则所有地图一律按1倍', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_wz_map_mob_rate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawnrate_max_players', 'Cap on how many effective players count toward the spawn rate; 0 means no cap', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawnrate_max_players');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawn_base_rate', 'Base map spawn rate, multiplied by the spawn point count to cap live monsters', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawn_base_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawnrate_to_player_count', 'Spawn rate added per effective player; effective means within 30 levels of the highest-level player on the map', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawn_point_capacity', 'Monsters a single spawn point may hold at once; boss spawn points are always 1', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawn_point_capacity');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_wz_map_mob_rate', 'Use the per-map density from wz (info/mobRate); disable to treat every map as 1x', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_wz_map_mob_rate');

-- ---------------------------------------------------------------------------
-- [V1000.0.11] insert_game_config_clean_slate.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G5：白医卷轴（Clean Slate）的判定规则开关。
--
-- 关闭（原实现）：白医的语义是「找回一次打卷失败掉掉的孔」。判定式是
--   剩余孔 + 已成功次数 < 总孔数(tuc) + Vicious 数
-- 也就是「这件装备失败过」。全新未打的装备用不了，七孔全成功的装备也用不了，
-- 总孔数永远不会超过 tuc。
--
-- 打开（LK 规则）：白医改为「给已经打满的装备额外加一个孔」，判定式只有
--   剩余孔 == 0
-- 反复「白医开孔 → 打卷」可以把同一件装备的总孔数无限叠上去，是产出侧的有意放宽。
-- 上限只剩 upgradeSlots 这个 byte 字段本身的 127（代码里已挡溢出）。
--
-- 两种规则下 tuc 为 0 的装备（本身不可打卷）都拒绝，不会被白医开出第一个孔。
-- LK 另外硬编码了 1122000（黑龙项链）不可白医，那是运营口味不是修 BUG——该装备在
-- v83 数据里 tuc = 3，本来就可打卷——所以没有跟进，要禁哪件装备请单独处理。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_lk_clean_slate', 'true', 'use_lk_clean_slate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_lk_clean_slate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_lk_clean_slate', '白医卷轴改为「给剩余孔为0的装备额外加1个孔」，总孔数可超过装备原有上限；关闭则恢复为「仅找回打卷失败掉的孔」', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_lk_clean_slate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_lk_clean_slate', 'Clean Slate Scrolls grant one extra slot to equips with no slots left, letting total slots exceed the item cap; disable to only recover slots lost to failed scrolls', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_lk_clean_slate');

-- ---------------------------------------------------------------------------
-- [V1000.0.12] insert_game_config_mob_damage_mob.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G6：怪物互殴伤害上限的放宽系数。
--
-- 唯一触发路径是海盗的心灵控制（Corsair.HYPNOTIZE，StatEffect 里唯一写 INERTMOB 的地方）：
-- 被控制的怪打其他怪时，客户端把伤害报上来，服务端用 MobDamageMobHandler.calcMaxDamage
-- 估一个上限做反外挂钳位。那套估算式是 OdinMS 留下的，算出来比客户端实际打出的低，
-- 于是合法伤害会被砍到上限，并且每次命中刷一条 warn 日志。
--
-- 本配置只抬「服务端愿意接受的上限」，不提高实际伤害——伤害数值始终来自客户端包。
-- 所以它不是伤害倍率，别按倍率去理解。
--
-- 配 1.0 = 恢复原来的严格钳位（合法伤害继续被砍）。配得越高，钳位越松，
-- 改包能打出的伤害上限也越高——这是反外挂强度与手感之间的取舍。
-- LK 写死 2.5 且没给依据，这里默认 1.5 取中。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'mob_damage_mob_max_damage_rate', '1.5', 'mob_damage_mob_max_damage_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_damage_mob_max_damage_rate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_damage_mob_max_damage_rate', '怪物互殴（海盗心灵控制）时服务端接受的伤害上限系数；1.0为严格钳位，调高可避免合法伤害被砍，但改包能打出的上限也随之提高', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_damage_mob_max_damage_rate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_damage_mob_max_damage_rate', 'Scales the server-side damage ceiling for mob-vs-mob hits (Corsair Hypnotize); 1.0 keeps the strict clamp, higher values stop clamping legitimate damage but also raise what a packet editor can deal', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_damage_mob_max_damage_rate');

-- ---------------------------------------------------------------------------
-- [V1000.0.13] insert_game_config_skill_balance.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G9：技能平衡相关的可调参数。
--
-- 分四组：
--   1) 三个「额外防击退（STANCE）」——LK 给战舰 / 魔力反射 / 神射手黑暗附带的防击退，
--      全部落成数值配置，0 = 不附加、恢复原有表现。
--   2) 战神连击——原本硬编码的 3 秒断连窗口，以及 GM 连击加成。
--   3) 技能冷却——GM 免冷却开关，以及英雄意志快速重用的除数（原先硬编码 60）。
--   4) 战舰血量——原先硬编码的 400 / 级 与 200 / 等级。
--
-- 默认值除 battleship_hp_per_skill_level 外均为「与原实现一致」或「LK 值」，
-- 逐项说明见各条注释。

-- ---------- 1) 额外防击退 ----------

-- 战舰：LK 给 30。原实现不带防击退。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_stance', '30', 'battleship_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_stance', '船长战舰附带的防击退几率（0-100），0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_stance', 'Knockback resistance (0-100) granted by Corsair Battleship; 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_stance');

-- 魔力反射：LK 给 30。原实现不带防击退。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mana_reflection_stance', '30', 'mana_reflection_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mana_reflection_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mana_reflection_stance', '魔力反射附带的防击退几率（0-100），0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mana_reflection_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mana_reflection_stance', 'Knockback resistance (0-100) granted by Mana Reflection; 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mana_reflection_stance');

-- 神射手黑暗：LK 给 100，即黑暗期间完全免击退。这是三条里最强的一条，嫌猛就调低或置 0。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'marksman_blind_stance', '100', 'marksman_blind_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'marksman_blind_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'marksman_blind_stance', '神射手黑暗附带的防击退几率（0-100），100为完全免击退；0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'marksman_blind_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'marksman_blind_stance', 'Knockback resistance (0-100) granted by Marksman Blind; 100 means full immunity, 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'marksman_blind_stance');

-- ---------- 2) 战神连击 ----------

-- 默认 3 秒 = 原硬编码值，零行为变更。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'aran_combo_last_time', '3', 'aran_combo_last_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'aran_combo_last_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'aran_combo_last_time', '战神连击的断连判定时间（秒），超过这个时间没有命中则连击清零', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'aran_combo_last_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'aran_combo_last_time', 'Seconds of inactivity before an Aran combo resets to zero', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'aran_combo_last_time');

-- GM 每次命中的额外连击数，0 = 关闭（与原实现一致）。仅 GM 等级 3 以上生效。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'aran_combo_gm_bonus', '5', 'aran_combo_gm_bonus', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'aran_combo_gm_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'aran_combo_gm_bonus', 'GM（等级3以上）战神每次命中额外增加的连击数，0表示关闭', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'aran_combo_gm_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'aran_combo_gm_bonus', 'Extra combo count granted per hit to GMs (level 3+) playing Aran; 0 disables it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'aran_combo_gm_bonus');

-- ---------- 3) 技能冷却 ----------

-- GM 免冷却。只覆盖 SpecialMoveHandler 这条路径（buff/召唤/位移等非攻击技能）；
-- 攻击技能的冷却由 CloseRange / Magic / RangedAttack 三个伤害 handler 各自登记，不受此开关影响。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_gm_no_skill_cooldown', 'true', 'use_gm_no_skill_cooldown', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_gm_no_skill_cooldown', 'GM（等级3以上）使用非攻击类技能（SpecialMoveHandler 路径）不进入冷却；攻击技能的冷却仍由各伤害handler登记，不受此开关影响', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_gm_no_skill_cooldown', 'GMs (level 3+) skip cooldowns for non-attack skills (the SpecialMoveHandler path); attack skill cooldowns are still registered by the damage handlers and are not affected', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_gm_no_skill_cooldown');

-- 英雄意志快速重用的除数，默认 60 = 原硬编码值。仅在 use_fast_reuse_hero_will 打开时生效。
-- 代码里已用 Math.max(1, ...) 兜住 0。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'fast_reuse_hero_will_divisor', '60', 'fast_reuse_hero_will_divisor', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'fast_reuse_hero_will_divisor');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'fast_reuse_hero_will_divisor', '英雄意志快速重用时冷却时间的除数，越大冷却越短；需先开启use_fast_reuse_hero_will', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'fast_reuse_hero_will_divisor');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'fast_reuse_hero_will_divisor', 'Divisor applied to Hero''s Will cooldown when fast reuse is on; larger means shorter cooldown. Requires use_fast_reuse_hero_will', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'fast_reuse_hero_will_divisor');

-- ---------- 4) 战舰血量 ----------

-- 原实现是 400 / 技能等级。LK 改成 3000（7.5 倍），满级 10 时 4000 → 30000。
-- 这里按 LK 取 3000；想回到原版把它调回 400。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_hp_per_skill_level', '3000', 'battleship_hp_per_skill_level', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_hp_per_skill_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_hp_per_skill_level', '战舰每级技能提供的耐久度，原版为400', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_hp_per_skill_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_hp_per_skill_level', 'Battleship durability granted per skill level; vanilla is 400', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_hp_per_skill_level');

-- 角色等级超过 120 的部分，每级追加的耐久度。默认 200 = 原值。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_hp_per_level', '200', 'battleship_hp_per_level', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_hp_per_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_hp_per_level', '角色等级超过120的部分，每级为战舰追加的耐久度', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_hp_per_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_hp_per_level', 'Extra Battleship durability granted per character level above 120', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_hp_per_level');

-- ---------------------------------------------------------------------------
-- [V1000.0.16] insert_game_config_level_cap_and_world_name.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G10：等级上限与大区显示名。
--
-- 等级上限在两处判定，两处取同一套配置，缺一个配置就等于不生效：
--   · GameConstants.getJobMaxLevel  —— 仅当 use_enforce_job_level_range 打开时才走到
--   · Character.getMaxClassLevel    —— 默认路径（use_enforce_job_level_range 默认 false）
-- 代码侧对两个键都做了「非正数回落到原硬编码值」的兜底，并把上界钳在 255——
-- 角色等级在多处封包里是单字节，256 会绕回 0，客户端看到的等级就乱了。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_level_cap', '200', 'max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_level_cap', '普通职业的等级上限，原版为200，有效范围1-255（等级在封包中为单字节）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_level_cap', 'Level cap for regular jobs; vanilla is 200, valid range 1-255 (level is a single byte on the wire)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_level_cap');

-- 骑士团原版上限是 120，这里按运营决定放到 155。客户端在 v83 是按 120 设计的，
-- 超过之后的表现（经验表、称号、部分 UI）未经验证，调整前先在测试环境确认。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'cygnus_max_level_cap', '155', 'cygnus_max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'cygnus_max_level_cap', '骑士团职业的等级上限，原版为120，有效范围1-255', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'cygnus_max_level_cap', 'Level cap for Cygnus Knights; vanilla is 120, valid range 1-255', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'cygnus_max_level_cap');

-- 大区显示名。这个字符串随服务器列表发给客户端显示，属运营品牌信息而非界面文案，
-- 所以走 game_config 的 world 段而不是 i18n（它不该随玩家语言变化）。
-- 配置缺失时代码回落到 GameConstants.WORLD_NAMES 的原名。
-- 注意：英文客户端的出包字符集是 US-ASCII，编不出来的字符会被丢掉（不是变问号），
-- 所以「枫之大陆MapleLand」在中文客户端是全名，在英文客户端显示为「MapleLand」。
-- 想让两种客户端看到完全一致的名字，就只用 ASCII 字符。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'world', '0', 'java.lang.String', 'world_name', '枫之大陆MapleLand', 'world_name', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_type` = 'world' AND `config_sub_type` = '0' AND `config_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'world_name', '大区名称，显示在登录后的服务器列表上', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'world_name', 'World name shown in the server list after login', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'world_name');

-- ---------------------------------------------------------------------------
-- [V1000.0.17] insert_recall_config.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G12：活动召回的时限与冷却，以及 @recall 指令注册。
--
-- 整套召回功能由已有的 use_enable_recall_event 总开关控制（V1.7.0 里默认 false）。
-- 下面两个键只在总开关打开后才有意义。
--
-- 已知取舍：v83 客户端退出游戏与网络掉线都是直接关 socket，服务端无法区分，
-- 所以「快死了先退游戏、再登回来」的玩家也会在时限内被放回活动，等于免掉了脱战的代价。
-- 这是当前有意接受的行为。异常状态本身不会被刷掉（playerdiseases 表持久化了剩余时长，
-- 登录时会重新施加），所以收益有限。要收紧就把 max_recall_time 调短。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_recall_time', '10', 'max_recall_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_recall_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_recall_time', '掉出活动后多少分钟内登录仍会被自动放回该活动；超过则不再召回', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_recall_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_recall_time', 'Minutes after dropping out of an event during which logging in still puts the player back into it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_recall_time');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'recall_cooldown', '10', 'recall_cooldown', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'recall_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'recall_cooldown', '两次自动召回之间的最小间隔（分钟）；GM 手动 @recall 不受此限制', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'recall_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'recall_cooldown', 'Minimum minutes between two automatic recalls; the GM @recall command is not subject to this', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'recall_cooldown');

-- ---------------------------------------------------------------------------
-- [V1000.0.18] insert_game_config_merchant_expire.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G13：雇佣商店存续天数。
--
-- 计数器在 World.runHiredMerchantSchedule 里每 10 分钟加 1（HiredMerchantTask 的注册周期），
-- 144 跳 = 24 小时，所以这个键的单位是「天」。原版写死 144，即 1 天。
--
-- 两处代码都读这个键，且都对「配置缺失（getServerInt 返回 0）」回落到 1：
--   · World.runHiredMerchantSchedule —— 到期强关。缺兜底的话 0 * 144 = 0，
--     商店会在第二个 10 分钟跳就被 forceClose，等于全服商店 10 分钟暴毙。
--   · HiredMerchant.getTimeOpen      —— 店主界面的已开时长。客户端这一格只按 1 天量程渲染，
--     所以把已开时长整体前移 (天数-1) 天，多出来的存续期才能在界面上表达出来。
--     该值以 short 出包，配到 13 天以上会溢出，代码里已钳在 Short.MAX_VALUE。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'merchant_expire_time', '3', 'merchant_expire_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'merchant_expire_time', '雇佣商店摆摊后自动关闭前的存续天数，原版为1天；超过13天店主界面的时长显示会失真', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'merchant_expire_time', 'Days a hired merchant stays up before it is force-closed; vanilla is 1. Above 13 days the owner-side time display saturates', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'merchant_expire_time');

-- ---------------------------------------------------------------------------
-- [V1000.0.20] insert_game_config_quest_hp_pill.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G15：完成不可重复任务额外发一颗小血液精华（2000101，吃掉永久 +10 血上限）。
--
-- 【2026-08-20 运营改判：默认开】原先默认 false 有两条理由，第一条已消失：
--   1. wz 缺物品 —— 已随 2797a46f3 补齐（Item.wz/Consume/0200.img 的 02000100/02000101、
--      两层 String.wz/Consume.img 的名字与说明；客户端 img 是同一批从 LK 客户端取的）；
--   2. 平衡 —— 依然成立，开之前按 Check.img 又算了一遍账：不可重复任务 2558 个，
--      全清 +25,580 血上限，而 AbstractCharacterObject 把客户端血上限钳在 30000；
--      法师换算约 +5,116 血 / +20,464 魔。
--   另注意 2000101 早就在 R__lk_40_drops 里挂了 28 个怪的掉落（扎昆 3-5、暗黑龙王 6-8、
--   粉红豆 15-20，均 100%），药丸本身在这个开关打开前就已经在流通。
--
-- 原作者写过「任务 MIN_LEVEL >= 30 且角色等级 > 70 才给」的门槛，但那段代码是注释掉的，
-- 活代码只判了「不可重复」。这里仍按原样移植、不加门槛。（那道门槛能把全清收益压到
-- +11,110，即 lvmin >= 30 的 1111 个任务；真要加得先给 MinLevelRequirement 补 getMinLevel()。）
--
-- 发放面只有客户端原生的任务完成路径（QuestActionHandler → Quest.complete）；
-- 脚本走 qm.forceCompleteQuest() → Quest.forceComplete，不发 —— 与 LK 行为一致。
--
-- 这条 INSERT 带 WHERE NOT EXISTS，改的是「新库的初始值」，不会覆盖已有库里运营在
-- gms-ui 改过的值 —— 有意如此，否则后台关不掉，一重启就被这份文件顶回 true。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_quest_hp_pill', 'true', 'use_quest_hp_pill', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_quest_hp_pill');

-- 描述文案原先写着「开启前需先补齐 wz 数据」，前提已解除，用 DELETE + INSERT 强制刷新
DELETE FROM `lang_resources` WHERE `lang_base` = 'game_config' AND `lang_code` = 'use_quest_hp_pill';
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`) VALUES
('zh-CN', 'game_config', 'use_quest_hp_pill', '完成不可重复任务时额外发一颗小血液精华（2000101，吃掉永久+10血上限，法师+2血/+8魔）；2558 个不可重复任务全清=+25,580，而客户端血上限只有 30000', NULL),
('en-US', 'game_config', 'use_quest_hp_pill', 'Grant a small Blood Essence (2000101, permanent +10 max HP; Magicians +2 HP/+8 MP) on completing a non-repeatable quest. Clearing all 2558 of them is +25,580, against a 30000 client HP cap', NULL);

-- ---------------------------------------------------------------------------
-- [本地新增] insert_game_config_slots_gain_by_level.sql
-- ---------------------------------------------------------------------------
-- 每 20 级扩包时，四类背包（装备/消耗/设置/其他，不含现金栏）各增加多少格。
-- 原实现在 Character.levelUp 里写死 4，这里参数化。本服种子值取 12：
-- 建号时四类背包各 24 格，每 20 级 +12，到 120 级正好顶满 96 格（24 + 12*6），
-- 再往上的扩包节点因为超过 96 会整笔跳过。想回到原版节奏把本节的 12 改回 4 即可。
--
-- 只有 use_add_slots_by_level 打开时才生效，且 GM 角色不参与。
-- 上限由 canGainSlots 钳在 96 格：本次增量会让某类背包超过 96 时，
-- 该类整笔不发（不是发到 96 封顶），玩家侧只会少一次扩包而不会报错。
-- 因此调大本值主要是加快前中期扩包节奏，96 格的天花板不受影响。
--
-- 消费方 Character.levelUp 用 getServerInt(key, 4)：配置行缺失时回落到原版的 4，
-- 而不是无参重载那个会让「开关开着但一格不加」的 0。本文件仍是这一行的唯一真源。
--
-- 注意本节是 WHERE NOT EXISTS，只补缺不改值：库里已经有这行的环境改本文件的 12 不会生效，
-- 要么在 gms-ui 后台改，要么临时把本节换成先 DELETE 再 INSERT。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'slots_gain_by_level', '12', 'slots_gain_by_level', '2026-08-19 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'slots_gain_by_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'slots_gain_by_level', '开启每20级扩包后，每次为装备/消耗/设置/其他四类背包各增加的格数，原版为4；单类超过96格时该类本次不发', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'slots_gain_by_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'slots_gain_by_level', 'Slots added to each of the equip/use/setup/etc inventories on every 20th level when use_add_slots_by_level is on; vanilla is 4. A type is skipped when the gain would push it past 96', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'slots_gain_by_level');
