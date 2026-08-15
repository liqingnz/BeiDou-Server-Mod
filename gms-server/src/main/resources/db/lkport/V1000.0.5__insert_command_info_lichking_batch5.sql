-- 注册从 LichKingMod 移植过来的第三批指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @detect 测谎。不带参数开当前地图的目标列表脚本，带参数按角色名直接发起。
-- 类放在 gm0 是照搬原实现的权限档，但普通玩家发起需要 use_player_detect 打开（默认关闭，
-- 见 V1000.0.6），GM 不受该开关限制，所以留在 gm0 也不会被玩家用起来。
-- 若决定彻底不开放，把这一行的 level 调高或 enabled 置 0 即可，不用改代码。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'detect', 0, 1, 'DetectCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'detect');
