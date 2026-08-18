-- ---------------------------------------------------------------------------
-- LichKingMod -> BeiDou 移植：表结构（版本化迁移）
-- ---------------------------------------------------------------------------
--
-- 【为什么单独一个版本化文件】DDL 在 MySQL 里隐式提交，混进 R__ 可重复迁移的话，
--   重放失败会把表结构卡在半路且无法回滚。把 DDL 全部关在这里，R__ 就只剩纯 DML，
--   由 Flyway 包在单个事务里执行，失败可整体回滚。
--
-- 【可重放】本文件里的语句即使被重复执行也安全：CREATE TABLE 用 IF NOT EXISTS，
--   MODIFY COLUMN 天然幂等，ADD COLUMN 用 information_schema 判断后动态执行。
--
-- 【历史】原 db/lkport/V1000.0.1__lichkingmod_port.sql（29 节合一）已按功能拆分：
--   结构进本文件，数据进同目录的 R__lk_*.sql。旧版本号 1000.0.1~1000.1.9 在老库的
--   flyway_schema_history 里会显示为 missing——application.yml 关了 validate-on-migrate，无害。
-- ---------------------------------------------------------------------------

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
-- [V1000.1.1] alter_drop_data_add_distinctive.sql
-- ---------------------------------------------------------------------------
-- 批次 7 · drop_data 增加 distinctive 列（LK dd995ac5「add distictive drop option」）。
--
-- LK 的建列语句只存在于 db_LichKingMod_patch.sql 顶部的注释里（他们手工执行过），
-- 语义：distinctive = 1 的掉落在客户端有专属指示（祝福/混沌/龙链等稀有物掉落提示，
-- 见 LK 25bdb19a「祝福、混沌和龙链掉落有指示」）。
-- 读取方 MonsterDropEntry / MonsterInformationProvider 的 Java 改动归批次 7 Java 组，
-- 列先行：后续 V1000.1.x 的掉落数据要写这一列。
-- MySQL 不支持 ADD COLUMN IF NOT EXISTS，用 information_schema 判断后动态执行，
-- 这样本文件在已经有该列的库上重跑也不会报 1060 Duplicate column。
SET @ddl := IF(EXISTS(SELECT 1 FROM information_schema.`COLUMNS`
                      WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'drop_data' AND `COLUMN_NAME` = 'distinctive'),
               'DO 0',
               'ALTER TABLE `drop_data` ADD COLUMN `distinctive` TINYINT NOT NULL DEFAULT 0 AFTER `chance`');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- [V1000.1.7] alter_nxcoupons_float_rate.sql
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
