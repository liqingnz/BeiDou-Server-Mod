-- 批次 7 · drop_data 增加 distinctive 列（LK dd995ac5「add distictive drop option」）。
--
-- LK 的建列语句只存在于 db_LichKingMod_patch.sql 顶部的注释里（他们手工执行过），
-- 语义：distinctive = 1 的掉落在客户端有专属指示（祝福/混沌/龙链等稀有物掉落提示，
-- 见 LK 25bdb19a「祝福、混沌和龙链掉落有指示」）。
-- 读取方 MonsterDropEntry / MonsterInformationProvider 的 Java 改动归批次 7 Java 组，
-- 列先行：后续 V1000.1.x 的掉落数据要写这一列。
ALTER TABLE `drop_data`
    ADD COLUMN `distinctive` TINYINT NOT NULL DEFAULT 0 AFTER `chance`;
