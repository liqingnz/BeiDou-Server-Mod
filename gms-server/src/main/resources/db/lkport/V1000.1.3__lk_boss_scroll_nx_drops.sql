-- 批次 7 · 祝福/混沌/点券/血药丸掉落体系（来源 sql/db_LichKingMod.sql
-- 「global drops / event / scrolls / custom drops / PKB」各段，git HEAD 版本）。
--
-- LK 的最终形态（57717d1e 收紧 → fd27266f/cc8ae387 再调）：
--   * 祝福/混沌保留百万分之 5 的全服兜底，主要供给走 BOSS 专属掉落；
--   * PKB（品克缤）额外掉 2–4 个祝福/混沌/5000 点券，带 distinctive 掉落指示；
--   * 250/5000 点券道具、+15 HP 药丸走野外 BOSS 与副本 BOSS 分层；
--   * 六一铅笔、周年帽/蜡烛、龙年勋章等活动物品终止掉落（对 BeiDou 多为无行可删，保留语句以对齐终态）。
-- 执行顺序依赖：distinctive 列由 V1000.1.1 先建。

-- ---------- 全服掉落 ----------
DELETE FROM `drop_data_global` WHERE `itemid` = 2340000;
INSERT INTO `drop_data_global` (`continent`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `comments`) VALUES
(-1, 2340000, 1, 1, 0, 5, '祝福卷轴');
DELETE FROM `drop_data_global` WHERE `itemid` = 2049100;
INSERT INTO `drop_data_global` (`continent`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `comments`) VALUES
(-1, 2049100, 1, 1, 0, 5, '混沌卷轴');

-- 活动物品终止全服掉落
DELETE FROM `drop_data_global` WHERE `itemid` = 4900000;
DELETE FROM `drop_data_global` WHERE `itemid` = 3101000;
DELETE FROM `drop_data_global` WHERE `itemid` = 3101001;

-- 活动物品终止怪物掉落（六一铅笔、龙年勋章（银））
DELETE FROM `drop_data` WHERE `itemid` = 4900000;
DELETE FROM `drop_data` WHERE `itemid` = 3101003;

-- ---------- 祝福 / 混沌 BOSS 掉落 ----------
DELETE FROM `drop_data` WHERE `itemid` = 2340000;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8500002, 2340000, 1, 1, 0, 25000),
(9420544, 2340000, 1, 1, 0, 80000),
(9420549, 2340000, 1, 1, 0, 80000),
(8800002, 2340000, 1, 1, 0, 160000),
(9400300, 2340000, 1, 1, 0, 300000),
(8810018, 2340000, 1, 1, 0, 500000);

DELETE FROM `drop_data` WHERE `itemid` = 2049100;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8500002, 2049100, 1, 1, 0, 25000),
(9420544, 2049100, 1, 1, 0, 80000),
(9420549, 2049100, 1, 1, 0, 80000),
(8800002, 2049100, 1, 1, 0, 160000),
(9400300, 2049100, 1, 1, 0, 300000),
(8810018, 2049100, 1, 1, 0, 500000);

-- 鞋子攻击 60% 卷轴（The Boss 专属）
DELETE FROM `drop_data` WHERE `itemid` = 2040759;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9400300, 2040759, 1, 1, 0, 20500);

-- 手套魔攻 10% 卷轴（LK 6315da27「佳佳加入手套魔力卷轴」）
DELETE FROM `drop_data` WHERE `itemid` = 2040816;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(4230104, 2040816, 1, 1, 0, 300);

-- 3230306 的 2043702 爆率微调
UPDATE `drop_data` SET `chance` = 750 WHERE `dropperid` = 3230306 AND `itemid` = 2043702;

-- ---------- 点券道具 ----------
-- 250 点券（野外 BOSS 层）
DELETE FROM `drop_data` WHERE `itemid` = 4031866;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(4130103, 4031866, 1, 1, 0, 200000),
(5220003, 4031866, 1, 1, 0, 200000),
(6130101, 4031866, 1, 1, 0, 200000),
(6300005, 4031866, 1, 1, 0, 200000),
(6220001, 4031866, 1, 1, 0, 200000),
(7220000, 4031866, 1, 1, 0, 200000),
(7220001, 4031866, 1, 1, 0, 200000),
(7220002, 4031866, 1, 1, 0, 200000),
(8130100, 4031866, 1, 1, 0, 200000),
(8150000, 4031866, 1, 1, 0, 200000),
(9400205, 4031866, 1, 1, 0, 200000),
(6090004, 4031866, 1, 1, 0, 50000),
(8220009, 4031866, 1, 1, 0, 200000),
(8220007, 4031866, 1, 1, 0, 200000),
(8220000, 4031866, 1, 1, 0, 200000),
(8220001, 4031866, 1, 1, 0, 200000),
(8220003, 4031866, 1, 1, 0, 200000),
(8220004, 4031866, 1, 1, 0, 200000),
(8220005, 4031866, 1, 1, 0, 200000),
(8220006, 4031866, 1, 1, 0, 200000),
(9420513, 4031866, 1, 1, 0, 200000),
(9400549, 4031866, 1, 1, 0, 200000),
(8180000, 4031866, 1, 1, 0, 200000),
(8180001, 4031866, 1, 1, 0, 200000),
(8510000, 4031866, 1, 1, 0, 200000),
(8520000, 4031866, 1, 1, 0, 200000),
(9400575, 4031866, 1, 1, 0, 200000),
(9400014, 4031866, 1, 1, 0, 200000),
(9400121, 4031866, 1, 1, 0, 200000);

