-- 记录账号在每个来源 IP 上的最后登录时间。
-- 来源：LichKingMod 的 `loginHistroy` 表（原名拼写有误，此处更正为 login_history）。
-- 原表无主键，仅靠 UNIQUE(accountId, ip) 去重；MyBatis-Flex 的 BaseMapper 需要 @Id，
-- 因此补一个自增代理主键，去重仍由唯一键保证。
CREATE TABLE IF NOT EXISTS `login_history`
(
    `id`              INT(11)     NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `account_id`      INT(11)     NOT NULL COMMENT '账号id，对应accounts.id',
    `ip`              VARCHAR(64) NOT NULL COMMENT '登录来源IP，长度按IPv6预留',
    `last_login_time` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '该账号在此IP上的最后登录时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_account_ip` (`account_id`, `ip`),
    KEY `idx_account_id` (`account_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '账号登录IP历史表';
