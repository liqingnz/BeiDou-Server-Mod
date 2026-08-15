-- 注册从 LichKingMod 移植过来的第二批指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @retrieve 买回本次用 @sellinv 卖出的物品，与 V1000.0.3 的 @sellinv 配套
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'retrieve', 0, 1, 'RetrieveCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'retrieve');

-- @gmbot 替指定角色自动清怪拾取
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'gmbot', 4, 1, 'GMBotCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'gmbot');

-- 本批的第三项「道具有效期」是给既有的 @drop 加了一个可选参数，
-- 指令本身已在 command_info 中，无需新增行。
