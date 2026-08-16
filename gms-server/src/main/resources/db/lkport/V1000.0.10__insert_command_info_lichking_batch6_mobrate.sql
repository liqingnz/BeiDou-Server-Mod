-- 批次 6 · G1 的 @mobrate。规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @mobrate <基础倍率> [<每名有效玩家增量>]：现场调刷怪倍率，只改内存不落库，
-- 重启回到 game_config 表里的值；持久修改走 gms-ui 后台。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'mobrate', 4, 1, 'MobRateCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'mobrate');
