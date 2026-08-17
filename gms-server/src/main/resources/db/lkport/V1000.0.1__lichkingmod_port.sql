-- ============================================================================
-- LichKingMod -> BeiDou 移植：全部数据库迁移（单文件）
-- ============================================================================
--
-- 本文件由原先 db/lkport/ 下的 29 个迁移合并而来（批次 1-7），每个原文件成为
-- 下面的一个小节，内容逐字保留、未作改写。合并是移植收尾的既定动作，为的是
-- 不让 lkport 目录长期堆着几十个碎文件。**不动上游 db/migration/**——那是
-- BeiDou 自己的迁移，与本次移植分属两条线（见 application.yml 的 locations）。
--
-- 【版本号】沿用 V1000.0.1（原 create_login_history 的号），不是新号：
--   * 全新库：整份从头执行，得到移植后的最终状态。
--   * 已经跑过旧版 lkport 的库：Flyway 按版本号判定为已执行而直接跳过，
--     一条语句都不会重跑。这正是要的效果——见下面第二条 ⚠。
--     application.yml 里 validate-on-migrate: false，校验和变化不会报错；
--     flyway_schema_history 中残留的旧版本行会显示为 missing，无害。
--
-- 【顺序】小节顺序 = 原版本号的数值顺序，**不能按主题重排**，存在真实依赖：
--   * V1000.1.7 的 ALTER nxcoupons 必须在后续按浮点写入倍率的语句之前；
--   * V1000.1.9 从 V1000.1.8 再平衡之后的奖池里 SELECT 公共奖品
--     （WHERE pool_id BETWEEN ... HAVING COUNT(DISTINCT pool_id) = 12）；
--   * 所有 game_config / command_info 的 INSERT 都依赖对应建表已经完成。
--
-- ⚠ 单文件 = 单个 Flyway 版本 = 一次记账。下列小节含 DDL，而 MySQL 的 DDL 会
--   隐式提交：整份执行到一半失败时，前面已生效的 schema 不会回滚，Flyway 只把
--   这一个版本标记为失败，需要手工清理后重来。拆成 29 个文件时失败只卡住一个。
--     V1000.0.1   create_login_history            CREATE TABLE
--     V1000.0.2   create_message_board            CREATE TABLE
--     V1000.0.14  alter_bosslog_bosstype          ALTER TABLE
--     V1000.1.1   alter_drop_data_add_distinctive ALTER TABLE
--     V1000.1.7   lk_nxcoupons_float_rate         ALTER TABLE
--
-- ⚠ 本文件整体**不可重复执行**。绝大多数语句是 IF NOT EXISTS / WHERE NOT EXISTS
--   的幂等写法，但两处不是：
--     * V1000.1.9 的三个神木村奖池是无条件 INSERT，重跑会插出重复奖池；
--     * V1000.1.8 的 DELETE + INSERT 会把运营在 gms-ui 里手工加的权重行
--       收敛回一行（该取舍原文件注释里已说明）。
--   因此不要对已经执行过的库手工重放本文件。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- [V1000.0.1] create_login_history.sql
-- ---------------------------------------------------------------------------
-- 记录账号用过哪些来源 IP，以及每个 IP 最近一次使用的时间。
-- 来源：LichKingMod 的 `loginHistroy` 表（原名拼写有误，此处更正为 login_history）。
--
-- 写入用 INSERT ... ON DUPLICATE KEY UPDATE 撞 uk_account_ip：同一 (账号, IP) 只有一行，
-- 每次从该 IP 登录成功都把时间刷新到最新。
-- LichKingMod 原版用的是 INSERT IGNORE，重复登录会被唯一键整行跳过、时间永不更新，
-- 于是那个叫 lastLoginTime 的字段实际存的是首次登录时间，名实不符。此处改为真正的 last。
-- 「最近一次登录用的是哪个 IP」由 accounts.ip 承担，每次登录成功时覆盖。
--
-- 原表无主键，仅靠 UNIQUE(accountId, ip) 去重；MyBatis-Flex 的 BaseMapper 需要 @Id，
-- 因此补一个自增代理主键，去重仍由唯一键保证。
CREATE TABLE IF NOT EXISTS `login_history`
(
    `id`              INT(11)     NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `account_id`      INT(11)     NOT NULL COMMENT '账号id，对应accounts.id',
    `ip`              VARCHAR(64) NOT NULL COMMENT '登录来源IP，长度按IPv6预留',
    `last_login_time` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '该账号最近一次从此IP登录成功的时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_account_ip` (`account_id`, `ip`),
    KEY `idx_account_id` (`account_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '账号登录IP历史表';

-- ---------------------------------------------------------------------------
-- [V1000.0.2] create_message_board.sql
-- ---------------------------------------------------------------------------
-- 全服留言板。来源：LichKingMod 的 `messageBoard` 表。
-- 原表用 TEXT 存名字与内容且无主键，这里改成定长 VARCHAR 并补自增主键；
-- 原字段名 `time` 是 MySQL 关键字，改为 create_time；MESSAGE_SIZE = 30 表示只保留最新 30 条。
-- 淘汰与展示都按自增 id 排序而不是 create_time —— TIMESTAMP 只到秒，同一秒内的多条留言分不出
-- 先后，而 id 单调递增。create_time 只作展示与审计，索引留着备将来按时间段查。
--
-- 与原实现的一个关键差异：`message` 只存**玩家输入的原文**，不含角色名与颜色控制码。
-- 原实现把 "#d名字#k: 内容" 整串入库，带来三个问题：与 character_name 列重复；
-- 角色改名后历史留言仍显示旧名；40 字上限校验的是原文、入库的却是拼装串。
-- 名字与颜色码改为渲染时再拼，作者留言时是否为 GM 是一个历史事实，单独用 is_gm 记。
CREATE TABLE IF NOT EXISTS `message_board`
(
    `id`             INT(11)     NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `character_id`   INT(11)     NOT NULL COMMENT '留言角色id',
    `character_name` VARCHAR(13) NOT NULL COMMENT '留言角色名',
    `message`        VARCHAR(64) NOT NULL COMMENT '留言内容原文，不含角色名与颜色控制码',
    `is_gm`          TINYINT(1)  NOT NULL DEFAULT '0' COMMENT '留言时作者是否为GM，仅用于渲染高亮',
    `create_time`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '留言时间',
    PRIMARY KEY (`id`),
    KEY `idx_create_time` (`create_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '全服留言板';

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
-- [V1000.0.6] insert_game_config_detect.sql
-- ---------------------------------------------------------------------------
-- 测谎（@detect / detectMap.js）的运营参数。
-- 原实现把 1500 点券成本、10000 点券赏金、60 分钟监禁全硬编码在 AbstractPlayerInteraction 里，
-- 这几个数直接决定这套机制会不会变成骚扰渠道，必须能在后台调，所以全部落成 game_config 项。
--
-- use_player_detect 默认关闭：开启后普通玩家可以花点券去处罚另一个玩家，
-- 是一条现成的骚扰渠道（比如专挑对方打BOSS时发起）。GM（gmLevel >= 2）不受此开关限制。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_player_detect', 'false', 'use_player_detect', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_player_detect');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_cost_nx', '1500', 'detect_cost_nx', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_cost_nx');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_reward_nx', '10000', 'detect_reward_nx', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_reward_nx');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_jail_minutes', '60', 'detect_jail_minutes', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_jail_minutes');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'detect_answer_seconds', '15', 'detect_answer_seconds', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'detect_answer_seconds');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_player_detect', '是否允许普通玩家发起测谎（GM不受此开关限制）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_player_detect');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_cost_nx', '发起一次测谎消耗的点券（GM免费）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_cost_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_reward_nx', '测谎未通过时罚没并转给发起方的点券上限', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_reward_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_jail_minutes', '测谎未通过的监禁时长（分钟）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_jail_minutes');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'detect_answer_seconds', '测谎的答题时限（秒）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'detect_answer_seconds');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_player_detect', 'Allow ordinary players to start a bot check (GMs are exempt from this switch)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_player_detect');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_cost_nx', 'NX charged for starting a bot check (free for GMs)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_cost_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_reward_nx', 'Maximum NX taken from a failed target and handed to the initiator', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_reward_nx');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_jail_minutes', 'Jail time in minutes for failing a bot check', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_jail_minutes');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'detect_answer_seconds', 'Seconds allowed to answer a bot check', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'detect_answer_seconds');

-- ---------------------------------------------------------------------------
-- [V1000.0.7] insert_game_config_equip_growth.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G4：极品装备属性（Godly）、装备属性浮动范围、成长装备的等级门槛、元素武器升级方式。
--
-- equip_godly_max_bonus 是原实现里写死在 getRandStat 里的 20 行 if-else：每档 1% 概率，
-- 命中即在常规浮动之上再加该档位的点数。这里参数化后，配 0 就是关闭（属性与引入前逐位相同），
-- 配 5 等价于原实现。作用面是全部装备掉落（怪物/反应堆/脚本发放）与专业技能制作产物。
--
-- equip_stat_randomize_range 的实际约束面比看上去小：浮动区间是
-- min(ceil(属性值 * 0.1), 本配置)，所以只有属性值大于 50 时本配置才可能成为约束，
-- 低等级装备调它没有效果。默认 5 与调整前的硬编码值一致。
--
-- use_equip_growth_level_limit 打开后，成长装备每升 1 级穿戴要求 +5，
-- 且只有玩家已达到「下一级的穿戴要求」时装备才继续吃经验——避免长成一件自己穿不上的装备。
-- 达到 max_level_cap 的玩家不受此限制。
--
-- max_level_cap / cygnus_max_level_cap 本批由成长门槛消费，等级上限本身的其余改动在 G10。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'equip_godly_max_bonus', '5', 'equip_godly_max_bonus', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'equip_godly_max_bonus');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'equip_stat_randomize_range', '5', 'equip_stat_randomize_range', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'equip_stat_randomize_range');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_equip_growth_level_limit', 'true', 'use_equip_growth_level_limit', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_equip_growth_level_limit');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_elemental_weapon_gms_levelup', 'true', 'use_elemental_weapon_gms_levelup', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_level_cap', '200', 'max_level_cap', '2026-08-15 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_level_cap');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'equip_godly_max_bonus', '极品装备属性的最高加成点数，每档1%概率，0为关闭', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'equip_godly_max_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'equip_stat_randomize_range', '装备掉落时的属性浮动范围上限（防御/HP/MP为其2倍）；实际浮动取本值与属性值10%的较小者，故对属性值50以下的装备无效', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'equip_stat_randomize_range');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_equip_growth_level_limit', '成长装备每升1级穿戴要求+5，且玩家等级不够时装备停止获得经验', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_equip_growth_level_limit');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_elemental_weapon_gms_levelup', '元素武器按GMS原版方式升级（读wz的小幅成长）；关闭则与普通装备一样升级', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_level_cap', '冒险家与战神的等级上限', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_level_cap');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'equip_godly_max_bonus', 'Highest godly stat bonus an equip can roll, 1% chance per tier; 0 disables it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'equip_godly_max_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'equip_stat_randomize_range', 'Cap on equip stat variance when dropped (doubled for def/HP/MP); the actual spread is the smaller of this and 10% of the stat, so it has no effect below stat 50', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'equip_stat_randomize_range');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_equip_growth_level_limit', 'Each equip level adds 5 to its level requirement, and an equip stops gaining EXP while the player is below that requirement', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_equip_growth_level_limit');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_elemental_weapon_gms_levelup', 'Level elemental weapons the GMS way (small wz-defined gains); disable to level them like ordinary equips', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_elemental_weapon_gms_levelup');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_level_cap', 'Level cap for adventurers and Aran', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_level_cap');

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
-- [V1000.0.9] insert_game_config_mob_spawn.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G1：刷怪倍率随地图人数变化。
--
-- 原公式是 0.70 + 0.05 * min(6, 人数)。现在改为
-- mob_spawn_base_rate + min(有效玩家数, mob_spawnrate_max_players) * mob_spawnrate_to_player_count。
-- 「有效玩家」指等级不低于本图最高等级玩家 30 级的人，避免挂机小号拉高刷怪率。
-- 人数上限保留原公式的 6，落成配置项；置 0 表示不封顶（即原移植来源的行为）。
--
-- mob_spawn_point_capacity 是单个刷怪点能同时存在的怪物数，原实现是写死的 1。
-- BOSS 刷怪点不受此配置影响，恒为 1。
--
-- use_wz_map_mob_rate 启用 Map.wz 里 info/mobRate 这份地图密度数据。
-- 该字段 MapFactory 一直在解析、MapleMap 一直存着，但此前全仓库没有第二处引用，是死字段；
-- 5364 张地图 img 里 5363 张带这个值，取值 0.4~10 连续分布。
-- 这替代了原实现里按地图 id 段硬编码 x2 的做法——那种写法只覆盖三段 id，
-- 且其中「玩具城」那段 wz 本来就特意调低到 0.4~1.1，硬编码 x2 与数据意图相反。
-- 关掉本开关即恢复到启用之前的表现（所有地图一律按 1 倍）。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Float', 'mob_spawn_base_rate', '0.7', 'mob_spawn_base_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawn_base_rate');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Float', 'mob_spawnrate_to_player_count', '0.1', 'mob_spawnrate_to_player_count', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mob_spawnrate_max_players', '6', 'mob_spawnrate_max_players', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawnrate_max_players');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mob_spawn_point_capacity', '2', 'mob_spawn_point_capacity', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_spawn_point_capacity');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_wz_map_mob_rate', 'true', 'use_wz_map_mob_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_wz_map_mob_rate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawnrate_max_players', '计入刷怪倍率的有效玩家数上限，0表示不封顶', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawnrate_max_players');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawn_base_rate', '地图刷怪基础倍率（乘以刷怪点数得出怪物数上限）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawn_base_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawnrate_to_player_count', '每多一名有效玩家增加的刷怪倍率；有效玩家指等级不低于本图最高等级玩家30级的人', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_spawn_point_capacity', '单个刷怪点可同时存在的怪物数，BOSS点恒为1', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_spawn_point_capacity');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_wz_map_mob_rate', '按wz地图数据(info/mobRate)区分各图刷怪密度；关闭则所有地图一律按1倍', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_wz_map_mob_rate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawnrate_max_players', 'Cap on how many effective players count toward the spawn rate; 0 means no cap', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawnrate_max_players');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawn_base_rate', 'Base map spawn rate, multiplied by the spawn point count to cap live monsters', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawn_base_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawnrate_to_player_count', 'Spawn rate added per effective player; effective means within 30 levels of the highest-level player on the map', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawnrate_to_player_count');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_spawn_point_capacity', 'Monsters a single spawn point may hold at once; boss spawn points are always 1', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_spawn_point_capacity');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_wz_map_mob_rate', 'Use the per-map density from wz (info/mobRate); disable to treat every map as 1x', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_wz_map_mob_rate');

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
-- [V1000.0.11] insert_game_config_clean_slate.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G5：白医卷轴（Clean Slate）的判定规则开关。
--
-- 关闭（原实现）：白医的语义是「找回一次打卷失败掉掉的孔」。判定式是
--   剩余孔 + 已成功次数 < 总孔数(tuc) + Vicious 数
-- 也就是「这件装备失败过」。全新未打的装备用不了，七孔全成功的装备也用不了，
-- 总孔数永远不会超过 tuc。
--
-- 打开（LK 规则）：白医改为「给已经打满的装备额外加一个孔」，判定式只有
--   剩余孔 == 0
-- 反复「白医开孔 → 打卷」可以把同一件装备的总孔数无限叠上去，是产出侧的有意放宽。
-- 上限只剩 upgradeSlots 这个 byte 字段本身的 127（代码里已挡溢出）。
--
-- 两种规则下 tuc 为 0 的装备（本身不可打卷）都拒绝，不会被白医开出第一个孔。
-- LK 另外硬编码了 1122000（黑龙项链）不可白医，那是运营口味不是修 BUG——该装备在
-- v83 数据里 tuc = 3，本来就可打卷——所以没有跟进，要禁哪件装备请单独处理。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_lk_clean_slate', 'true', 'use_lk_clean_slate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_lk_clean_slate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_lk_clean_slate', '白医卷轴改为「给剩余孔为0的装备额外加1个孔」，总孔数可超过装备原有上限；关闭则恢复为「仅找回打卷失败掉的孔」', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_lk_clean_slate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_lk_clean_slate', 'Clean Slate Scrolls grant one extra slot to equips with no slots left, letting total slots exceed the item cap; disable to only recover slots lost to failed scrolls', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_lk_clean_slate');

-- ---------------------------------------------------------------------------
-- [V1000.0.12] insert_game_config_mob_damage_mob.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G6：怪物互殴伤害上限的放宽系数。
--
-- 唯一触发路径是海盗的心灵控制（Corsair.HYPNOTIZE，StatEffect 里唯一写 INERTMOB 的地方）：
-- 被控制的怪打其他怪时，客户端把伤害报上来，服务端用 MobDamageMobHandler.calcMaxDamage
-- 估一个上限做反外挂钳位。那套估算式是 OdinMS 留下的，算出来比客户端实际打出的低，
-- 于是合法伤害会被砍到上限，并且每次命中刷一条 warn 日志。
--
-- 本配置只抬「服务端愿意接受的上限」，不提高实际伤害——伤害数值始终来自客户端包。
-- 所以它不是伤害倍率，别按倍率去理解。
--
-- 配 1.0 = 恢复原来的严格钳位（合法伤害继续被砍）。配得越高，钳位越松，
-- 改包能打出的伤害上限也越高——这是反外挂强度与手感之间的取舍。
-- LK 写死 2.5 且没给依据，这里默认 1.5 取中。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'mob_damage_mob_max_damage_rate', '1.5', 'mob_damage_mob_max_damage_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mob_damage_mob_max_damage_rate');

-- 中文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mob_damage_mob_max_damage_rate', '怪物互殴（海盗心灵控制）时服务端接受的伤害上限系数；1.0为严格钳位，调高可避免合法伤害被砍，但改包能打出的上限也随之提高', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mob_damage_mob_max_damage_rate');

-- 英文
INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mob_damage_mob_max_damage_rate', 'Scales the server-side damage ceiling for mob-vs-mob hits (Corsair Hypnotize); 1.0 keeps the strict clamp, higher values stop clamping legitimate damage but also raise what a packet editor can deal', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mob_damage_mob_max_damage_rate');

-- ---------------------------------------------------------------------------
-- [V1000.0.13] insert_game_config_skill_balance.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G9：技能平衡相关的可调参数。
--
-- 分四组：
--   1) 三个「额外防击退（STANCE）」——LK 给战舰 / 魔力反射 / 神射手黑暗附带的防击退，
--      全部落成数值配置，0 = 不附加、恢复原有表现。
--   2) 战神连击——原本硬编码的 3 秒断连窗口，以及 GM 连击加成。
--   3) 技能冷却——GM 免冷却开关，以及英雄意志快速重用的除数（原先硬编码 60）。
--   4) 战舰血量——原先硬编码的 400 / 级 与 200 / 等级。
--
-- 默认值除 battleship_hp_per_skill_level 外均为「与原实现一致」或「LK 值」，
-- 逐项说明见各条注释。

-- ---------- 1) 额外防击退 ----------

-- 战舰：LK 给 30。原实现不带防击退。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_stance', '30', 'battleship_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_stance', '船长战舰附带的防击退几率（0-100），0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_stance', 'Knockback resistance (0-100) granted by Corsair Battleship; 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_stance');

-- 魔力反射：LK 给 30。原实现不带防击退。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'mana_reflection_stance', '30', 'mana_reflection_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'mana_reflection_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'mana_reflection_stance', '魔力反射附带的防击退几率（0-100），0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'mana_reflection_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'mana_reflection_stance', 'Knockback resistance (0-100) granted by Mana Reflection; 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'mana_reflection_stance');

-- 神射手黑暗：LK 给 100，即黑暗期间完全免击退。这是三条里最强的一条，嫌猛就调低或置 0。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'marksman_blind_stance', '100', 'marksman_blind_stance', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'marksman_blind_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'marksman_blind_stance', '神射手黑暗附带的防击退几率（0-100），100为完全免击退；0表示不附加、恢复原版表现', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'marksman_blind_stance');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'marksman_blind_stance', 'Knockback resistance (0-100) granted by Marksman Blind; 100 means full immunity, 0 disables it and restores vanilla behaviour', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'marksman_blind_stance');

-- ---------- 2) 战神连击 ----------

-- 默认 3 秒 = 原硬编码值，零行为变更。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'aran_combo_last_time', '3', 'aran_combo_last_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'aran_combo_last_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'aran_combo_last_time', '战神连击的断连判定时间（秒），超过这个时间没有命中则连击清零', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'aran_combo_last_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'aran_combo_last_time', 'Seconds of inactivity before an Aran combo resets to zero', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'aran_combo_last_time');

-- GM 每次命中的额外连击数，0 = 关闭（与原实现一致）。仅 GM 等级 3 以上生效。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'aran_combo_gm_bonus', '5', 'aran_combo_gm_bonus', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'aran_combo_gm_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'aran_combo_gm_bonus', 'GM（等级3以上）战神每次命中额外增加的连击数，0表示关闭', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'aran_combo_gm_bonus');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'aran_combo_gm_bonus', 'Extra combo count granted per hit to GMs (level 3+) playing Aran; 0 disables it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'aran_combo_gm_bonus');

-- ---------- 3) 技能冷却 ----------

-- GM 免冷却。只覆盖 SpecialMoveHandler 这条路径（buff/召唤/位移等非攻击技能）；
-- 攻击技能的冷却由 CloseRange / Magic / RangedAttack 三个伤害 handler 各自登记，不受此开关影响。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_gm_no_skill_cooldown', 'true', 'use_gm_no_skill_cooldown', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_gm_no_skill_cooldown', 'GM（等级3以上）使用非攻击类技能（SpecialMoveHandler 路径）不进入冷却；攻击技能的冷却仍由各伤害handler登记，不受此开关影响', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_gm_no_skill_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_gm_no_skill_cooldown', 'GMs (level 3+) skip cooldowns for non-attack skills (the SpecialMoveHandler path); attack skill cooldowns are still registered by the damage handlers and are not affected', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_gm_no_skill_cooldown');

-- 英雄意志快速重用的除数，默认 60 = 原硬编码值。仅在 use_fast_reuse_hero_will 打开时生效。
-- 代码里已用 Math.max(1, ...) 兜住 0。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'fast_reuse_hero_will_divisor', '60', 'fast_reuse_hero_will_divisor', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'fast_reuse_hero_will_divisor');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'fast_reuse_hero_will_divisor', '英雄意志快速重用时冷却时间的除数，越大冷却越短；需先开启use_fast_reuse_hero_will', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'fast_reuse_hero_will_divisor');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'fast_reuse_hero_will_divisor', 'Divisor applied to Hero''s Will cooldown when fast reuse is on; larger means shorter cooldown. Requires use_fast_reuse_hero_will', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'fast_reuse_hero_will_divisor');

-- ---------- 4) 战舰血量 ----------

-- 原实现是 400 / 技能等级。LK 改成 3000（7.5 倍），满级 10 时 4000 → 30000。
-- 这里按 LK 取 3000；想回到原版把它调回 400。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_hp_per_skill_level', '3000', 'battleship_hp_per_skill_level', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_hp_per_skill_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_hp_per_skill_level', '战舰每级技能提供的耐久度，原版为400', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_hp_per_skill_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_hp_per_skill_level', 'Battleship durability granted per skill level; vanilla is 400', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_hp_per_skill_level');

-- 角色等级超过 120 的部分，每级追加的耐久度。默认 200 = 原值。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'battleship_hp_per_level', '200', 'battleship_hp_per_level', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'battleship_hp_per_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'battleship_hp_per_level', '角色等级超过120的部分，每级为战舰追加的耐久度', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'battleship_hp_per_level');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'battleship_hp_per_level', 'Extra Battleship durability granted per character level above 120', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'battleship_hp_per_level');

-- ---------------------------------------------------------------------------
-- [V1000.0.14] alter_bosslog_bosstype.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G7 复查修正：bosslog 的 bosstype 从 ENUM 改为 VARCHAR。
--
-- V1.0.3 建表时把 bosstype 写成 ENUM('ZAKUM','HORNTAIL','PINKBEAN','SCARGA','PAPULATUS')。
-- G7 给 BossLogEntry 新增了 BALROG_NORMAL / KREXEL / SHOWA / YAOSENG 四个条目，
-- 这四个名字不在 ENUM 里：严格模式下 INSERT 直接报错，非严格模式下写成空串。
-- 而 insertPlayerEntry 把 SQLException 吞掉后 attemptBoss 仍然返回 true，
-- 结果就是「看起来加了次数限制，实际一次都记不上」——比没加更糟，因为不会报错。
--
-- 改成 VARCHAR(32) 之后，以后再加 BOSS 只动枚举即可，不必每次改表结构。
-- 列名与长度对齐 BossLogEntry 的枚举名（当前最长 BALROG_NORMAL = 13 字符）。

ALTER TABLE `bosslog_daily`
    MODIFY COLUMN `bosstype` VARCHAR(32) NOT NULL;

ALTER TABLE `bosslog_weekly`
    MODIFY COLUMN `bosstype` VARCHAR(32) NOT NULL;

-- ---------------------------------------------------------------------------
-- [V1000.0.15] insert_game_config_anticheat.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G8：反外挂判定的可调参数。
--
-- 伤害判定的分母 maxWithCrit / maxDmg 都来自服务端估算式，本移植已两次确认它偏低
-- （G6 的 mob_damage_mob_max_damage_rate、本组的 summon_max_damage_rate）。
-- 所以这些倍率不是「允许作弊到几倍」，而是「估算误差的容忍度」，调低会直接增加误封。
--
-- 代码侧对每个键都做了「非正数回落到默认值」的兜底：迁移没跑时 GameConfig 返回 0，
-- 0 会让判定退化成「任何伤害都超标」，那就是全服误封。

-- ---------- 伤害检测三档 ----------

-- 第一档：仅告警给在线 GM，不计分。原硬编码 1.5。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_alert_ratio', '1.5', 'damage_hack_alert_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_alert_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_alert_ratio', '伤害超过服务端估算上限的几倍时向在线GM告警（不计分）；调低会增加误报', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_alert_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_alert_ratio', 'Damage over this multiple of the server-side estimate raises a GM alert (no points); lowering it increases false positives', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_alert_ratio');

-- 第二档：记 1 分。DAMAGE_HACK 默认 15 分封禁、1 分钟过期。原硬编码 5。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_point_ratio', '5', 'damage_hack_point_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_point_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_point_ratio', '伤害超过服务端估算上限的几倍时记1分反外挂积分；积分到DAMAGE_HACK阈值触发封号', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_point_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_point_ratio', 'Damage over this multiple of the server-side estimate adds one autoban point; reaching the DAMAGE_HACK threshold bans the account', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_point_ratio');

-- 第三档：一次性加重计分。LK 在这个倍数上做的是「即时永封 + 封IP + 封MAC」，
-- 这里改走 BeiDou 现有的账号封禁链路：可逆、有GM广播、有日志，不牵连同IP/同机器的其他人。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'damage_hack_severe_ratio', '30', 'damage_hack_severe_ratio', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_severe_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_severe_ratio', '伤害超过服务端估算上限的几倍时按严重情形一次性加重计分（分值见damage_hack_severe_points）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_severe_ratio');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_severe_ratio', 'Damage over this multiple of the server-side estimate is treated as severe and scored in one go (see damage_hack_severe_points)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_severe_ratio');

-- 默认 15 = DAMAGE_HACK 的封禁阈值，即单次触发就封（等价于 LK 的即时封禁，但只封账号）。
-- 想要「三振出局」把它调成 5，想要纯观察调成 1。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'damage_hack_severe_points', '15', 'damage_hack_severe_points', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'damage_hack_severe_points');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'damage_hack_severe_points', '触发严重伤害异常时一次记多少分；15等于单次直接封号，调低则需要多次触发', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'damage_hack_severe_points');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'damage_hack_severe_points', 'Points added at once when severe damage is detected; 15 bans on the first hit, lower values require repeats', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'damage_hack_severe_points');

-- ---------- 召唤兽伤害上限 ----------

-- 与 mob_damage_mob_max_damage_rate 同源同值：估算式偏低会把合法伤害钳掉。配 1.0 恢复严格钳位。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Double', 'summon_max_damage_rate', '1.5', 'summon_max_damage_rate', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'summon_max_damage_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'summon_max_damage_rate', '召唤兽伤害的服务端接受上限系数；1.0为严格钳位，调高可避免合法伤害被砍，但改包能打出的上限也随之提高', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'summon_max_damage_rate');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'summon_max_damage_rate', 'Scales the server-side damage ceiling for summon attacks; 1.0 keeps the strict clamp, higher values stop clamping legitimate damage but also raise what a packet editor can deal', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'summon_max_damage_rate');

-- ---------- 狙击固定伤害 ----------

-- 神射手的狙击是固定伤害，原先写死 195000（上限 200000）。LK 直接三倍到 595000。
-- 这里默认保持原值；改这个键会同时抬高该技能的伤害与其专属上限。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'marksman_snipe_damage', '195000', 'marksman_snipe_damage', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'marksman_snipe_damage');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'marksman_snipe_damage', '神射手狙击的固定伤害基数（实际伤害为该值加0~5000随机），伤害上限自动取该值加5000', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'marksman_snipe_damage');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'marksman_snipe_damage', 'Base fixed damage for Marksman Snipe (actual damage adds 0-5000 random); the damage cap follows as this value plus 5000', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'marksman_snipe_damage');

-- ---------------------------------------------------------------------------
-- [V1000.0.16] insert_game_config_level_cap_and_world_name.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G10：等级上限与大区显示名。
--
-- 等级上限在两处判定，两处取同一套配置，缺一个配置就等于不生效：
--   · GameConstants.getJobMaxLevel  —— 仅当 use_enforce_job_level_range 打开时才走到
--   · Character.getMaxClassLevel    —— 默认路径（use_enforce_job_level_range 默认 false）
-- 代码侧对两个键都做了「非正数回落到原硬编码值」的兜底，并把上界钳在 255——
-- 角色等级在多处封包里是单字节，256 会绕回 0，客户端看到的等级就乱了。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_level_cap', '200', 'max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_level_cap', '普通职业的等级上限，原版为200，有效范围1-255（等级在封包中为单字节）', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_level_cap', 'Level cap for regular jobs; vanilla is 200, valid range 1-255 (level is a single byte on the wire)', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_level_cap');

-- 骑士团原版上限是 120，这里按运营决定放到 155。客户端在 v83 是按 120 设计的，
-- 超过之后的表现（经验表、称号、部分 UI）未经验证，调整前先在测试环境确认。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'cygnus_max_level_cap', '155', 'cygnus_max_level_cap', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'cygnus_max_level_cap', '骑士团职业的等级上限，原版为120，有效范围1-255', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'cygnus_max_level_cap');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'cygnus_max_level_cap', 'Level cap for Cygnus Knights; vanilla is 120, valid range 1-255', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'cygnus_max_level_cap');

-- 大区显示名。这个字符串随服务器列表发给客户端显示，属运营品牌信息而非界面文案，
-- 所以走 game_config 的 world 段而不是 i18n（它不该随玩家语言变化）。
-- 配置缺失时代码回落到 GameConstants.WORLD_NAMES 的原名。
-- 注意：英文客户端的出包字符集是 US-ASCII，编不出来的字符会被丢掉（不是变问号），
-- 所以「枫之大陆MapleLand」在中文客户端是全名，在英文客户端显示为「MapleLand」。
-- 想让两种客户端看到完全一致的名字，就只用 ASCII 字符。
INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'world', '0', 'java.lang.String', 'world_name', '枫之大陆MapleLand', 'world_name', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_type` = 'world' AND `config_sub_type` = '0' AND `config_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'world_name', '大区名称，显示在登录后的服务器列表上', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'world_name');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'world_name', 'World name shown in the server list after login', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'world_name');

-- ---------------------------------------------------------------------------
-- [V1000.0.17] insert_recall_config_and_command.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G12：活动召回的时限与冷却，以及 @recall 指令注册。
--
-- 整套召回功能由已有的 use_enable_recall_event 总开关控制（V1.7.0 里默认 false）。
-- 下面两个键只在总开关打开后才有意义。
--
-- 已知取舍：v83 客户端退出游戏与网络掉线都是直接关 socket，服务端无法区分，
-- 所以「快死了先退游戏、再登回来」的玩家也会在时限内被放回活动，等于免掉了脱战的代价。
-- 这是当前有意接受的行为。异常状态本身不会被刷掉（playerdiseases 表持久化了剩余时长，
-- 登录时会重新施加），所以收益有限。要收紧就把 max_recall_time 调短。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'max_recall_time', '10', 'max_recall_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'max_recall_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'max_recall_time', '掉出活动后多少分钟内登录仍会被自动放回该活动；超过则不再召回', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'max_recall_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'max_recall_time', 'Minutes after dropping out of an event during which logging in still puts the player back into it', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'max_recall_time');

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'recall_cooldown', '10', 'recall_cooldown', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'recall_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'recall_cooldown', '两次自动召回之间的最小间隔（分钟）；GM 手动 @recall 不受此限制', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'recall_cooldown');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'recall_cooldown', 'Minimum minutes between two automatic recalls; the GM @recall command is not subject to this', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'recall_cooldown');

-- @recall：把掉线重连的玩家放回原来的活动实例。
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类）。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'recall', 2, 1, 'RecallCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'recall');

-- ---------------------------------------------------------------------------
-- [V1000.0.18] insert_game_config_merchant_expire.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G13：雇佣商店存续天数。
--
-- 计数器在 World.runHiredMerchantSchedule 里每 10 分钟加 1（HiredMerchantTask 的注册周期），
-- 144 跳 = 24 小时，所以这个键的单位是「天」。原版写死 144，即 1 天。
--
-- 两处代码都读这个键，且都对「配置缺失（getServerInt 返回 0）」回落到 1：
--   · World.runHiredMerchantSchedule —— 到期强关。缺兜底的话 0 * 144 = 0，
--     商店会在第二个 10 分钟跳就被 forceClose，等于全服商店 10 分钟暴毙。
--   · HiredMerchant.getTimeOpen      —— 店主界面的已开时长。客户端这一格只按 1 天量程渲染，
--     所以把已开时长整体前移 (天数-1) 天，多出来的存续期才能在界面上表达出来。
--     该值以 short 出包，配到 13 天以上会溢出，代码里已钳在 Short.MAX_VALUE。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Integer', 'merchant_expire_time', '3', 'merchant_expire_time', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'merchant_expire_time', '雇佣商店摆摊后自动关闭前的存续天数，原版为1天；超过13天店主界面的时长显示会失真', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'merchant_expire_time');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'merchant_expire_time', 'Days a hired merchant stays up before it is force-closed; vanilla is 1. Above 13 days the owner-side time display saturates', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'merchant_expire_time');

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
-- [V1000.0.20] insert_game_config_quest_hp_pill.sql
-- ---------------------------------------------------------------------------
-- 批次 6 · G15：完成不可重复任务额外发一颗小血液精华。
--
-- 默认 false，开之前务必先算账：
--   BeiDou 的 wz 里 QuestInfo.img 有 2819 个任务条目，Check.img 里带 interval（可重复）的 528 个，
--   即约 2290 个不可重复任务。一颗小血液精华永久 +10 血上限，全清就是 +22900，
--   而 AbstractCharacterObject 把客户端血上限钳在 30000 —— 等于加点加血彻底失去意义。
--   法师换算是 +4580 血 / +18320 魔。
--
-- 原作者写过「任务 MIN_LEVEL >= 30 且角色等级 > 70 才给」的门槛，但那段代码是注释掉的，
-- 活代码只判了「不可重复」。这里按原样移植，是否收紧留给运营决定。
--
-- 前置：物品 2000100 / 2000101 不是原版物品，BeiDou 的 wz 里还没有。
-- 补上 Item.wz/Consume/0200.img 与 String.wz/Consume.img 之前，开这个开关只会发出无名道具。

INSERT INTO `game_config`(`config_type`, `config_sub_type`, `config_clazz`, `config_code`, `config_value`, `config_desc`, `update_time`)
SELECT 'server', 'Game Mechanics', 'java.lang.Boolean', 'use_quest_hp_pill', 'false', 'use_quest_hp_pill', '2026-08-16 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM `game_config` WHERE `config_code` = 'use_quest_hp_pill');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'zh-CN', 'game_config', 'use_quest_hp_pill', '完成不可重复任务时额外发一颗小血液精华（永久+10血上限）；开启前需先补齐物品2000101的wz数据', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'zh-CN' AND `lang_code` = 'use_quest_hp_pill');

INSERT INTO `lang_resources`(`lang_type`, `lang_base`, `lang_code`, `lang_value`, `lang_extend`)
SELECT 'en-US', 'game_config', 'use_quest_hp_pill', 'Grant a small HP pill (permanent +10 max HP) on completing a non-repeatable quest; requires the wz data for item 2000101 first', NULL
WHERE NOT EXISTS (SELECT 1 FROM `lang_resources` WHERE `lang_type` = 'en-US' AND `lang_code` = 'use_quest_hp_pill');

-- ---------------------------------------------------------------------------
-- [V1000.1.1] alter_drop_data_add_distinctive.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · drop_data 增加 distinctive 列（LK dd995ac5「add distictive drop option」）。
--
-- LK 的建列语句只存在于 db_LichKingMod_patch.sql 顶部的注释里（他们手工执行过），
-- 语义：distinctive = 1 的掉落在客户端有专属指示（祝福/混沌/龙链等稀有物掉落提示，
-- 见 LK 25bdb19a「祝福、混沌和龙链掉落有指示」）。
-- 读取方 MonsterDropEntry / MonsterInformationProvider 的 Java 改动归批次 7 Java 组，
-- 列先行：后续 V1000.1.x 的掉落数据要写这一列。
ALTER TABLE `drop_data`
    ADD COLUMN `distinctive` TINYINT NOT NULL DEFAULT 0 AFTER `chance`;

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

-- ---------------------------------------------------------------------------
-- [V1000.1.3] lk_boss_scroll_nx_drops.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- [V1000.1.7] lk_nxcoupons_float_rate.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- [V1000.1.8] lk_gachapon_pool_rebalance.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · 扭蛋奖池再平衡（来源 LichKingMod b0671161..ac7830b5 的 server/gachapon/*.java）。
--
-- LK 把奖池调整写在 15 个硬编码的 GachaponItems 子类里；BeiDou 运行时走
-- GachaponService + gachapon_reward(_pool)，那些 Java 数组只剩数据用途（process()
-- 全仓库零调用）。所以这里把 LK 的数组增量转成数据迁移。
--
-- 对齐前提（已逐项核对）：BeiDou 的 server/gachapon/*.java 与 LK 基线 HeavenMS 2022
-- 逐项一致（只差 Cosmic 删掉的 4006000），且 V1.4.0 的种子 = 城市数组 + Global 数组合并，
-- 所以 LK 的 base->HEAD 增量可以直接套到 pool 1-36 上。
--
-- 奖池编号：pool = 城市序号 + 1 + 档位偏移（普通 +0 / 稀有 +12 / 传奇 +24），
-- 城市序号 0-11 = 9100100..9100110, 9100117（射手村…诺特勒斯号）。
-- Global 是 BeiDou 种子里合并进每个城镇池的公共奖品，因此它的增量要广播到 12 个同档池。
--
-- 三条 LK 的删除被跳过：林中之城普通档移出 2000004 / 2000005 / 2020012，但这三项在
-- LK 侧仍由 Global 供给，BeiDou 合并后删掉会让它们彻底消失，与 LK 实际效果不符。
--
-- 未移植：LK 把档位权重从 90/8/2 改成 120/8/2（澡堂 120/5/1、诺特勒斯 120/8/1）。
-- 那是纯运营口味，BeiDou 在 gms-ui 里可调（gachapon_reward_pool.weight），不写死进迁移。
--
-- 本次改动的三条主线：
--   1. 传奇档补齐：12 个城镇的传奇池原本只有 Global 兜底的 4 项，LK 给每个城镇配了
--      专属椅子与稀有装备（枫树下/世界末日/血色玫瑰/虎虎生威/北极熊椅子/酋长宝座/钓鱼用椅子…）。
--   2. 公共奖品换血：消耗类稀有品（纳瑞坎的恶魔药剂/甜甜的爱心/水晶菠萝糖）与两把抱枕椅移出，
--      换成中等强化宝石与水晶（4250001/4250101/4251301/4251401/4250801/4250901/4251001/4251101）——
--      与 V1000.1.5 的「中等宝石可直接从矿石合成」是同一套设计，扭蛋成为制作系统的原料来源。
--   3. 城镇池按主题重排：卷轴补齐 1%/10%/60% 配对，昭和男女澡堂补足装备（85->176 / 45->173），
--      林中之城收窄（移出 65 项药水与杂装，聚焦本地掉落）。
--
-- 写法：先 DELETE 同 (pool_id, item_id) 再 INSERT，保证可重复执行且不产生重复行。
-- 注意 gachapon_reward 允许同一奖池重复登记同一道具来加权（doReward 在行上均匀抽），
-- 若运营在 gms-ui 里手工加过权，本迁移会把涉及的道具收敛回一行。

-- 公共奖品 -> 12 个城镇的稀有池
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((13,2022282),(14,2022282),(15,2022282),(16,2022282),(17,2022282),(18,2022282),(19,2022282),(20,2022282),(21,2022282),(22,2022282),(23,2022282),(24,2022282),(13,2022285),(14,2022285),(15,2022285),(16,2022285),(17,2022285),(18,2022285),(19,2022285),(20,2022285),(21,2022285),(22,2022285),(23,2022285),(24,2022285),(13,2022182),(14,2022182),(15,2022182),(16,2022182),(17,2022182),(18,2022182),(19,2022182),(20,2022182),(21,2022182),(22,2022182),(23,2022182),(24,2022182));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((13,4250801),(14,4250801),(15,4250801),(16,4250801),(17,4250801),(18,4250801),(19,4250801),(20,4250801),(21,4250801),(22,4250801),(23,4250801),(24,4250801),(13,4251001),(14,4251001),(15,4251001),(16,4251001),(17,4251001),(18,4251001),(19,4251001),(20,4251001),(21,4251001),(22,4251001),(23,4251001),(24,4251001),(13,4251101),(14,4251101),(15,4251101),(16,4251101),(17,4251101),(18,4251101),(19,4251101),(20,4251101),(21,4251101),(22,4251101),(23,4251101),(24,4251101),(13,4250901),(14,4250901),(15,4250901),(16,4250901),(17,4250901),(18,4250901),(19,4250901),(20,4250901),(21,4250901),(22,4250901),(23,4250901),(24,4250901));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (13,4250801,1,NOW(),'LK'),(14,4250801,1,NOW(),'LK'),(15,4250801,1,NOW(),'LK'),(16,4250801,1,NOW(),'LK'),(17,4250801,1,NOW(),'LK'),(18,4250801,1,NOW(),'LK'),(19,4250801,1,NOW(),'LK'),(20,4250801,1,NOW(),'LK'),(21,4250801,1,NOW(),'LK'),(22,4250801,1,NOW(),'LK'),(23,4250801,1,NOW(),'LK'),(24,4250801,1,NOW(),'LK'),(13,4251001,1,NOW(),'LK'),(14,4251001,1,NOW(),'LK'),(15,4251001,1,NOW(),'LK'),(16,4251001,1,NOW(),'LK'),(17,4251001,1,NOW(),'LK'),(18,4251001,1,NOW(),'LK'),(19,4251001,1,NOW(),'LK'),(20,4251001,1,NOW(),'LK'),(21,4251001,1,NOW(),'LK'),(22,4251001,1,NOW(),'LK'),(23,4251001,1,NOW(),'LK'),(24,4251001,1,NOW(),'LK'),(13,4251101,1,NOW(),'LK'),(14,4251101,1,NOW(),'LK'),(15,4251101,1,NOW(),'LK'),(16,4251101,1,NOW(),'LK'),(17,4251101,1,NOW(),'LK'),(18,4251101,1,NOW(),'LK'),(19,4251101,1,NOW(),'LK'),(20,4251101,1,NOW(),'LK'),(21,4251101,1,NOW(),'LK'),(22,4251101,1,NOW(),'LK'),(23,4251101,1,NOW(),'LK'),(24,4251101,1,NOW(),'LK'),(13,4250901,1,NOW(),'LK'),(14,4250901,1,NOW(),'LK'),(15,4250901,1,NOW(),'LK'),(16,4250901,1,NOW(),'LK'),(17,4250901,1,NOW(),'LK'),(18,4250901,1,NOW(),'LK'),(19,4250901,1,NOW(),'LK'),(20,4250901,1,NOW(),'LK'),(21,4250901,1,NOW(),'LK'),(22,4250901,1,NOW(),'LK'),(23,4250901,1,NOW(),'LK'),(24,4250901,1,NOW(),'LK');

-- 公共奖品 -> 12 个城镇的传奇池
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((25,3010063),(26,3010063),(27,3010063),(28,3010063),(29,3010063),(30,3010063),(31,3010063),(32,3010063),(33,3010063),(34,3010063),(35,3010063),(36,3010063),(25,3010064),(26,3010064),(27,3010064),(28,3010064),(29,3010064),(30,3010064),(31,3010064),(32,3010064),(33,3010064),(34,3010064),(35,3010064),(36,3010064));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((25,2022282),(26,2022282),(27,2022282),(28,2022282),(29,2022282),(30,2022282),(31,2022282),(32,2022282),(33,2022282),(34,2022282),(35,2022282),(36,2022282),(25,4250001),(26,4250001),(27,4250001),(28,4250001),(29,4250001),(30,4250001),(31,4250001),(32,4250001),(33,4250001),(34,4250001),(35,4250001),(36,4250001),(25,4250101),(26,4250101),(27,4250101),(28,4250101),(29,4250101),(30,4250101),(31,4250101),(32,4250101),(33,4250101),(34,4250101),(35,4250101),(36,4250101),(25,4251301),(26,4251301),(27,4251301),(28,4251301),(29,4251301),(30,4251301),(31,4251301),(32,4251301),(33,4251301),(34,4251301),(35,4251301),(36,4251301),(25,4251401),(26,4251401),(27,4251401),(28,4251401),(29,4251401),(30,4251401),(31,4251401),(32,4251401),(33,4251401),(34,4251401),(35,4251401),(36,4251401));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (25,2022282,1,NOW(),'LK'),(26,2022282,1,NOW(),'LK'),(27,2022282,1,NOW(),'LK'),(28,2022282,1,NOW(),'LK'),(29,2022282,1,NOW(),'LK'),(30,2022282,1,NOW(),'LK'),(31,2022282,1,NOW(),'LK'),(32,2022282,1,NOW(),'LK'),(33,2022282,1,NOW(),'LK'),(34,2022282,1,NOW(),'LK'),(35,2022282,1,NOW(),'LK'),(36,2022282,1,NOW(),'LK'),(25,4250001,1,NOW(),'LK'),(26,4250001,1,NOW(),'LK'),(27,4250001,1,NOW(),'LK'),(28,4250001,1,NOW(),'LK'),(29,4250001,1,NOW(),'LK'),(30,4250001,1,NOW(),'LK'),(31,4250001,1,NOW(),'LK'),(32,4250001,1,NOW(),'LK'),(33,4250001,1,NOW(),'LK'),(34,4250001,1,NOW(),'LK'),(35,4250001,1,NOW(),'LK'),(36,4250001,1,NOW(),'LK'),(25,4250101,1,NOW(),'LK'),(26,4250101,1,NOW(),'LK'),(27,4250101,1,NOW(),'LK'),(28,4250101,1,NOW(),'LK'),(29,4250101,1,NOW(),'LK'),(30,4250101,1,NOW(),'LK'),(31,4250101,1,NOW(),'LK'),(32,4250101,1,NOW(),'LK'),(33,4250101,1,NOW(),'LK'),(34,4250101,1,NOW(),'LK'),(35,4250101,1,NOW(),'LK'),(36,4250101,1,NOW(),'LK'),(25,4251301,1,NOW(),'LK'),(26,4251301,1,NOW(),'LK'),(27,4251301,1,NOW(),'LK'),(28,4251301,1,NOW(),'LK'),(29,4251301,1,NOW(),'LK'),(30,4251301,1,NOW(),'LK'),(31,4251301,1,NOW(),'LK'),(32,4251301,1,NOW(),'LK'),(33,4251301,1,NOW(),'LK'),(34,4251301,1,NOW(),'LK'),(35,4251301,1,NOW(),'LK'),(36,4251301,1,NOW(),'LK'),(25,4251401,1,NOW(),'LK'),(26,4251401,1,NOW(),'LK'),(27,4251401,1,NOW(),'LK'),(28,4251401,1,NOW(),'LK'),(29,4251401,1,NOW(),'LK'),(30,4251401,1,NOW(),'LK'),(31,4251401,1,NOW(),'LK'),(32,4251401,1,NOW(),'LK'),(33,4251401,1,NOW(),'LK'),(34,4251401,1,NOW(),'LK'),(35,4251401,1,NOW(),'LK'),(36,4251401,1,NOW(),'LK');

-- 射手村（普通 pool 1）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((1,2040001),(1,2041002),(1,2040702),(1,2043802),(1,2040402),(1,2043702),(1,2044813));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((1,2044502),(1,2044501),(1,2044602),(1,2044601));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (1,2044502,1,NOW(),'LK'),(1,2044501,1,NOW(),'LK'),(1,2044602,1,NOW(),'LK'),(1,2044601,1,NOW(),'LK');

-- 射手村（稀有 pool 13）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((13,1102041),(13,1102042),(13,1442018));

-- 射手村（传奇 pool 25）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((25,3010061));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (25,3010061,1,NOW(),'LK');

-- 魔法密林（普通 pool 2）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((2,2043302),(2,2043102),(2,2043002),(2,2044402),(2,2044302),(2,2044002),(2,2044902));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((2,2043801),(2,2043702),(2,2043701));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (2,2043801,1,NOW(),'LK'),(2,2043702,1,NOW(),'LK'),(2,2043701,1,NOW(),'LK');

-- 魔法密林（稀有 pool 14）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((14,1002419));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((14,2040920));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (14,2040920,1,NOW(),'LK');

-- 魔法密林（传奇 pool 26）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((26,1372039),(26,1372040),(26,1372041),(26,1372042),(26,2040919));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (26,1372039,1,NOW(),'LK'),(26,1372040,1,NOW(),'LK'),(26,1372041,1,NOW(),'LK'),(26,1372042,1,NOW(),'LK'),(26,2040919,1,NOW(),'LK');

-- 勇士部落（普通 pool 3）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((3,2044907),(3,2044802),(3,1402037));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((3,2044302),(3,2044301),(3,2044402),(3,2044401),(3,2043002),(3,2043001),(3,2044002),(3,2044001));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (3,2044302,1,NOW(),'LK'),(3,2044301,1,NOW(),'LK'),(3,2044402,1,NOW(),'LK'),(3,2044401,1,NOW(),'LK'),(3,2043002,1,NOW(),'LK'),(3,2043001,1,NOW(),'LK'),(3,2044002,1,NOW(),'LK'),(3,2044001,1,NOW(),'LK');

-- 勇士部落（稀有 pool 15）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((15,1002419),(15,1102041));

-- 勇士部落（传奇 pool 27）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((27,1102041),(27,1442057));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (27,1102041,1,NOW(),'LK'),(27,1442057,1,NOW(),'LK');

-- 废弃都市（普通 pool 4）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((4,2041016),(4,2044804),(4,2044906),(4,1102040));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((4,2044702),(4,2044701),(4,2043301));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (4,2044702,1,NOW(),'LK'),(4,2044701,1,NOW(),'LK'),(4,2043301,1,NOW(),'LK');

-- 废弃都市（稀有 pool 16）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((16,1102041));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((16,2040915));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (16,2040915,1,NOW(),'LK');

-- 废弃都市（传奇 pool 28）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((28,1102041),(28,2040914),(28,1092049));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (28,1102041,1,NOW(),'LK'),(28,2040914,1,NOW(),'LK'),(28,1092049,1,NOW(),'LK');

-- 林中之城（普通 pool 5）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((5,2012000),(5,2012003),(5,2020007),(5,2012001),(5,2020008),(5,2012002),(5,2002001),(5,2070005),(5,1032000),(5,1102017),(5,1402017),(5,1051010),(5,1432011),(5,1442006),(5,1322002),(5,1422004),(5,1432010),(5,1051011),(5,1060018),(5,1432000),(5,1422003),(5,1412003),(5,1422000),(5,1002034),(5,1002142),(5,1382010),(5,1002013),(5,1382008),(5,1382011),(5,1050047),(5,1002065),(5,1452003),(5,1002165),(5,1040068),(5,1462013),(5,1462011),(5,1462012),(5,1061050),(5,1462010),(5,1002161),(5,1332022),(5,1002175),(5,1040042),(5,1472004),(5,1040057),(5,1332031),(5,1332023),(5,1332010),(5,1002171),(5,1060046),(5,1002631),(5,1002634),(5,1002637),(5,1052116),(5,1052119),(5,1052122),(5,1072303),(5,1072306),(5,1072309),(5,1082198),(5,1082201),(5,1082204),(5,1482007),(5,1482008),(5,1482009));

-- 林中之城（稀有 pool 17）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((17,2040804),(17,2040817),(17,2340000),(17,1442018));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((17,2040816));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (17,2040816,1,NOW(),'LK');

-- 林中之城（传奇 pool 29）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((29,2040804),(29,2040817),(29,3010058),(29,3010057));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (29,2040804,1,NOW(),'LK'),(29,2040817,1,NOW(),'LK'),(29,3010058,1,NOW(),'LK'),(29,3010057,1,NOW(),'LK');

-- 蘑菇神社（普通 pool 6）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((6,1102040),(6,1432018),(6,1402037));

-- 蘑菇神社（稀有 pool 18）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((18,1102041),(18,1082149));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((18,2040921),(18,1102040));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (18,2040921,1,NOW(),'LK'),(18,1102040,1,NOW(),'LK');

-- 蘑菇神社（传奇 pool 30）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((30,3010019));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((30,1102041));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (30,1102041,1,NOW(),'LK');

-- 昭和男澡堂（普通 pool 7）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((7,1332020),(7,1312004),(7,1332032),(7,1322023),(7,1322026),(7,1322022),(7,1082148),(7,1032027),(7,1032032),(7,1102028),(7,1102086),(7,3010073),(7,3010111),(7,1302008),(7,1462002),(7,1462007),(7,1462003),(7,1002169),(7,1332029));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((7,1422013),(7,1322020),(7,1312007),(7,1312008),(7,1312006),(7,1082036),(7,1082117),(7,1302018),(7,1322017),(7,1422001),(7,1040103),(7,1060077),(7,1002022),(7,1002050),(7,1442000),(7,1432030),(7,1092002),(7,1041092),(7,1322014),(7,1432005),(7,1050002),(7,1002152),(7,1051027),(7,1050035),(7,1050056),(7,1051047),(7,1051030),(7,1002274),(7,1050074),(7,1002218),(7,1002254),(7,1082088),(7,1382007),(7,1002013),(7,1082087),(7,1372008),(7,1382008),(7,1372002),(7,1372003),(7,1382011),(7,1382004),(7,1050047),(7,1040019),(7,1041041),(7,1061034),(7,1041051),(7,1051045),(7,1051024),(7,1082081),(7,1041030),(7,1040018),(7,1002073),(7,1382003),(7,1082086),(7,1050055),(7,1050025),(7,1002155),(7,1060015),(7,1452004),(7,1452023),(7,1060057),(7,1432001),(7,1040071),(7,1002137),(7,1462009),(7,1452017),(7,1040025),(7,1041027),(7,1452007),(7,1061057),(7,1472010),(7,1472029),(7,1041048),(7,1041095),(7,1060031),(7,1061033),(7,1041049),(7,1472011),(7,1040096),(7,1472033),(7,1332026),(7,1051006),(7,1082074),(7,1472025),(7,1061106),(7,1040084),(7,1332015),(7,1472000),(7,1332019),(7,1002183),(7,1002209),(7,1092020),(7,1482011),(7,1492000),(7,1492002),(7,1492004),(7,1492006),(7,1492008),(7,1492010),(7,1492012),(7,1002613),(7,1002619),(7,1002625),(7,1002631),(7,1002643),(7,1052098),(7,1052104),(7,1052110),(7,1052116),(7,1052122));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (7,1422013,1,NOW(),'LK'),(7,1322020,1,NOW(),'LK'),(7,1312007,1,NOW(),'LK'),(7,1312008,1,NOW(),'LK'),(7,1312006,1,NOW(),'LK'),(7,1082036,1,NOW(),'LK'),(7,1082117,1,NOW(),'LK'),(7,1302018,1,NOW(),'LK'),(7,1322017,1,NOW(),'LK'),(7,1422001,1,NOW(),'LK'),(7,1040103,1,NOW(),'LK'),(7,1060077,1,NOW(),'LK'),(7,1002022,1,NOW(),'LK'),(7,1002050,1,NOW(),'LK'),(7,1442000,1,NOW(),'LK'),(7,1432030,1,NOW(),'LK'),(7,1092002,1,NOW(),'LK'),(7,1041092,1,NOW(),'LK'),(7,1322014,1,NOW(),'LK'),(7,1432005,1,NOW(),'LK'),(7,1050002,1,NOW(),'LK'),(7,1002152,1,NOW(),'LK'),(7,1051027,1,NOW(),'LK'),(7,1050035,1,NOW(),'LK'),(7,1050056,1,NOW(),'LK'),(7,1051047,1,NOW(),'LK'),(7,1051030,1,NOW(),'LK'),(7,1002274,1,NOW(),'LK'),(7,1050074,1,NOW(),'LK'),(7,1002218,1,NOW(),'LK'),(7,1002254,1,NOW(),'LK'),(7,1082088,1,NOW(),'LK'),(7,1382007,1,NOW(),'LK'),(7,1002013,1,NOW(),'LK'),(7,1082087,1,NOW(),'LK'),(7,1372008,1,NOW(),'LK'),(7,1382008,1,NOW(),'LK'),(7,1372002,1,NOW(),'LK'),(7,1372003,1,NOW(),'LK'),(7,1382011,1,NOW(),'LK'),(7,1382004,1,NOW(),'LK'),(7,1050047,1,NOW(),'LK'),(7,1040019,1,NOW(),'LK'),(7,1041041,1,NOW(),'LK'),(7,1061034,1,NOW(),'LK'),(7,1041051,1,NOW(),'LK'),(7,1051045,1,NOW(),'LK'),(7,1051024,1,NOW(),'LK'),(7,1082081,1,NOW(),'LK'),(7,1041030,1,NOW(),'LK'),(7,1040018,1,NOW(),'LK'),(7,1002073,1,NOW(),'LK'),(7,1382003,1,NOW(),'LK'),(7,1082086,1,NOW(),'LK'),(7,1050055,1,NOW(),'LK'),(7,1050025,1,NOW(),'LK'),(7,1002155,1,NOW(),'LK'),(7,1060015,1,NOW(),'LK'),(7,1452004,1,NOW(),'LK'),(7,1452023,1,NOW(),'LK'),(7,1060057,1,NOW(),'LK'),(7,1432001,1,NOW(),'LK'),(7,1040071,1,NOW(),'LK'),(7,1002137,1,NOW(),'LK'),(7,1462009,1,NOW(),'LK'),(7,1452017,1,NOW(),'LK'),(7,1040025,1,NOW(),'LK'),(7,1041027,1,NOW(),'LK'),(7,1452007,1,NOW(),'LK'),(7,1061057,1,NOW(),'LK'),(7,1472010,1,NOW(),'LK'),(7,1472029,1,NOW(),'LK'),(7,1041048,1,NOW(),'LK'),(7,1041095,1,NOW(),'LK'),(7,1060031,1,NOW(),'LK'),(7,1061033,1,NOW(),'LK'),(7,1041049,1,NOW(),'LK'),(7,1472011,1,NOW(),'LK'),(7,1040096,1,NOW(),'LK'),(7,1472033,1,NOW(),'LK'),(7,1332026,1,NOW(),'LK'),(7,1051006,1,NOW(),'LK'),(7,1082074,1,NOW(),'LK'),(7,1472025,1,NOW(),'LK'),(7,1061106,1,NOW(),'LK'),(7,1040084,1,NOW(),'LK'),(7,1332015,1,NOW(),'LK'),(7,1472000,1,NOW(),'LK'),(7,1332019,1,NOW(),'LK'),(7,1002183,1,NOW(),'LK'),(7,1002209,1,NOW(),'LK'),(7,1092020,1,NOW(),'LK'),(7,1482011,1,NOW(),'LK'),(7,1492000,1,NOW(),'LK'),(7,1492002,1,NOW(),'LK'),(7,1492004,1,NOW(),'LK'),(7,1492006,1,NOW(),'LK'),(7,1492008,1,NOW(),'LK'),(7,1492010,1,NOW(),'LK'),(7,1492012,1,NOW(),'LK'),(7,1002613,1,NOW(),'LK'),(7,1002619,1,NOW(),'LK'),(7,1002625,1,NOW(),'LK'),(7,1002631,1,NOW(),'LK'),(7,1002643,1,NOW(),'LK'),(7,1052098,1,NOW(),'LK'),(7,1052104,1,NOW(),'LK'),(7,1052110,1,NOW(),'LK'),(7,1052116,1,NOW(),'LK'),(7,1052122,1,NOW(),'LK');

-- 昭和男澡堂（稀有 pool 19）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((19,1012098),(19,1012101),(19,1012102),(19,1012103));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (19,1012098,1,NOW(),'LK'),(19,1012101,1,NOW(),'LK'),(19,1012102,1,NOW(),'LK'),(19,1012103,1,NOW(),'LK');

-- 昭和男澡堂（传奇 pool 31）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((31,3010111));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (31,3010111,1,NOW(),'LK');

-- 昭和女澡堂（普通 pool 8）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((8,1402013),(8,1002418),(8,1082178),(8,3010073),(8,3010099),(8,1002209));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((8,1082148),(8,1032027),(8,1032032),(8,1102028),(8,1102086),(8,1332020),(8,1312004),(8,1332032),(8,1322023),(8,1322026),(8,1322022),(8,1322020),(8,1312007),(8,1312008),(8,1302004),(8,1312006),(8,1082036),(8,1082117),(8,1061088),(8,1302008),(8,1422005),(8,1002048),(8,1061087),(8,1302018),(8,1322017),(8,1422001),(8,1040103),(8,1060077),(8,1002022),(8,1002050),(8,1442000),(8,1092002),(8,1041092),(8,1322014),(8,1432005),(8,1382001),(8,1002037),(8,1060014),(8,1040018),(8,1061027),(8,1050002),(8,1002152),(8,1051027),(8,1050035),(8,1050056),(8,1051047),(8,1051030),(8,1002274),(8,1050074),(8,1002218),(8,1002254),(8,1082088),(8,1382007),(8,1002013),(8,1082087),(8,1372008),(8,1382008),(8,1372003),(8,1382011),(8,1382004),(8,1050047),(8,1040019),(8,1041041),(8,1061034),(8,1041051),(8,1051045),(8,1051024),(8,1082081),(8,1041030),(8,1002073),(8,1082086),(8,1382014),(8,1050055),(8,1050025),(8,1002155),(8,1060015),(8,1462002),(8,1462007),(8,1462003),(8,1002169),(8,1452004),(8,1452023),(8,1060057),(8,1432001),(8,1040071),(8,1002137),(8,1462009),(8,1452017),(8,1040025),(8,1041027),(8,1452005),(8,1452007),(8,1061057),(8,1472010),(8,1472029),(8,1041048),(8,1041095),(8,1060031),(8,1061033),(8,1041049),(8,1472011),(8,1040096),(8,1472033),(8,1332026),(8,1332029),(8,1092019),(8,1061099),(8,1060106),(8,1040032),(8,1040059),(8,1040060),(8,1060046),(8,1472005),(8,1332027),(8,1002610),(8,1002616),(8,1002622),(8,1002628),(8,1002634),(8,1002640),(8,1052095),(8,1052101),(8,1052107),(8,1052113),(8,1052119),(8,1052125),(8,1052131),(8,1072285),(8,1072291),(8,1072297),(8,1072303),(8,1072309),(8,1072315));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (8,1082148,1,NOW(),'LK'),(8,1032027,1,NOW(),'LK'),(8,1032032,1,NOW(),'LK'),(8,1102028,1,NOW(),'LK'),(8,1102086,1,NOW(),'LK'),(8,1332020,1,NOW(),'LK'),(8,1312004,1,NOW(),'LK'),(8,1332032,1,NOW(),'LK'),(8,1322023,1,NOW(),'LK'),(8,1322026,1,NOW(),'LK'),(8,1322022,1,NOW(),'LK'),(8,1322020,1,NOW(),'LK'),(8,1312007,1,NOW(),'LK'),(8,1312008,1,NOW(),'LK'),(8,1302004,1,NOW(),'LK'),(8,1312006,1,NOW(),'LK'),(8,1082036,1,NOW(),'LK'),(8,1082117,1,NOW(),'LK'),(8,1061088,1,NOW(),'LK'),(8,1302008,1,NOW(),'LK'),(8,1422005,1,NOW(),'LK'),(8,1002048,1,NOW(),'LK'),(8,1061087,1,NOW(),'LK'),(8,1302018,1,NOW(),'LK'),(8,1322017,1,NOW(),'LK'),(8,1422001,1,NOW(),'LK'),(8,1040103,1,NOW(),'LK'),(8,1060077,1,NOW(),'LK'),(8,1002022,1,NOW(),'LK'),(8,1002050,1,NOW(),'LK'),(8,1442000,1,NOW(),'LK'),(8,1092002,1,NOW(),'LK'),(8,1041092,1,NOW(),'LK'),(8,1322014,1,NOW(),'LK'),(8,1432005,1,NOW(),'LK'),(8,1382001,1,NOW(),'LK'),(8,1002037,1,NOW(),'LK'),(8,1060014,1,NOW(),'LK'),(8,1040018,1,NOW(),'LK'),(8,1061027,1,NOW(),'LK'),(8,1050002,1,NOW(),'LK'),(8,1002152,1,NOW(),'LK'),(8,1051027,1,NOW(),'LK'),(8,1050035,1,NOW(),'LK'),(8,1050056,1,NOW(),'LK'),(8,1051047,1,NOW(),'LK'),(8,1051030,1,NOW(),'LK'),(8,1002274,1,NOW(),'LK'),(8,1050074,1,NOW(),'LK'),(8,1002218,1,NOW(),'LK'),(8,1002254,1,NOW(),'LK'),(8,1082088,1,NOW(),'LK'),(8,1382007,1,NOW(),'LK'),(8,1002013,1,NOW(),'LK'),(8,1082087,1,NOW(),'LK'),(8,1372008,1,NOW(),'LK'),(8,1382008,1,NOW(),'LK'),(8,1372003,1,NOW(),'LK'),(8,1382011,1,NOW(),'LK'),(8,1382004,1,NOW(),'LK'),(8,1050047,1,NOW(),'LK'),(8,1040019,1,NOW(),'LK'),(8,1041041,1,NOW(),'LK'),(8,1061034,1,NOW(),'LK'),(8,1041051,1,NOW(),'LK'),(8,1051045,1,NOW(),'LK'),(8,1051024,1,NOW(),'LK'),(8,1082081,1,NOW(),'LK'),(8,1041030,1,NOW(),'LK'),(8,1002073,1,NOW(),'LK'),(8,1082086,1,NOW(),'LK'),(8,1382014,1,NOW(),'LK'),(8,1050055,1,NOW(),'LK'),(8,1050025,1,NOW(),'LK'),(8,1002155,1,NOW(),'LK'),(8,1060015,1,NOW(),'LK'),(8,1462002,1,NOW(),'LK'),(8,1462007,1,NOW(),'LK'),(8,1462003,1,NOW(),'LK'),(8,1002169,1,NOW(),'LK'),(8,1452004,1,NOW(),'LK'),(8,1452023,1,NOW(),'LK'),(8,1060057,1,NOW(),'LK'),(8,1432001,1,NOW(),'LK'),(8,1040071,1,NOW(),'LK'),(8,1002137,1,NOW(),'LK'),(8,1462009,1,NOW(),'LK'),(8,1452017,1,NOW(),'LK'),(8,1040025,1,NOW(),'LK'),(8,1041027,1,NOW(),'LK'),(8,1452005,1,NOW(),'LK'),(8,1452007,1,NOW(),'LK'),(8,1061057,1,NOW(),'LK'),(8,1472010,1,NOW(),'LK'),(8,1472029,1,NOW(),'LK'),(8,1041048,1,NOW(),'LK'),(8,1041095,1,NOW(),'LK'),(8,1060031,1,NOW(),'LK'),(8,1061033,1,NOW(),'LK'),(8,1041049,1,NOW(),'LK'),(8,1472011,1,NOW(),'LK'),(8,1040096,1,NOW(),'LK'),(8,1472033,1,NOW(),'LK'),(8,1332026,1,NOW(),'LK'),(8,1332029,1,NOW(),'LK'),(8,1092019,1,NOW(),'LK'),(8,1061099,1,NOW(),'LK'),(8,1060106,1,NOW(),'LK'),(8,1040032,1,NOW(),'LK'),(8,1040059,1,NOW(),'LK'),(8,1040060,1,NOW(),'LK'),(8,1060046,1,NOW(),'LK'),(8,1472005,1,NOW(),'LK'),(8,1332027,1,NOW(),'LK'),(8,1002610,1,NOW(),'LK'),(8,1002616,1,NOW(),'LK'),(8,1002622,1,NOW(),'LK'),(8,1002628,1,NOW(),'LK'),(8,1002634,1,NOW(),'LK'),(8,1002640,1,NOW(),'LK'),(8,1052095,1,NOW(),'LK'),(8,1052101,1,NOW(),'LK'),(8,1052107,1,NOW(),'LK'),(8,1052113,1,NOW(),'LK'),(8,1052119,1,NOW(),'LK'),(8,1052125,1,NOW(),'LK'),(8,1052131,1,NOW(),'LK'),(8,1072285,1,NOW(),'LK'),(8,1072291,1,NOW(),'LK'),(8,1072297,1,NOW(),'LK'),(8,1072303,1,NOW(),'LK'),(8,1072309,1,NOW(),'LK'),(8,1072315,1,NOW(),'LK');

-- 昭和女澡堂（稀有 pool 20）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((20,1012098),(20,1012101),(20,1012102),(20,1012103));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (20,1012098,1,NOW(),'LK'),(20,1012101,1,NOW(),'LK'),(20,1012102,1,NOW(),'LK'),(20,1012103,1,NOW(),'LK');

-- 昭和女澡堂（传奇 pool 32）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((32,3010099));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (32,3010099,1,NOW(),'LK');

-- 玩具城（稀有 pool 21）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((21,1002419),(21,1442018));

-- 新叶城（普通 pool 10）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((10,1102040));

-- 新叶城（稀有 pool 22）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((22,2022284),(22,1102041),(22,1102042),(22,1082149));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((22,1302033));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (22,1302033,1,NOW(),'LK');

-- 新叶城（传奇 pool 34）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((34,1402037),(34,4031917));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (34,1402037,1,NOW(),'LK'),(34,4031917,1,NOW(),'LK');

-- 冰峰雪域（普通 pool 11）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((11,1432018));

-- 冰峰雪域（稀有 pool 23）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((23,2340000));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((23,4001017));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (23,4001017,1,NOW(),'LK');

-- 冰峰雪域（传奇 pool 35）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((35,2043803));
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((35,1432018),(35,3010072));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (35,1432018,1,NOW(),'LK'),(35,3010072,1,NOW(),'LK');

-- 诺特勒斯号（传奇 pool 36）
DELETE FROM `gachapon_reward` WHERE (`pool_id`, `item_id`) IN ((36,3011000));
INSERT INTO `gachapon_reward` (`pool_id`, `item_id`, `quantity`, `create_time`, `comment`) VALUES (36,3011000,1,NOW(),'LK');

-- ---------------------------------------------------------------------------
-- [V1000.1.9] lk_gachapon_leafre.sql
-- ---------------------------------------------------------------------------
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
