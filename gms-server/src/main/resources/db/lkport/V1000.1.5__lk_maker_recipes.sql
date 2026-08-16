-- 批次 7 · 制作系统配方调整（来源 sql/db_LichKingMod.sql「maker data」段，git HEAD 版本）。
--
-- LK 6315da27「中等强化宝石可以直接从矿石合成，不需要先合成下等宝石」：
-- 原版链条是 1 矿石 → 下级宝石，10 下级 → 中级；LK 把 14 种中级强化宝石改为
-- 直接消耗 10 个对应矿石/晶体。BeiDou V1.0.53 仍是原版链条（(4250001, 4250000, 10) 等），确认未修过。
-- 下级宝石配方与高级宝石配方（10 中级 → 高级）不动。

DELETE FROM `makerrecipedata` WHERE `itemid` = 4250001;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250001, 4021007, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250101;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250101, 4021005, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250201;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250201, 4021000, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250301;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250301, 4021004, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250401;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250401, 4021001, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250501;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250501, 4021002, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250601;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250601, 4021006, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250701;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250701, 4021003, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250801;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250801, 4005000, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4250901;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4250901, 4005001, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4251001;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4251001, 4005003, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4251101;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4251101, 4005002, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4251301;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4251301, 4021008, 10);
DELETE FROM `makerrecipedata` WHERE `itemid` = 4251401;
INSERT IGNORE INTO `makerrecipedata` (`itemid`, `req_item`, `count`) VALUES (4251401, 4005004, 10);
