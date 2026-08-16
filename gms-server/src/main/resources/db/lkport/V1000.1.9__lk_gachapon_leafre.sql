-- 批次 7 · 神木村扭蛋机（来源 LichKingMod cd0660a5「Added gachapon to Leafre and El Nath」）。
--
-- LK 是按 mapId 取奖池，所以他们把神木村地图里的 9200000 换成 9100100 就完事；
-- BeiDou 按 npcId 取奖池，照搬会让神木村抽出射手村的池子，而且平白删掉一个 NPC。
-- 这里改用 Npc.wz 里已有资源、但没有任何地图放置的 9100111（String.wz 双层已有名字），
-- 在 wz/Map.wz/Map/Map2/240000000.img.xml 新增一条 life，不动 9200000。
--
-- 奖池 ID 不写死：种子的 AUTO_INCREMENT 是 37，但运营可能已经在 gms-ui 里建过奖池，
-- 所以用 LAST_INSERT_ID() 取回真实 ID。
--
-- 公共奖品（原 Global 池）在 V1.4.0 的种子里是合并进每个城镇池的，这里同样合并：
-- 直接从 12 个既有同档池里取「12 个池都有」的道具，跟着 V1000.1.8 的调整结果走，
-- 不再另抄一份公共奖品清单。
--
-- 档位权重与喇叭通知沿用种子的约定：普通 9000 / 稀有 800 / 传奇 200，只有传奇档播报。