-- 5000 点券（副本 BOSS 层）
DELETE FROM `drop_data` WHERE `itemid` = 4310100;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8500002, 4310100, 1, 1, 0, 45000),
(9420544, 4310100, 1, 1, 0, 80000),
(9420549, 4310100, 1, 1, 0, 80000),
(8800002, 4310100, 1, 1, 0, 300000),
(8810018, 4310100, 1, 1, 0, 500000);

-- ---------- +15 HP 药丸（血量任务奖励物，distinctive 指示） ----------
DELETE FROM `drop_data` WHERE `itemid` = 2000101;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `distinctive`) VALUES
(4130103, 2000101, 1, 1, 0, 50000, 1),
(5220003, 2000101, 1, 1, 0, 50000, 1),
(6130101, 2000101, 1, 1, 0, 50000, 1),
(6300005, 2000101, 1, 1, 0, 50000, 1),
(6220001, 2000101, 1, 1, 0, 50000, 1),
(7220000, 2000101, 1, 1, 0, 50000, 1),
(7220001, 2000101, 1, 1, 0, 50000, 1),
(7220002, 2000101, 1, 1, 0, 50000, 1),
(8130100, 2000101, 1, 1, 0, 50000, 1),
(8150000, 2000101, 1, 1, 0, 10000, 1),
(9400205, 2000101, 1, 1, 0, 50000, 1),
(6090004, 2000101, 1, 1, 0, 50000, 1),
(8220009, 2000101, 1, 1, 0, 50000, 1),
(8220007, 2000101, 1, 1, 0, 50000, 1),
(8220000, 2000101, 1, 1, 0, 50000, 1),
(8220001, 2000101, 1, 1, 0, 60000, 1),
(8220003, 2000101, 1, 1, 0, 60000, 1),
(8220004, 2000101, 1, 1, 0, 50000, 1),
(8220005, 2000101, 1, 1, 0, 50000, 1),
(8220006, 2000101, 1, 1, 0, 50000, 1),
(9420513, 2000101, 1, 1, 0, 50000, 1),
(8180000, 2000101, 1, 1, 0, 50000, 1),
(8180001, 2000101, 1, 1, 0, 50000, 1),
(8510000, 2000101, 1, 1, 0, 80000, 1),
(8520000, 2000101, 1, 1, 0, 80000, 1),
(9400014, 2000101, 1, 1, 0, 80000, 1),
(9400121, 2000101, 1, 1, 0, 80000, 1),
(9400300, 2000101, 3, 5, 0, 1000000, 1),
(8500002, 2000101, 1, 1, 0, 1000000, 1),
(9420544, 2000101, 1, 3, 0, 1000000, 1),
(9420549, 2000101, 1, 3, 0, 1000000, 1),
(8800002, 2000101, 3, 5, 0, 1000000, 1),
(8810018, 2000101, 6, 8, 0, 1000000, 1),
(8820001, 2000101, 15, 20, 0, 1000000, 1);

-- ---------- PKB（品克缤）专属 ----------
-- 时间之石
DELETE FROM `drop_data` WHERE `itemid` = 4021010;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(8820001, 4021010, 1, 1, 0, 400000);

-- 祝福 / 混沌 / 5000 点券：2–4 个，50%，带掉落指示（LK cc8ae387）
DELETE FROM `drop_data` WHERE `itemid` = 2340000 AND `dropperid` = 8820001;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `distinctive`) VALUES
(8820001, 2340000, 2, 4, 0, 500000, 1);
DELETE FROM `drop_data` WHERE `itemid` = 2049100 AND `dropperid` = 8820001;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `distinctive`) VALUES
(8820001, 2049100, 2, 4, 0, 500000, 1);
DELETE FROM `drop_data` WHERE `itemid` = 4310100 AND `dropperid` = 8820001;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`, `distinctive`) VALUES
(8820001, 4310100, 2, 4, 0, 500000, 1);
