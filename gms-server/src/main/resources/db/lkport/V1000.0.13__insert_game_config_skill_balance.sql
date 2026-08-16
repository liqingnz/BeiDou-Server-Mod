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

-- GM 免冷却。方便调试，但也意味着 GM 测出来的手感不代表玩家。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_gm_no_skill_cooldown', 'true', 'use_gm_no_skill_cooldown', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_gm_no_skill_cooldown', 'GM（等级3以上）使用技能不进入冷却；关闭后GM与普通玩家一致', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_gm_no_skill_cooldown', 'GMs (level 3+) skip skill cooldowns entirely; disable to make them behave like regular players', NULL
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
