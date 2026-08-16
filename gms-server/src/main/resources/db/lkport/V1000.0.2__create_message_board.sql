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
