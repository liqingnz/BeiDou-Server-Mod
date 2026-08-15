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
