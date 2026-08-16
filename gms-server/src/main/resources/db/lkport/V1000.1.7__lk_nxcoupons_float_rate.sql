-- 批次 7 · 倍率券 float 化 + 1.5 倍经验/掉落券（来源 db_LichKingMod_patch.sql「coupon」段 +
-- LK 对 Server.couponRates 的 Map<Integer, Float> 改造）。
--
-- LK 只在注释里留了 `ALTER TABLE nxcoupons MODIFY rate float(5)`（手工执行过），
-- 数据行是 (5211900, 1.5, 254, 0, 24) / (5360900, 1.5, 254, 0, 24)。
-- BeiDou 的 rate 列与整条 Java 链（NxcouponsDO / Server.couponRates / Character 券倍率）
-- 均为 int，随本迁移一并 float 化；characterexplogs.exp_coupon 照 V1.5.2 对
-- world_exp_rate 的同款先例一起改 float，否则 1.5 记成 1。
-- 注意：券生效还需商城可购得（specialcashitems/commodity 配置归批次 8 商城组）。

ALTER TABLE `nxcoupons`
    MODIFY COLUMN `rate` FLOAT NOT NULL DEFAULT 0;

ALTER TABLE `characterexplogs`
    MODIFY COLUMN `exp_coupon` FLOAT NULL DEFAULT NULL COMMENT '倍率券倍数';

-- 1.5 倍经验券 / 1.5 倍掉落券，全天有效
DELETE FROM `nxcoupons` WHERE `couponid` = 5211900;
INSERT INTO `nxcoupons` (`couponid`, `rate`, `activeday`, `starthour`, `endhour`) VALUES
(5211900, 1.5, 254, 0, 24);
DELETE FROM `nxcoupons` WHERE `couponid` = 5360900;
INSERT INTO `nxcoupons` (`couponid`, `rate`, `activeday`, `starthour`, `endhour`) VALUES
(5360900, 1.5, 254, 0, 24);
