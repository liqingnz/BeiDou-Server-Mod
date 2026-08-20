-- ----------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：制作 / 商店 / 反应堆 / 倍率券
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
-- 【幂等性】先 DELETE 同键再 INSERT。
-- 【依赖】nxcoupons.rate 的 float 化由 V1000.2.1__lk_schema.sql 完成，否则 1.5 会被截成 1。
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- [V1000.1.5] lk_maker_recipes.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- [V1000.1.6] lk_reactor_and_shop_price_tuning.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · 自由市场黑店重建 + 反应堆掉落与商店物价调整
-- （来源 sql/db_LichKingMod.sql「fm shop」「reactor」两段，git HEAD 版本）。
--
-- 未搬的段落及依据：
--   * 宝藏 PQ 反应堆 6742014 的三条调价（1132008/1132009/1082223）：BeiDou 的
--     reactordrops 里根本没有 6742014（V1.0.65 清理过未用内容），UPDATE 无目标——
--     挂起，随 TreasurePQ 脚本决策，若移植需连底行一起补。

-- ---------- 自由市场黑店 9000069 整店重建 ----------
-- 本段原先挂起（记的理由是「与 BeiDou 的 pitch 计价店语义冲突，且要配 LK 自由市场
-- NPC 脚本才有意义」），2026-08-20 复核后落地。复核结论是那条理由只对了一半：
--
--   * 「要配 LK 自由市场 NPC 脚本」不成立：两边都没有 npc/9000069.js，开店走的是
--     NPCTalkHandler 的无脚本兜底（脚本 start() 返回 false → hasShop() → sendShop()）。
--     NPC 9000069（彪鲁 / Inkwell）在 BeiDou 的 wz/Map.wz/Map/Map9/910000000.img.xml
--     life[3] 里就已摆在自由市场（x=97 y=-332 fh=108，wz-zh-CN 无同名文件不覆盖），
--     shops 表的 (9000069, 9000069) 也早在 V1.0.56 里。零 wz、零脚本依赖，改本表即生效。
--   * 「pitch 语义冲突」成立，而且比原先记的更重：V1.0.55 给 9000069 配的 9 行是
--     全库唯一一家按绝对音感（ETC 4310000）计价的店（price=0 / pitch 5–100）。
--     照 LK 整店重建就要连它一起删，**绝对音感从此没有任何消耗出口**，而 BeiDou 自己的
--     scripts-zh-CN/BeiDouSpecial/{在线奖励_nextlevel,道具抽奖,物品兑换}.js 仍在发放它。
--     这是运营侧 2026-08-20 拍板接受的取舍，不是漏项；将来要给绝对音感补出口，
--     另挑一个 NPC 重建那 9 行即可（原始数据见 V1.0.55 的 shopitemid 6533–6541）。
--
-- 价格取 git HEAD 值。LK 工作区里另有一份未提交的降价（混沌/祝福/洗能力点各 100 万、
-- 高级瞬移之石 10 万），按 lichkingmod-port.md §1.1「只以 git 历史为准，8 个未提交改动
-- 不纳入」不采纳。position 沿用 LK 的 996–1012（Shop.java 按 position DESC 取货）。
DELETE FROM `shopitems` WHERE `shopid` = 9000069;
INSERT INTO `shopitems` (`shopid`, `itemid`, `price`, `pitch`, `position`) VALUES
(9000069, 2049100, 300000000, 0, 996),  -- 混沌卷轴60%
(9000069, 2340000, 300000000, 0, 999),  -- 祝福卷轴
(9000069, 5050000, 20000000, 0, 1004),  -- 洗能力点卷轴
(9000069, 5041000, 5000000, 0, 1008),   -- 高级瞬移之石（另一出口 shop 1338 由下方 UPDATE 一并拉到同价）
(9000069, 5090000, 100000, 0, 1012);    -- 消息（喇叭）

