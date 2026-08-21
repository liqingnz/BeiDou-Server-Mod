-- ----------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：指令注册（command_info）
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
-- 【幂等性】全部是 INSERT ... SELECT ... WHERE NOT EXISTS (syntax 已存在则跳过)。
-- 【注意】default_level 必须与 Java 类所在的 gm{N} 包一致，反射按它找类。
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- [V1000.0.3] insert_command_info_lichking_batch1.sql
-- ---------------------------------------------------------------------------
-- 注册从 LichKingMod 移植过来的指令。
-- BeiDou 的指令不再走 CommandsExecutor 里的 addCommand（那些 registerLvXCommands 已整体注释掉），
-- 而是由 CommandService.loadCommands 从本表读取，再按
-- org.gms.client.command.commands.gm{default_level}.{clazz} 反射实例化。
-- 因此 default_level 必须与 java 类所在的包一致；level 是可在后台调整的实际权限等级。

-- @roll 投掷 0-100 随机数
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'roll', 0, 1, 'RollCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'roll');

-- @mapdrops 当前地图掉落查询入口，打开脚本中心已有的「当前地图掉落」脚本
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'mapdrops', 0, 1, 'MapDropsCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'mapdrops');

-- @sellinv 批量出售背包物品
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'sellinv', 0, 1, 'SellInvCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'sellinv');

-- @patrol 自动巡逻
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'patrol', 2, 1, 'PatrolCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'patrol');

-- @cospreview 造型预览，默认打开美发店脚本
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'cospreview', 2, 1, 'CosPreviewCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'cospreview');

-- @testscript 按脚本名打开NPC脚本，调试用
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'testscript', 5, 1, 'TestScriptCommand', 5
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'testscript');

-- ---------------------------------------------------------------------------
-- [V1000.0.4] insert_command_info_lichking_batch4.sql
-- ---------------------------------------------------------------------------
-- 注册从 LichKingMod 移植过来的第二批指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @retrieve 买回本次用 @sellinv 卖出的物品，与 V1000.0.3 的 @sellinv 配套
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'retrieve', 0, 1, 'RetrieveCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'retrieve');

-- @gmbot 替指定角色自动清怪拾取
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'gmbot', 4, 1, 'GMBotCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'gmbot');

-- 本批的第三项「道具有效期」是给既有的 @drop 加了一个可选参数，
-- 指令本身已在 command_info 中，无需新增行。

-- ---------------------------------------------------------------------------
-- [V1000.0.5] insert_command_info_lichking_batch5.sql
-- ---------------------------------------------------------------------------
-- 注册从 LichKingMod 移植过来的第三批指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @detect 测谎。不带参数开当前地图的目标列表脚本，带参数按角色名直接发起。
-- 类放在 gm0 是照搬原实现的权限档，但普通玩家发起需要 use_player_detect 打开（默认关闭，
-- 见 V1000.0.6），GM 不受该开关限制，所以留在 gm0 也不会被玩家用起来。
-- 若决定彻底不开放，把这一行的 level 调高或 enabled 置 0 即可，不用改代码。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'detect', 0, 1, 'DetectCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'detect');

-- ---------------------------------------------------------------------------
-- [V1000.0.8] insert_command_info_lichking_batch6.sql
-- ---------------------------------------------------------------------------
-- 注册从 LichKingMod 移植过来的批次 6 指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @proequip：在装备原有属性上加值，属性为 0 的项保持 0。
-- 与既有的 @proitem（把全属性设成定值）互补，两条都保留。
-- 原实现里另有一个 DropProEquipCommand，与本指令 90% 逐字重复、
-- 唯一区别是掉在地上而非进背包，这里合并成第三个参数 drop，不单独建类。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'proequip', 4, 1, 'ProEquipCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'proequip');

-- ---------------------------------------------------------------------------
-- [V1000.0.10] insert_command_info_lichking_batch6_mobrate.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G1 的 @mobrate。规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @mobrate <基础倍率> [<每名有效玩家增量>]：现场调刷怪倍率，只改内存不落库，
-- 重启回到 game_config 表里的值；持久修改走 gms-ui 后台。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'mobrate', 4, 1, 'MobRateCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'mobrate');