-- ---------------------------------------------------------------- 普通档
INSERT INTO `gachapon_reward_pool` (`name`, `gachapon_id`, `weight`, `is_public`, `prob`, `start_time`, `end_time`, `notification`, `comment`)
VALUES ('神木村(普通)', 9100111, 9000, 0, 0, NOW(), NULL, 0, 'LK');
SET @pool_id = LAST_INSERT_ID();
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES
  (@pool_id, 2041012, 1, NOW(), 'LK'), (@pool_id, 2048003, 1, NOW(), 'LK'), (@pool_id, 2043800, 1, NOW(), 'LK'), (@pool_id, 2043301, 1, NOW(), 'LK'), (@pool_id, 2040301, 1, NOW(), 'LK'), (@pool_id, 2043101, 1, NOW(), 'LK'), (@pool_id, 2043201, 1, NOW(), 'LK'), (@pool_id, 2043001, 1, NOW(), 'LK'), (@pool_id, 2044301, 1, NOW(), 'LK'), (@pool_id, 2043801, 1, NOW(), 'LK'),
  (@pool_id, 2044201, 1, NOW(), 'LK'), (@pool_id, 2043701, 1, NOW(), 'LK'), (@pool_id, 2044502, 1, NOW(), 'LK'), (@pool_id, 2041011, 1, NOW(), 'LK'), (@pool_id, 2041014, 1, NOW(), 'LK'), (@pool_id, 2044602, 1, NOW(), 'LK'), (@pool_id, 2043302, 1, NOW(), 'LK'), (@pool_id, 2043202, 1, NOW(), 'LK'), (@pool_id, 2043002, 1, NOW(), 'LK'), (@pool_id, 2048005, 1, NOW(), 'LK'),
  (@pool_id, 2044402, 1, NOW(), 'LK'), (@pool_id, 2044302, 1, NOW(), 'LK'), (@pool_id, 2043802, 1, NOW(), 'LK'), (@pool_id, 2044102, 1, NOW(), 'LK'), (@pool_id, 2044202, 1, NOW(), 'LK'), (@pool_id, 2043702, 1, NOW(), 'LK'), (@pool_id, 2044812, 1, NOW(), 'LK'), (@pool_id, 2000004, 1, NOW(), 'LK'), (@pool_id, 2000005, 1, NOW(), 'LK'), (@pool_id, 1402010, 1, NOW(), 'LK'),
  (@pool_id, 1032003, 1, NOW(), 'LK'), (@pool_id, 1442013, 1, NOW(), 'LK'), (@pool_id, 1432009, 1, NOW(), 'LK'), (@pool_id, 1302022, 1, NOW(), 'LK'), (@pool_id, 1302029, 1, NOW(), 'LK'), (@pool_id, 1322021, 1, NOW(), 'LK'), (@pool_id, 1302026, 1, NOW(), 'LK'), (@pool_id, 1442017, 1, NOW(), 'LK'), (@pool_id, 1322023, 1, NOW(), 'LK'), (@pool_id, 1102011, 1, NOW(), 'LK'),
  (@pool_id, 1032008, 1, NOW(), 'LK'), (@pool_id, 1322026, 1, NOW(), 'LK'), (@pool_id, 1442016, 1, NOW(), 'LK'), (@pool_id, 1312000, 1, NOW(), 'LK'), (@pool_id, 1032007, 1, NOW(), 'LK'), (@pool_id, 1322025, 1, NOW(), 'LK'), (@pool_id, 1322027, 1, NOW(), 'LK'), (@pool_id, 1032020, 1, NOW(), 'LK'), (@pool_id, 1442015, 1, NOW(), 'LK'), (@pool_id, 1432017, 1, NOW(), 'LK'),
  (@pool_id, 1302027, 1, NOW(), 'LK'), (@pool_id, 1302049, 1, NOW(), 'LK'), (@pool_id, 1372006, 1, NOW(), 'LK'), (@pool_id, 1032022, 1, NOW(), 'LK'), (@pool_id, 1032021, 1, NOW(), 'LK'), (@pool_id, 1372004, 1, NOW(), 'LK'), (@pool_id, 1332020, 1, NOW(), 'LK'), (@pool_id, 1322007, 1, NOW(), 'LK'), (@pool_id, 1032006, 1, NOW(), 'LK'), (@pool_id, 1302028, 1, NOW(), 'LK'),
  (@pool_id, 1322003, 1, NOW(), 'LK'), (@pool_id, 1302007, 1, NOW(), 'LK'), (@pool_id, 1092030, 1, NOW(), 'LK'), (@pool_id, 1302021, 1, NOW(), 'LK'), (@pool_id, 1322024, 1, NOW(), 'LK'), (@pool_id, 1322012, 1, NOW(), 'LK'), (@pool_id, 1032005, 1, NOW(), 'LK'), (@pool_id, 1322022, 1, NOW(), 'LK'), (@pool_id, 1032013, 1, NOW(), 'LK'), (@pool_id, 1302025, 1, NOW(), 'LK'),
  (@pool_id, 1302013, 1, NOW(), 'LK'), (@pool_id, 1032017, 1, NOW(), 'LK'), (@pool_id, 1032002, 1, NOW(), 'LK'), (@pool_id, 1032001, 1, NOW(), 'LK'), (@pool_id, 1302017, 1, NOW(), 'LK'), (@pool_id, 1442012, 1, NOW(), 'LK'), (@pool_id, 1302000, 1, NOW(), 'LK'), (@pool_id, 1032000, 1, NOW(), 'LK'), (@pool_id, 1102013, 1, NOW(), 'LK'), (@pool_id, 1442022, 1, NOW(), 'LK'),
  (@pool_id, 1372005, 1, NOW(), 'LK'), (@pool_id, 1442021, 1, NOW(), 'LK'), (@pool_id, 1032009, 1, NOW(), 'LK'), (@pool_id, 1302016, 1, NOW(), 'LK'), (@pool_id, 1442003, 1, NOW(), 'LK'), (@pool_id, 1312007, 1, NOW(), 'LK'), (@pool_id, 1402008, 1, NOW(), 'LK'), (@pool_id, 1312008, 1, NOW(), 'LK'), (@pool_id, 1412008, 1, NOW(), 'LK'), (@pool_id, 1442009, 1, NOW(), 'LK'),
  (@pool_id, 1302004, 1, NOW(), 'LK'), (@pool_id, 1312006, 1, NOW(), 'LK'), (@pool_id, 1402012, 1, NOW(), 'LK'), (@pool_id, 1302003, 1, NOW(), 'LK'), (@pool_id, 1312005, 1, NOW(), 'LK'), (@pool_id, 1432002, 1, NOW(), 'LK'), (@pool_id, 1432001, 1, NOW(), 'LK'), (@pool_id, 1302008, 1, NOW(), 'LK'), (@pool_id, 1040030, 1, NOW(), 'LK'), (@pool_id, 1402015, 1, NOW(), 'LK'),
  (@pool_id, 1322015, 1, NOW(), 'LK'), (@pool_id, 1432006, 1, NOW(), 'LK'), (@pool_id, 1322002, 1, NOW(), 'LK'), (@pool_id, 1302010, 1, NOW(), 'LK'), (@pool_id, 1322017, 1, NOW(), 'LK'), (@pool_id, 1402003, 1, NOW(), 'LK'), (@pool_id, 1402006, 1, NOW(), 'LK'), (@pool_id, 1322000, 1, NOW(), 'LK'), (@pool_id, 1422001, 1, NOW(), 'LK'), (@pool_id, 1442001, 1, NOW(), 'LK'),
  (@pool_id, 1422004, 1, NOW(), 'LK'), (@pool_id, 1412004, 1, NOW(), 'LK'), (@pool_id, 1322009, 1, NOW(), 'LK'), (@pool_id, 1322011, 1, NOW(), 'LK'), (@pool_id, 1442000, 1, NOW(), 'LK'), (@pool_id, 1412005, 1, NOW(), 'LK'), (@pool_id, 1402002, 1, NOW(), 'LK'), (@pool_id, 1432004, 1, NOW(), 'LK'), (@pool_id, 1442010, 1, NOW(), 'LK'), (@pool_id, 1422008, 1, NOW(), 'LK'),
  (@pool_id, 1442007, 1, NOW(), 'LK'), (@pool_id, 1422009, 1, NOW(), 'LK'), (@pool_id, 1322019, 1, NOW(), 'LK'), (@pool_id, 1412003, 1, NOW(), 'LK'), (@pool_id, 1412007, 1, NOW(), 'LK'), (@pool_id, 1302009, 1, NOW(), 'LK'), (@pool_id, 1412000, 1, NOW(), 'LK'), (@pool_id, 1322014, 1, NOW(), 'LK'), (@pool_id, 1402001, 1, NOW(), 'LK'), (@pool_id, 1402007, 1, NOW(), 'LK'),
  (@pool_id, 1432005, 1, NOW(), 'LK'), (@pool_id, 1382001, 1, NOW(), 'LK'), (@pool_id, 1372007, 1, NOW(), 'LK'), (@pool_id, 1382010, 1, NOW(), 'LK'), (@pool_id, 1382007, 1, NOW(), 'LK'), (@pool_id, 1372000, 1, NOW(), 'LK'), (@pool_id, 1372003, 1, NOW(), 'LK'), (@pool_id, 1382011, 1, NOW(), 'LK'), (@pool_id, 1382006, 1, NOW(), 'LK'), (@pool_id, 1382000, 1, NOW(), 'LK'),
  (@pool_id, 1452004, 1, NOW(), 'LK'), (@pool_id, 1452000, 1, NOW(), 'LK'), (@pool_id, 1452010, 1, NOW(), 'LK'), (@pool_id, 1452015, 1, NOW(), 'LK'), (@pool_id, 1452014, 1, NOW(), 'LK'), (@pool_id, 1462012, 1, NOW(), 'LK'), (@pool_id, 1462010, 1, NOW(), 'LK'), (@pool_id, 1452017, 1, NOW(), 'LK'), (@pool_id, 1462000, 1, NOW(), 'LK'), (@pool_id, 1452008, 1, NOW(), 'LK'),
  (@pool_id, 1452006, 1, NOW(), 'LK'), (@pool_id, 1462006, 1, NOW(), 'LK'), (@pool_id, 1452007, 1, NOW(), 'LK'), (@pool_id, 1452002, 1, NOW(), 'LK'), (@pool_id, 1472006, 1, NOW(), 'LK'), (@pool_id, 1472010, 1, NOW(), 'LK'), (@pool_id, 1332022, 1, NOW(), 'LK'), (@pool_id, 1332011, 1, NOW(), 'LK'), (@pool_id, 1472015, 1, NOW(), 'LK'), (@pool_id, 1472016, 1, NOW(), 'LK'),
  (@pool_id, 1472023, 1, NOW(), 'LK'), (@pool_id, 1472028, 1, NOW(), 'LK'), (@pool_id, 1472022, 1, NOW(), 'LK'), (@pool_id, 1472011, 1, NOW(), 'LK'), (@pool_id, 1472026, 1, NOW(), 'LK'), (@pool_id, 1332024, 1, NOW(), 'LK'), (@pool_id, 1332009, 1, NOW(), 'LK'), (@pool_id, 1472017, 1, NOW(), 'LK'), (@pool_id, 1472013, 1, NOW(), 'LK'), (@pool_id, 1472029, 1, NOW(), 'LK'),
  (@pool_id, 1472021, 1, NOW(), 'LK'), (@pool_id, 1332015, 1, NOW(), 'LK'), (@pool_id, 1332031, 1, NOW(), 'LK'), (@pool_id, 1332023, 1, NOW(), 'LK'), (@pool_id, 1332004, 1, NOW(), 'LK'), (@pool_id, 1472000, 1, NOW(), 'LK'), (@pool_id, 1332019, 1, NOW(), 'LK'), (@pool_id, 1472027, 1, NOW(), 'LK'), (@pool_id, 1332018, 1, NOW(), 'LK'), (@pool_id, 1472007, 1, NOW(), 'LK'),
  (@pool_id, 1332012, 1, NOW(), 'LK'), (@pool_id, 1332016, 1, NOW(), 'LK'), (@pool_id, 1472024, 1, NOW(), 'LK'), (@pool_id, 1332017, 1, NOW(), 'LK'), (@pool_id, 1332003, 1, NOW(), 'LK'), (@pool_id, 1472012, 1, NOW(), 'LK'), (@pool_id, 1472014, 1, NOW(), 'LK'), (@pool_id, 1472005, 1, NOW(), 'LK'), (@pool_id, 1472018, 1, NOW(), 'LK'), (@pool_id, 1472001, 1, NOW(), 'LK'),
  (@pool_id, 1072294, 1, NOW(), 'LK'), (@pool_id, 1492009, 1, NOW(), 'LK'), (@pool_id, 1432011, 1, NOW(), 'LK');
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`)
SELECT @pool_id, `item_id`, 1, NOW(), 'LK'
FROM `gachapon_reward`
WHERE `pool_id` BETWEEN 1 AND 12
GROUP BY `item_id`
HAVING COUNT(DISTINCT `pool_id`) = 12;

-- ---------------------------------------------------------------- 稀有档
INSERT INTO `gachapon_reward_pool` (`name`, `gachapon_id`, `weight`, `is_public`, `prob`, `start_time`, `end_time`, `notification`, `comment`)
VALUES ('神木村(稀有)', 9100111, 800, 0, 0, NOW(), NULL, 0, 'LK');
SET @pool_id = LAST_INSERT_ID();
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES
  (@pool_id, 2040804, 1, NOW(), 'LK'), (@pool_id, 2040805, 1, NOW(), 'LK'), (@pool_id, 1082149, 1, NOW(), 'LK'), (@pool_id, 2040920, 1, NOW(), 'LK');
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`)
SELECT @pool_id, `item_id`, 1, NOW(), 'LK'
FROM `gachapon_reward`
WHERE `pool_id` BETWEEN 13 AND 24
GROUP BY `item_id`
HAVING COUNT(DISTINCT `pool_id`) = 12;

-- ---------------------------------------------------------------- 传奇档
INSERT INTO `gachapon_reward_pool` (`name`, `gachapon_id`, `weight`, `is_public`, `prob`, `start_time`, `end_time`, `notification`, `comment`)
VALUES ('神木村(传奇)', 9100111, 200, 0, 0, NOW(), NULL, 1, 'LK');
SET @pool_id = LAST_INSERT_ID();
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES
  (@pool_id, 3010046, 1, NOW(), 'LK'), (@pool_id, 2040817, 1, NOW(), 'LK'), (@pool_id, 2040919, 1, NOW(), 'LK');
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`)
SELECT @pool_id, `item_id`, 1, NOW(), 'LK'
FROM `gachapon_reward`
WHERE `pool_id` BETWEEN 25 AND 36
GROUP BY `item_id`
HAVING COUNT(DISTINCT `pool_id`) = 12;