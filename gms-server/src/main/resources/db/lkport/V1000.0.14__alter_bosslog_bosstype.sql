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