-- ---------------------------------------------------------------------------
-- [V1000.0.17] insert_recall_command.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G12：@recall 指令注册（配置项见 R__lk_30_config_gameplay.sql 的召回小节）。
-- @recall：把掉线重连的玩家放回原来的活动实例。
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类）。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'recall', 2, 1, 'RecallCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'recall');

-- ---------------------------------------------------------------------------
-- [V1000.0.19] insert_command_info_analysis.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G14：@analysis 查看当前地图 BOSS 的伤害分担。
--
-- LK 把这条指令放在 gm0（所有玩家可用），BeiDou 按运营决定收到 gm2（仅 GM）——
-- 它等于一张全服可见的 DPS 表，放开容易在远征/组队里引发扯皮。
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类）。

INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'analysis', 2, 1, 'BossDmgAnalysisCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'analysis');

-- ---------------------------------------------------------------------------
-- 掉落查询三件套：重排入口 + 整组降到 gm0
-- ---------------------------------------------------------------------------
-- 批次 1 把 @whodrops 整个改成了脚本入口（按分类浏览），LK 那份「按物品名/id 直接查」
-- 的文本查询就此没了着落。这里拆回两个入口：
--   @whodrops   按物品名或物品 id 查掉落源，带角色实际掉率        gm0/WhoDropsCommand（新）
--   @droptable  原来的分类浏览脚本入口                            gm0/DropTableCommand（原 WhoDropsCommand 改名）
--   @whatdropsfrom 按怪物查掉落                                   gm0/WhatDropsFromCommand（从 gm1 移包）
-- 三个都是纯查询，和早就在 gm0 的 @mapdrops 齐平，故 level 与 default_level 一并降到 0。
-- 上游 V1.5.1__create_command_info.sql 把 whodrops/whatdropsfrom 播种在 level 1，本段覆盖它。
--
-- 【为什么是 DELETE + INSERT 而不是 UPDATE】
--   WhoDropsCommand 这个类名被复用了（旧实现改叫 DropTableCommand，新实现顶上原名）。
--   写成 UPDATE ... WHERE clazz='WhoDropsCommand' 的话，第二次重跑会把**新的** WhoDropsCommand
--   也改名成 droptable。按 syntax 先删后插才是幂等的。
--
-- 【副作用】重跑会覆盖运营在 gms-ui 后台对这三行 level/enabled 的手工调整——迁移期有意如此。
--   若上线后发现 @whodrops / @whatdropsfrom 的模糊搜索（要遍历全量物品/怪物名）被玩家刷，
--   最省事的处置就是把这里的 level 调回 1，不必改代码。
DELETE FROM `command_info` WHERE `syntax` IN ('whodrops', 'droptable', 'whatdropsfrom');
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`) VALUES
    ('whodrops',      0, 1, 'WhoDropsCommand',      0),
    ('droptable',     0, 1, 'DropTableCommand',     0),
    ('whatdropsfrom', 0, 1, 'WhatDropsFromCommand', 0);

-- ---------------------------------------------------------------------------
-- @dropto 定向独享掉落
-- ---------------------------------------------------------------------------
-- !dropto <角色名或角色id> <物品id> [数量] [有效期分钟数]
--
-- !drop 的定向版：物品掉在目标角色自己脚下（不限地图/频道），且只有他一个人
-- 看得见、也只有他能捡——同图其他玩家屏幕上什么都没有。
-- 实现见 MapleMap.spawnExclusiveItemDrop / MapItem.exclusiveOwnerId：地面掉落
-- 本来就是逐客户端单独发包的，独享掉落只是把「发不发」的判据从任务道具换成角色 id。
--
-- 与 drop 同级 gm2。default_level 必须与 java 类所在的包一致（gm2）。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'dropto', 2, 1, 'ItemDropToCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'dropto');
