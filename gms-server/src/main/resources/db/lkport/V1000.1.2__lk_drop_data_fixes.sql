-- 批次 7 · LK 掉落修正（来源 sql/db_LichKingMod_patch.sql「drop fixes / saga / Singapore / fixes」各段，
-- 取 git HEAD 版本，工作区未提交改动不纳入）。
--
-- 未搬的段落及依据：
--   * 中国/少林掉落（9600008–9600026）：BeiDou V1.7.3 东方神舟数据每只怪 21–73 行，
--     远比 LK 的 6–13 行完整，整段 rejected。唯一例外记号：LK 清空了 9600026（妖僧分身）
--     的掉落防复制刷宝，BeiDou 保留 60 行——是否跟进等 YaoSeng 脚本组一并决策。
--   * 4 张建表：login_history / message_board 批次 2、4 已建；monsterBookReward 是死表不建；
--     royalAccounts 归批次 8。
--   * ALTER ... CONVERT TO CHARACTER SET gbk 全套 + characters.name 改 gbk：终局 rejected（§8，BeiDou 全程 utf8mb4）。
--   * bosslog_daily/weekly MODIFY bosstype：批次 6 V1000.0.14 已用 VARCHAR(32) 做过，且方案更优。
--   * 实验室怪 9300141–9300154 的 DELETE 范围修正（db_drops.sql 仅有的 2 行 diff）：
--     BeiDou V1.0.51 里那段 DELETE 本来就被注释掉了，already-fixed。
--   * nxcoupons 1.5 倍经验/掉落券：BeiDou 的 rate 列与 Java 侧（NxcouponsDO / Server.couponRates）
--     均为 int，LK 已改 float——数据行随批次 7 Java 组的 float 化一起搬，此处不插会被截断的行。

-- 万圣节糖果停止全服掉落（LK bdcc003e）
DELETE FROM `drop_data` WHERE `itemid` = 4031203;

-- 月石不再由 9400638 掉落
DELETE FROM `drop_data` WHERE `dropperid` = 9400638 AND `itemid` = 4011007;

-- 移除祖母绿头盔 2/3 级掉落
DELETE FROM `drop_data` WHERE `itemid` = 1002390;
DELETE FROM `drop_data` WHERE `itemid` = 1002430;

-- 扎昆头盔 100% 掉落（LK 1e0978e0「修改扎昆头盔100%掉落」）
UPDATE `drop_data` SET `chance` = 1000000 WHERE `itemid` = 1002357;

-- 4001107 绑定任务 6130，避免非任务期捡取
UPDATE `drop_data` SET `questid` = 6130 WHERE `itemid` = 4001107;

-- 项链 / 钥匙爆率调整
UPDATE `drop_data` SET `chance` = 230000 WHERE `itemid` = 1122000;
UPDATE `drop_data` SET `chance` = 300000 WHERE `itemid` = 4001007;

-- 幽灵船飞镖掉落改为可充值品种（LK 4dc346e6「调整幽灵船飞镖掉落」）
UPDATE `drop_data` SET `itemid` = 2070003 WHERE `dropperid` = 9420511 AND `itemid` = 2070005;
UPDATE `drop_data` SET `itemid` = 2070002 WHERE `dropperid` = 9420509 AND `itemid` = 2070004;

-- 两个精英怪的卷轴爆率下调
UPDATE `drop_data` SET `chance` = 750 WHERE `dropperid` = 9400639 AND `itemid` = 2040602;
UPDATE `drop_data` SET `chance` = 750 WHERE `dropperid` = 9400640 AND `itemid` = 2043700;

-- 猫眼石改由丁满掉落（LK 1e0978e0「修复猫眼石掉落，改为丁满」）。
-- drop_data 有 UNIQUE(dropperid, itemid)，先清目标行防止 UPDATE 撞唯一键。
DELETE FROM `drop_data` WHERE `dropperid` = 2100108 AND `itemid` = 4031568;
UPDATE `drop_data` SET `dropperid` = 2100108 WHERE `dropperid` = 2110301 AND `itemid` = 4031568;

-- 魔力控制装置（遗弃研究室的哈闷 9300141）：BeiDou 基线本有 1 个 @10%，
-- LK 调成 1–10 个 @5%（LK 9cb7af7f），按 LK 现值覆盖
DELETE FROM `drop_data` WHERE `itemid` = 4031698;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9300141, 4031698, 1, 10, 0, 50000);

