-- 批次 6 · G14：@analysis 查看当前地图 BOSS 的伤害分担。
--
-- LK 把这条指令放在 gm0（所有玩家可用），BeiDou 按运营决定收到 gm2（仅 GM）——
-- 它等于一张全服可见的 DPS 表，放开容易在远征/组队里引发扯皮。
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类）。

INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'analysis', 2, 1, 'BossDmgAnalysisCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'analysis');
