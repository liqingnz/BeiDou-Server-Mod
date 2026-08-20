-- ----------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：掉落表（drop_data / drop_data_global）
-- ---------------------------------------------------------------------------
--
-- 【R__ = Flyway 可重复迁移】没有版本号，Flyway 每次启动比对本文件的 checksum，
--   内容一变就整份重跑；不变则跳过。迁移期反复调数值就靠这个——改完重启服务端即可，
--   不必新编版本号、不必删库、不必手工执行 SQL。执行时机在所有 V__ 版本化迁移之后，
--   多个 R__ 之间按文件名字典序，所以文件名里的两位数字就是执行顺序。
--
-- 【纪律】本文件必须幂等：任何一条语句重跑都不能改变最终状态。写法只用三种——
--   INSERT ... SELECT ... WHERE NOT EXISTS、先 DELETE 同键再 INSERT、无条件 UPDATE/DELETE。
--   新增内容时照抄这三种之一，不要写裸 INSERT ... VALUES。
--
-- 【取舍】重跑会覆盖运营在 gms-ui 后台对同范围数据的手工改动——迁移期这是有意为之：
--   本文件是这批数据的唯一真源。上线前把所有 R__ 改名成 V1000.3.x（内容不动）即可冻结。
--
-- 【幂等性】全部是无条件 DELETE / UPDATE，或先 DELETE 同键再 INSERT。
-- 【依赖】distinctive 列由 V1000.2.1__lk_schema.sql 建立，版本化迁移先于 R__ 执行。
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- [V1000.1.2] lk_drop_data_fixes.sql
-- ---------------------------------------------------------------------------
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

-- 猫眼石 4031568（LK 1e0978e0「修复猫眼石掉落，改为丁满」）。
--
-- LK 那条「从沙漠毒蝎 2110301 搬到丁满 2100108」在本库里搬不动任何东西：
-- BeiDou 基线压根没有 2110301 掉这件道具的行（沙漠毒蝎的掉落见
-- V1.0.51:634-642），而丁满 2100108 本来就有——V1.0.51:32602 的
-- (2100108, 4031568, 1, 1, 3911, 80000)。也就是说基线早已是 LK 想要的状态。
--
-- 但原写法是「先 DELETE 目标行，再 UPDATE 源行」：DELETE 把基线那条正确的
-- 任务掉落删掉，紧跟的 UPDATE 匹配零行，净结果是白丢一条 questid 3911 的掉落。
-- 第一次跑就丢，不是重跑才丢。且该写法本身不在本文件允许的三种幂等写法之内。
--
-- 改成「缺了就补回、已有就不动」，顺带清掉理论上可能存在的源行。
INSERT INTO `drop_data` (`dropperid`, `itemid`, `minimum_quantity`, `maximum_quantity`, `questid`, `chance`)
SELECT 2100108, 4031568, 1, 1, 3911, 80000
WHERE NOT EXISTS (SELECT 1 FROM `drop_data` WHERE `dropperid` = 2100108 AND `itemid` = 4031568);
DELETE FROM `drop_data` WHERE `dropperid` = 2110301 AND `itemid` = 4031568;

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

-- ---------------------------------------------------------------------------
-- [V1000.1.3] lk_boss_scroll_nx_drops.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · 祝福/混沌/点券/血药丸掉落体系（来源 sql/db_LichKingMod.sql
-- 「global drops / event / scrolls / custom drops / PKB」各段，git HEAD 版本）。
--
-- LK 的最终形态（57717d1e 收紧 → fd27266f/cc8ae387 再调）：
--   * 祝福/混沌保留百万分之 5 的全服兜底，主要供给走 BOSS 专属掉落；
--   * PKB（品克缤）额外掉 2–4 个祝福/混沌/5000 点券，带 distinctive 掉落指示；
--   * 250/5000 点券道具、小血液精华（+10 血上限）走野外 BOSS 与副本 BOSS 分层；
--   * 六一铅笔、周年帽/蜡烛、龙年勋章等活动物品终止掉落（对 BeiDou 多为无行可删，保留语句以对齐终态）。
-- 执行顺序依赖：distinctive 列由 V1000.2.1__lk_schema.sql 先建（见本文件第 18 行）。

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

-- ---------- 小血液精华 2000101（吃掉永久 +10 血上限，法师 +2 血/+8 魔；distinctive 指示） ----------
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

-- ---------------------------------------------------------------------------
-- [V1000.1.4] lk_mastery_book_drops.sql
-- ---------------------------------------------------------------------------
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
