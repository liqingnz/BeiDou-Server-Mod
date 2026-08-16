-- 批次 6 · G5：白医卷轴（Clean Slate）的判定规则开关。
--
-- 关闭（原实现）：白医的语义是「找回一次打卷失败掉掉的孔」。判定式是
--   剩余孔 + 已成功次数 < 总孔数(tuc) + Vicious 数
-- 也就是「这件装备失败过」。全新未打的装备用不了，七孔全成功的装备也用不了，
-- 总孔数永远不会超过 tuc。
--
-- 打开（LK 规则）：白医改为「给已经打满的装备额外加一个孔」，判定式只有
--   剩余孔 == 0
-- 反复「白医开孔 → 打卷」可以把同一件装备的总孔数无限叠上去，是产出侧的有意放宽。
-- 上限只剩 upgradeSlots 这个 byte 字段本身的 127（代码里已挡溢出）。
--
-- 两种规则下 tuc 为 0 的装备（本身不可打卷）都拒绝，不会被白医开出第一个孔。
-- LK 另外硬编码了 1122000（黑龙项链）不可白医，那是运营口味不是修 BUG——该装备在
-- v83 数据里 tuc = 3，本来就可打卷——所以没有跟进，要禁哪件装备请单独处理。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_lk_clean_slate', 'true', 'use_lk_clean_slate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_lk_clean_slate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_lk_clean_slate', '白医卷轴改为「给剩余孔为0的装备额外加1个孔」，总孔数可超过装备原有上限；关闭则恢复为「仅找回打卷失败掉的孔」', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_lk_clean_slate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_lk_clean_slate', 'Clean Slate Scrolls grant one extra slot to equips with no slots left, letting total slots exceed the item cap; disable to only recover slots lost to failed scrolls', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_lk_clean_slate');
