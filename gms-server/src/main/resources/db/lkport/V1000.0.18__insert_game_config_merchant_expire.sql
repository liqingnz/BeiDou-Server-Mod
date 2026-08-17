-- 批次 6 · G13：雇佣商店存续天数。
--
-- 计数器在 World.runHiredMerchantSchedule 里每 10 分钟加 1（HiredMerchantTask 的注册周期），
-- 144 跳 = 24 小时，所以这个键的单位是「天」。原版写死 144，即 1 天。
--
-- 两处代码都读这个键，且都对「配置缺失（getServerInt 返回 0）」回落到 1：
--   · World.runHiredMerchantSchedule —— 到期强关。缺兜底的话 0 * 144 = 0，
--     商店会在第二个 10 分钟跳就被 forceClose，等于全服商店 10 分钟暴毙。
--   · HiredMerchant.getTimeOpen      —— 店主界面的已开时长。客户端这一格只按 1 天量程渲染，
--     所以把已开时长整体前移 (天数-1) 天，多出来的存续期才能在界面上表达出来。
--     该值以 short 出包，配到 13 天以上会溢出，代码里已钳在 Short.MAX_VALUE。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'merchant_expire_time', '3', 'merchant_expire_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'merchant_expire_time', '雇佣商店摆摊后自动关闭前的存续天数，原版为1天；超过13天店主界面的时长显示会失真', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'merchant_expire_time', 'Days a hired merchant stays up before it is force-closed; vanilla is 1. Above 13 days the owner-side time display saturates', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'merchant_expire_time');
