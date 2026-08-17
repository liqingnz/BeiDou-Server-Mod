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

-- @recall：把掉线重连的玩家放回原来的活动实例。
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类）。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'recall', 2, 1, 'RecallCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'recall');
