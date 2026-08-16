-- 批次 6 · G15：完成不可重复任务额外发一颗小血液精华。
--
-- 默认 false，开之前务必先算账：
--   BeiDou 的 wz 里 QuestInfo.img 有 2819 个任务条目，Check.img 里带 interval（可重复）的 528 个，
--   即约 2290 个不可重复任务。一颗小血液精华永久 +10 血上限，全清就是 +22900，
--   而 AbstractCharacterObject 把客户端血上限钳在 30000 —— 等于加点加血彻底失去意义。
--   法师换算是 +4580 血 / +18320 魔。
--
-- 原作者写过「任务 MIN_LEVEL >= 30 且角色等级 > 70 才给」的门槛，但那段代码是注释掉的，
-- 活代码只判了「不可重复」。这里按原样移植，是否收紧留给运营决定。
--
-- 前置：物品 2000100 / 2000101 不是原版物品，BeiDou 的 wz 里还没有。
-- 补上 Item.wz/Consume/0200.img 与 String.wz/Consume.img 之前，开这个开关只会发出无名道具。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_quest_hp_pill', 'false', 'use_quest_hp_pill', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_quest_hp_pill');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_quest_hp_pill', '完成不可重复任务时额外发一颗小血液精华（永久+10血上限）；开启前需先补齐物品2000101的wz数据', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_quest_hp_pill');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_quest_hp_pill', 'Grant a small HP pill (permanent +10 max HP) on completing a non-repeatable quest; requires the wz data for item 2000101 first', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_quest_hp_pill');
