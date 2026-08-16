-- 批次 7 · 反应堆掉落与商店物价调整（来源 sql/db_LichKingMod.sql「reactor」段 +
-- 「fm shop」段的物价部分，git HEAD 版本）。
--
-- 未搬的段落及依据：
--   * fm 商店 9000069 整店重建：BeiDou 基线里 9000069 是按 pitch 计价的另一套商店
--     （V1.0.55，价格 0 / pitch 5–100），与 LK 的金币黑店语义完全不同，且要配合
--     LK 的自由市场 NPC 脚本才有意义——挂起，随批次 7 脚本组一起决策。
--   * 宝藏 PQ 反应堆 6742014 的三条调价（1132008/1132009/1082223）：BeiDou 的
--     reactordrops 里根本没有 6742014（V1.0.65 清理过未用内容），UPDATE 无目标——
--     挂起，随 TreasurePQ 脚本决策，若移植需连底行一起补。

-- 反应堆不再产出混沌卷轴（黑龙远征宝箱 1052001 等；LK 57717d1e 收紧混沌供给）
DELETE FROM `reactordrops` WHERE `itemid` = 2049100;

-- APQ（阿姆利亚组队任务）奖励箱调价。
-- BeiDou 曾在 V1.0.61 自行改过这批值（苹果 15 / 鞋攻 50 / 披风 20 / 拉面 5），
-- 此处按 LK 服的现行经济覆盖（chance 为 1/N 概率，数值越大越稀有）。
-- 范围限定 APQ 奖励箱 6702003–6702012，不波及 V1.0.60 新增的婚礼箱 6802000/6802001。
UPDATE `reactordrops` SET `chance` = 25  WHERE `itemid` = 2022179 AND `reactorid` BETWEEN 6702003 AND 6702012;
UPDATE `reactordrops` SET `chance` = 100 WHERE `itemid` = 2040759 AND `reactorid` BETWEEN 6702003 AND 6702012;
UPDATE `reactordrops` SET `chance` = 30  WHERE `itemid` = 2041037 AND `reactorid` BETWEEN 6702003 AND 6702012;
UPDATE `reactordrops` SET `chance` = 15  WHERE `itemid` = 2022015 AND `reactorid` BETWEEN 6702003 AND 6702012;

-- 新叶城药水调价（LK 68319532「新叶城商店药水价格上升」）
UPDATE `shopitems` SET `price` = 13400 WHERE `itemid` = 2002020;
UPDATE `shopitems` SET `price` = 8000  WHERE `itemid` = 2002021;
UPDATE `shopitems` SET `price` = 9000  WHERE `itemid` = 2002022;
UPDATE `shopitems` SET `price` = 16500 WHERE `itemid` = 2002023;
UPDATE `shopitems` SET `price` = 3000  WHERE `itemid` = 2002024;
UPDATE `shopitems` SET `price` = 1600  WHERE `itemid` = 2002025;

-- 蘑菇特制拉面 / 雪碧调价（LK 30eff1ea「药水价格上调：雪碧改为20W，拉面1W7」）
UPDATE `shopitems` SET `price` = 17600  WHERE `itemid` = 2022015;
UPDATE `shopitems` SET `price` = 200000 WHERE `itemid` = 2022002;