-- 高级瞬移之石的另一个出口对齐到同价：shop 1338（NPC 9090000「妙妙」）原价 150 万。
-- 那不是常驻店，是便携商店道具「包裹商人妙妙」（cash 5450000/5451000，itemType 545）
-- 用一次开一次，所以两处并不直接竞争；2026-08-20 运营决定仍统一到 500 万，免得同一件
-- 道具在两个入口差 3.3 倍。**本行不是 LK 移植内容**，LK 从未动过 shop 1338，是本地定价决定。
-- 限定 shopid，不用裸 itemid 条件——将来别的店若也卖这件道具，不该被这条顺手改掉。
UPDATE `shopitems` SET `price` = 5000000 WHERE `shopid` = 1338 AND `itemid` = 5041000;

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

-- ---------------------------------------------------------------------------
-- [V1000.1.7] lk_nxcoupons_rows.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · 倍率券数据行（列的 float 化见 V1000.2.1__lk_schema.sql）。
-- 1.5 倍经验券 / 1.5 倍掉落券，全天有效
DELETE FROM `nxcoupons` WHERE `couponid` = 5211900;
INSERT INTO `nxcoupons` (`couponid`, `rate`, `activeday`, `starthour`, `endhour`) VALUES
(5211900, 1.5, 254, 0, 24);
DELETE FROM `nxcoupons` WHERE `couponid` = 5360900;
INSERT INTO `nxcoupons` (`couponid`, `rate`, `activeday`, `starthour`, `endhour`) VALUES
(5360900, 1.5, 254, 0, 24);

-- ---------------------------------------------------------------------------
-- [本地] 商店负价差修复 —— 非 LK 移植内容
-- ---------------------------------------------------------------------------
-- 2026-08-20 拿 shopitems 全表（4394 行）对照 wz 的 info/price 扫了一遍买价/卖价，
-- 海星镖 2070000 是唯一一件普通玩家够得到的负价差商品：34 家常规商店一律标价 500，
-- 卖回 NPC 却得 750。其余 87 条负价差全在 GM 商店（1337 / 9999994 / 9999999）里，
-- 那三家由 scripts-zh-CN/BeiDouSpecial/GM商店.js 开，入口 npc/9100001.js 有 GM 职业校验，
-- 另行处理，不在本行范围内。
--
-- 750 的来历：飞镖/子弹属充值类，Shop.buy 对这类按 price × quantity 校验金币、
-- 却只扣一次 price 并直接塞满一整叠（server/Shop.java:105-115）；卖出走
-- ItemInformationProvider.getPrice() = info/price + ceil(quantity × info/unitPrice)
-- = 250 + ceil(500 × 1) = 750。买 500 卖 750，每轮净赚 250，可无限循环。
--
-- 取 800：只比 750 高 6.7%，比同类充值品里倍率最低的子弹（店价 600 / 卖价 500 ≈ 1.2x）
-- 还保守（冰菱 ≈ 1.5x、齿轮镖 ≈ 9.6x），刻意只取刚够越过 750 的档位——海星镖是最低级飞镖，
-- 抬太高会直接压到暗器前期的弹药成本。
--
-- 为什么不按「把出售价压到 1」那条思路走：750 完全出自 wz
-- （wz/Item.wz/Consume/0207.img.xml 的 info/price 与 info/unitPrice），SQL 够不着；
-- 且 unitPrice 同时是补镖单价（Shop.java:264 算补货费、PacketCreator.java:2416 发给客户端），
-- 归 0 会让补镖变免费，还要连带打客户端 img 补丁。2026-08-20 决定只动店价。
--
-- 【故意不限定 shopid】与上面 5041000 那条相反：那条只该影响一家店；这条要覆盖全部 34 家，
-- 而且今后任何新店卖海星镖也必须 ≥ 750，否则套利立刻重现。
UPDATE `shopitems` SET `price` = 800 WHERE `itemid` = 2070000;

-- 【挂起】同批扫描还查出测谎仪 2190000 在 shop 9900001（NPC 昨日小睡，地图 180000000）
-- 标价 200、卖回 9500，是普通可叠加消耗品，单件净赚 9300，比海星镖严重得多。
-- 2026-08-20 决定本批只修海星镖，这条单独再议。
