-- 全服留言板。来源：LichKingMod 的 `messageBoard` 表。
-- 原表用 TEXT 存名字与内容且无主键，这里改成定长 VARCHAR 并补自增主键：
-- LK 侧 MessageBoard.CHARACTER_LIMIT = 40（玩家输入上限），入库前会拼上角色名与颜色控制码，
-- 255 足够；MESSAGE_SIZE = 30 表示只保留最新 30 条，靠 create_time 排序淘汰，故加索引。
-- 原字段名 `time` 是 MySQL 关键字，改为 create_time。
CREATE TABLE IF NOT EXISTS `message_board`
(
    `id`             INT(11)      NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `character_id`   INT(11)      NOT NULL COMMENT '留言角色id',
    `character_name` VARCHAR(13)  NOT NULL COMMENT '留言角色名',
    `message`        VARCHAR(255) NOT NULL COMMENT '留言内容，含颜色控制码',
    `create_time`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '留言时间',
    PRIMARY KEY (`id`),
    KEY `idx_create_time` (`create_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '全服留言板';
