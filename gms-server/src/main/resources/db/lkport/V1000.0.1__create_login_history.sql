-- 记录账号用过哪些来源 IP，以及每个 IP 首次出现的时间。
-- 来源：LichKingMod 的 `loginHistroy` 表（原名拼写有误，此处更正为 login_history）。
--
-- 写入用 INSERT IGNORE 撞 uk_account_ip：同一 (账号, IP) 只在首次登录成功时落一行，
-- 之后重复登录会被唯一键挡掉、不更新时间。所以字段是 first 而非 last——
-- LichKingMod 原字段名叫 lastLoginTime 但行为是 first，这里按实际行为命名。
-- 「最近一次登录 IP」由 accounts.ip 承担，每次登录成功时覆盖。
--
-- 原表无主键，仅靠 UNIQUE(accountId, ip) 去重；MyBatis-Flex 的 BaseMapper 需要 @Id，
-- 因此补一个自增代理主键，去重仍由唯一键保证。
CREATE TABLE IF NOT EXISTS `login_history`
(
    `id`               INT(11)     NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `account_id`       INT(11)     NOT NULL COMMENT '账号id，对应accounts.id',
    `ip`               VARCHAR(64) NOT NULL COMMENT '登录来源IP，长度按IPv6预留',
    `first_login_time` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '该账号首次从此IP登录成功的时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_account_ip` (`account_id`, `ip`),
    KEY `idx_account_id` (`account_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  AUTO_INCREMENT = 1
  COMMENT '账号登录IP历史表';
