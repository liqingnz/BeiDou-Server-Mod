-- 批次 6 · G10：等级上限与大区显示名。
--
-- 等级上限在两处判定，两处取同一套配置，缺一个配置就等于不生效：
--   · GameConstants.getJobMaxLevel  —— 仅当 use_enforce_job_level_range 打开时才走到
--   · Character.getMaxClassLevel    —— 默认路径（use_enforce_job_level_range 默认 false）
-- 代码侧对两个键都做了「非正数回落到原硬编码值」的兜底。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_level_cap', '200', 'max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_level_cap', '普通职业的等级上限，原版为200', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_level_cap', 'Level cap for regular jobs; vanilla is 200', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_level_cap');

-- 骑士团原版上限是 120，这里按运营决定放到 155。客户端在 v83 是按 120 设计的，
-- 超过之后的表现（经验表、称号、部分 UI）未经验证，调整前先在测试环境确认。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'cygnus_max_level_cap', '155', 'cygnus_max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'cygnus_max_level_cap', '骑士团职业的等级上限，原版为120', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'cygnus_max_level_cap', 'Level cap for Cygnus Knights; vanilla is 120', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'cygnus_max_level_cap');

-- 大区显示名。这个字符串随服务器列表发给客户端显示，属运营品牌信息而非界面文案，
-- 所以走 game_config 的 world 段而不是 i18n（它不该随玩家语言变化）。
-- 配置缺失时代码回落到 GameConstants.WORLD_NAMES 的原名。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'world', '0', 'java.lang.String', 'world_name', '枫之大陆MapleLand', 'world_name', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_type` = 'world' AND `config_sub_type` = '0' AND `config_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'world_name', '大区名称，显示在登录后的服务器列表上', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'world_name', 'World name shown in the server list after login', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'world_name');