-- 上衣制作促进剂 4130019 掉落表重建（LK d0224b3a「修复不掉落上衣促进剂的BUG」）
DELETE FROM `drop_data` WHERE `itemid` = 4130019;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(3110101, 4130019, 1, 1, 0, 6000),
(3110102, 4130019, 1, 1, 0, 6000),
(3230103, 4130019, 1, 1, 0, 6000),
(3230306, 4130019, 1, 1, 0, 6000),
(4130100, 4130019, 1, 1, 0, 6000),
(4230105, 4130019, 1, 1, 0, 6000),
(4230118, 4130019, 1, 1, 0, 6000),
(4230123, 4130019, 1, 1, 0, 6000),
(4230201, 4130019, 1, 1, 0, 6000),
(4230506, 4130019, 1, 1, 0, 6000),
(4230600, 4130019, 1, 1, 0, 6000),
(5100000, 4130019, 1, 1, 0, 6000),
(5100002, 4130019, 1, 1, 0, 6000),
(5120504, 4130019, 1, 1, 0, 6000),
(5150000, 4130019, 1, 1, 0, 6000),
(5300001, 4130019, 1, 1, 0, 6000),
(6110301, 4130019, 1, 1, 0, 6000),
(6230400, 4130019, 1, 1, 0, 6000),
(6230500, 4130019, 1, 1, 0, 6000),
(7130300, 4130019, 1, 1, 0, 6000),
(7130401, 4130019, 1, 1, 0, 6000),
(7130402, 4130019, 1, 1, 0, 6000),
(8140000, 4130019, 1, 1, 0, 6000),
(8140701, 4130019, 1, 1, 0, 6000),
(8141000, 4130019, 1, 1, 0, 6000),
(8150100, 4130019, 1, 1, 0, 6000),
(8150301, 4130019, 1, 1, 0, 6000),
(8190004, 4130019, 1, 1, 0, 6000),
(8200006, 4130019, 1, 1, 0, 6000);

-- 马来西亚双 BOSS 的 saga 物品（剑/盾耳环、灵草、原浆）。
-- 注意：BeiDou 基线 V1.0.51 末尾刻意删光了 1032030（剑耳环）的常规掉落，此处按 LK 恢复为 BOSS 专属。
DELETE FROM `drop_data` WHERE `itemid` = 1032030 AND (`dropperid` = 9420544 OR `dropperid` = 9420549);
DELETE FROM `drop_data` WHERE `itemid` = 1032070 AND (`dropperid` = 9420544 OR `dropperid` = 9420549);
DELETE FROM `drop_data` WHERE `itemid` = 2022306 AND (`dropperid` = 9420544 OR `dropperid` = 9420549);
DELETE FROM `drop_data` WHERE `itemid` = 2022307 AND (`dropperid` = 9420544 OR `dropperid` = 9420549);
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9420544, 1032030, 1, 1, 0, 10000),
(9420544, 1032070, 1, 1, 0, 20000),
(9420544, 2022306, 1, 1, 0, 20000),
(9420544, 2022307, 1, 1, 0, 20000),
(9420549, 1032030, 1, 1, 0, 10000),
(9420549, 1032070, 1, 1, 0, 20000),
(9420549, 2022306, 1, 1, 0, 20000),
(9420549, 2022307, 1, 1, 0, 20000);

-- 新加坡怪物卡任务物品（Berserkie 等 6 种 + Krexel 项链）
DELETE FROM `drop_data` WHERE `itemid` = 4000429;
DELETE FROM `drop_data` WHERE `itemid` = 4000430;
DELETE FROM `drop_data` WHERE `itemid` = 4000431;
DELETE FROM `drop_data` WHERE `itemid` = 4000432;
DELETE FROM `drop_data` WHERE `itemid` = 4000433;
DELETE FROM `drop_data` WHERE `itemid` = 4000434;
DELETE FROM `drop_data` WHERE `itemid` = 1112593;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9420514, 4000429, 1, 1, 0, 300000),
(9420515, 4000430, 1, 1, 0, 300000),
(9420516, 4000431, 1, 1, 0, 300000),
(9420517, 4000432, 1, 1, 0, 300000),
(9420518, 4000433, 1, 1, 0, 300000),
(9420519, 4000434, 1, 1, 0, 300000),
(9420522, 1112593, 1, 1, 0, 500000);

-- Berserkie 补金币掉落（patch「fixes」段）
DELETE FROM `drop_data` WHERE `dropperid` = 9420514 AND `itemid` = 0;
INSERT IGNORE INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`) VALUES
(9420514, 0, 700, 1000, 0, 400000);
