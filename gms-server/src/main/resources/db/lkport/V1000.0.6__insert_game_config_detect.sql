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
