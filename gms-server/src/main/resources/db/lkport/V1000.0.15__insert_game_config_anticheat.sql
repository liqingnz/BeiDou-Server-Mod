-- 批次 6 · G8：反外挂判定的可调参数。
--
-- 伤害判定的分母 maxWithCrit / maxDmg 都来自服务端估算式，本移植已两次确认它偏低
-- （G6 的 mob_damage_mob_max_damage_rate、本组的 summon_max_damage_rate）。
-- 所以这些倍率不是「允许作弊到几倍」，而是「估算误差的容忍度」，调低会直接增加误封。
--
-- 代码侧对每个键都做了「非正数回落到默认值」的兜底：迁移没跑时 GameConfig 返回 0，
-- 0 会让判定退化成「任何伤害都超标」，那就是全服误封。

-- ---------- 伤害检测三档 ----------

-- 第一档：仅告警给在线 GM，不计分。原硬编码 1.5。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_alert_ratio', '1.5', 'damage_hack_alert_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_alert_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_alert_ratio', '伤害超过服务端估算上限的几倍时向在线GM告警（不计分）；调低会增加误报', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_alert_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_alert_ratio', 'Damage over this multiple of the server-side estimate raises a GM alert (no points); lowering it increases false positives', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_alert_ratio');

-- 第二档：记 1 分。DAMAGE_HACK 默认 15 分封禁、1 分钟过期。原硬编码 5。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_point_ratio', '5', 'damage_hack_point_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_point_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_point_ratio', '伤害超过服务端估算上限的几倍时记1分反外挂积分；积分到DAMAGE_HACK阈值触发封号', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_point_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_point_ratio', 'Damage over this multiple of the server-side estimate adds one autoban point; reaching the DAMAGE_HACK threshold bans the account', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_point_ratio');

-- 第三档：一次性加重计分。LK 在这个倍数上做的是「即时永封 + 封IP + 封MAC」，
-- 这里改走 BeiDou 现有的账号封禁链路：可逆、有GM广播、有日志，不牵连同IP/同机器的其他人。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_severe_ratio', '30', 'damage_hack_severe_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_severe_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_severe_ratio', '伤害超过服务端估算上限的几倍时按严重情形一次性加重计分（分值见damage_hack_severe_points）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_severe_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_severe_ratio', 'Damage over this multiple of the server-side estimate is treated as severe and scored in one go (see damage_hack_severe_points)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_severe_ratio');

-- 默认 15 = DAMAGE_HACK 的封禁阈值，即单次触发就封（等价于 LK 的即时封禁，但只封账号）。
-- 想要「三振出局」把它调成 5，想要纯观察调成 1。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'damage_hack_severe_points', '15', 'damage_hack_severe_points', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_severe_points');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_severe_points', '触发严重伤害异常时一次记多少分；15等于单次直接封号，调低则需要多次触发', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_severe_points');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_severe_points', 'Points added at once when severe damage is detected; 15 bans on the first hit, lower values require repeats', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_severe_points');

-- ---------- 召唤兽伤害上限 ----------

-- 与 mob_damage_mob_max_damage_rate 同源同值：估算式偏低会把合法伤害钳掉。配 1.0 恢复严格钳位。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'summon_max_damage_rate', '1.5', 'summon_max_damage_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'summon_max_damage_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'summon_max_damage_rate', '召唤兽伤害的服务端接受上限系数；1.0为严格钳位，调高可避免合法伤害被砍，但改包能打出的上限也随之提高', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'summon_max_damage_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'summon_max_damage_rate', 'Scales the server-side damage ceiling for summon attacks; 1.0 keeps the strict clamp, higher values stop clamping legitimate damage but also raise what a packet editor can deal', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'summon_max_damage_rate');

-- ---------- 狙击固定伤害 ----------

-- 神射手的狙击是固定伤害，原先写死 195000（上限 200000）。LK 直接三倍到 595000。
-- 这里默认保持原值；改这个键会同时抬高该技能的伤害与其专属上限。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'marksman_snipe_damage', '195000', 'marksman_snipe_damage', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'marksman_snipe_damage');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'marksman_snipe_damage', '神射手狙击的固定伤害基数（实际伤害为该值加0~5000随机），伤害上限自动取该值加5000', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'marksman_snipe_damage');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'marksman_snipe_damage', 'Base fixed damage for Marksman Snipe (actual damage adds 0-5000 random); the damage cap follows as this value plus 5000', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'marksman_snipe_damage');
