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
