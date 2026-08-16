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
