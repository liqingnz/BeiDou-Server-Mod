-- ----------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：检测与反作弊参数（game_config）
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
-- 【幂等性】config_code / lang_code 已存在则跳过，不覆盖后台改过的值。
-- 【提醒】改这里的默认值对已有库无效——它只在 config_code 不存在时才插入。
--   要调已生效的参数，去 gms-ui 参数页面，或直接 UPDATE game_config。
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- [V1000.0.6] insert_game_config_detect.sql
-- ---------------------------------------------------------------------------
-- 测谎（@detect / detectMap.js）的运营参数。
-- 原实现把 1500 点券成本、10000 点券赏金、60 分钟监禁全硬编码在 AbstractPlayerInteraction 里，
-- 这几个数直接决定这套机制会不会变成骚扰渠道，必须能在后台调，所以全部落成 game_config 项。
--
-- use_player_detect 默认关闭：开启后普通玩家可以花点券去处罚另一个玩家，
-- 是一条现成的骚扰渠道（比如专挑对方打BOSS时发起）。GM（gmLevel >= 2）不受此开关限制。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_player_detect', 'false', 'use_player_detect', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_player_detect');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_cost_nx', '1500', 'detect_cost_nx', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_cost_nx');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_reward_nx', '10000', 'detect_reward_nx', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_reward_nx');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_jail_minutes', '60', 'detect_jail_minutes', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_jail_minutes');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_answer_seconds', '15', 'detect_answer_seconds', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_answer_seconds');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_player_detect', '是否允许普通玩家发起测谎（GM不受此开关限制）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_player_detect');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_cost_nx', '发起一次测谎消耗的点券（GM免费）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_cost_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_reward_nx', '测谎未通过时罚没并转给发起方的点券上限', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_reward_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_jail_minutes', '测谎未通过的监禁时长（分钟）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_jail_minutes');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_answer_seconds', '测谎的答题时限（秒）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_answer_seconds');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_player_detect', 'Allow ordinary players to start a bot check (GMs are exempt from this switch)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_player_detect');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_cost_nx', 'NX charged for starting a bot check (free for GMs)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_cost_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_reward_nx', 'Maximum NX taken from a failed target and handed to the initiator', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_reward_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_jail_minutes', 'Jail time in minutes for failing a bot check', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_jail_minutes');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_answer_seconds', 'Seconds allowed to answer a bot check', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_answer_seconds');

-- ---------------------------------------------------------------------------
-- [V1000.0.15] insert_game_config_anticheat.sql
-- ---------------------------------------------------------------------------
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
