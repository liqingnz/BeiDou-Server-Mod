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
