CREATE TABLE IF NOT EXISTS `favorite_item`
(
    `id`          INT(11)      NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `type`        INT(11)      NOT NULL DEFAULT 5 COMMENT '对应发放资源类型：5=道具，6=装备',
    `item_id`     INT(11)      NOT NULL COMMENT '物品id',
    `item_name`   VARCHAR(128) NULL     COMMENT '物品名称，添加时按当时的wz数据缓存，仅供展示',
    `create_time` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_type_item` (`type`, `item_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '后台发放资源的常用物品收藏表';
