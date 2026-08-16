-- 批次 7 · 技能书掉落重构（来源 sql/db_LichKingMod.sql「mastery book」段，git HEAD 版本）。
--
-- LK 的技能书经济学（6036fe0a「调整技能书获取」→ 6315da27 → 9716cadf「move most wanted
-- skill books to Horntail」最终态）：热门 20/30 技能书从野怪散布改为 BOSS 定点产出
-- （黑龙 8810018 / PKB 8820001 / 扎昆 8800002 / 大头头 9400300 / 蝎蕾妮 8500002 /
-- 马来双 BOSS 9420544、9420549 / 皇陵四将 8220003-8220006 / 帕先生 8180001 等）。
-- 每条先删该书全部旧掉落再插 BOSS 行，幂等。

-- 枫叶祝福 30 / 20
DELETE FROM `drop_data` WHERE `itemid` = 2290125;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8820001, 2290125, 1, 1, 0, 20000);
DELETE FROM `drop_data` WHERE `itemid` = 2290096;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8810018, 2290096, 1, 1, 0, 17000);

-- 战神 净化/巨浪 (overswing)
DELETE FROM `drop_data` WHERE `itemid` = 2290126;
DELETE FROM `drop_data` WHERE `itemid` = 2290127;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8800002, 2290126, 1, 1, 0, 20000),
(8510000, 2290126, 1, 1, 0, 15000),
(8810018, 2290127, 1, 1, 0, 20000);

-- 战神 高级熟练 (high mastery)
DELETE FROM `drop_data` WHERE `itemid` = 2290128;
DELETE FROM `drop_data` WHERE `itemid` = 2290129;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8800002, 2290128, 1, 1, 0, 20000),
(8520000, 2290128, 1, 1, 0, 15000),
(8810018, 2290129, 1, 1, 0, 20000),
(8820001, 2290129, 1, 1, 0, 30000);

-- 战神 终极一击 (final blow)；顺带移除 8190003 的技能书 2280013
DELETE FROM `drop_data` WHERE `itemid` = 2280013 AND `dropperid` = 8190003;
DELETE FROM `drop_data` WHERE `itemid` = 2290132;
DELETE FROM `drop_data` WHERE `itemid` = 2290133;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9420544, 2290132, 1, 1, 0, 20000),
(8180001, 2290132, 1, 1, 0, 10000),
(8810018, 2290133, 1, 1, 0, 20000),
(8820001, 2290133, 1, 1, 0, 30000);

-- 战神 连环风暴/障壁 (Combo Tempest / Barrier)
DELETE FROM `drop_data` WHERE `itemid` = 2290137;
DELETE FROM `drop_data` WHERE `itemid` = 2290139;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8810018, 2290137, 1, 1, 0, 30000),
(8810018, 2290139, 1, 1, 0, 30000);

-- 圣骑士 圣光 (Holy Charge)
DELETE FROM `drop_data` WHERE `itemid` = 2290018;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8220003, 2290018, 1, 1, 0, 15000),
(8820001, 2290018, 1, 1, 0, 30000);

-- 圣骑士 冲击波 (blast)
DELETE FROM `drop_data` WHERE `itemid` = 2290012;
DELETE FROM `drop_data` WHERE `itemid` = 2290013;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8220004, 2290012, 1, 1, 0, 15000),
(8220006, 2290013, 1, 1, 0, 15000),
(8820001, 2290013, 1, 1, 0, 30000);

-- 稳如泰山 30 (Power Stance)
DELETE FROM `drop_data` WHERE `itemid` = 2290007;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9420544, 2290007, 1, 1, 0, 20000),
(9420549, 2290007, 1, 1, 0, 20000),
(8820001, 2290007, 1, 1, 0, 30000);

-- 主教 创世 20 / 30 (Genesis)
DELETE FROM `drop_data` WHERE `itemid` = 2290048;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8800002, 2290048, 1, 1, 0, 10000),
(9420544, 2290048, 1, 1, 0, 15000),
(8820001, 2290048, 1, 1, 0, 20000);
DELETE FROM `drop_data` WHERE `itemid` = 2290049;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290049, 1, 1, 0, 15000),
(8810018, 2290049, 1, 1, 0, 30000);

-- 冰雷 冰咆哮 20 / 30 (Blizzard)
DELETE FROM `drop_data` WHERE `itemid` = 2290046;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8500002, 2290046, 1, 1, 0, 15000),
(9420549, 2290046, 1, 1, 0, 20000),
(8820001, 2290046, 1, 1, 0, 30000);
DELETE FROM `drop_data` WHERE `itemid` = 2290047;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290047, 1, 1, 0, 15000),
(8810018, 2290047, 1, 1, 0, 30000);

-- 火毒 天降星落 20 / 30 (Meteor Shower)
DELETE FROM `drop_data` WHERE `itemid` = 2290040;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8800002, 2290040, 1, 1, 0, 20000),
(8820001, 2290040, 1, 1, 0, 30000);
DELETE FROM `drop_data` WHERE `itemid` = 2290041;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290041, 1, 1, 0, 15000),
(8810018, 2290041, 1, 1, 0, 30000);

-- 火毒 落霞术 30 (Paralyze)
DELETE FROM `drop_data` WHERE `itemid` = 2290031;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290031, 1, 1, 0, 15000),
(8810018, 2290031, 1, 1, 0, 30000),
(8820001, 2290031, 1, 1, 0, 30000);

-- 英雄 轻舞飞扬 30 (Brandish)
DELETE FROM `drop_data` WHERE `itemid` = 2290011;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290011, 1, 1, 0, 15000),
(8810018, 2290011, 1, 1, 0, 30000);

-- 黑骑士 狂暴 30 (Berserk)
DELETE FROM `drop_data` WHERE `itemid` = 2290023;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2290023, 1, 1, 0, 15000),
(8810018, 2290023, 1, 1, 0, 30000),
(8820001, 2290023, 1, 1, 0, 40000);

-- 隐士 三连镖 30 (Triple Throw)
DELETE FROM `drop_data` WHERE `itemid` = 2290085;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8810018, 2290085, 1, 1, 0, 30000),
(8820001, 2290085, 1, 1, 0, 30000);
