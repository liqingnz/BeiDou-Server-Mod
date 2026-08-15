-- 注册从 LichKingMod 移植过来的指令。
-- BeiDou 的指令不再走 CommandsExecutor 里的 addCommand（那些 registerLvXCommands 已整体注释掉），
-- 而是由 CommandService.loadCommands 从本表读取，再按
-- org.gms.client.command.commands.gm{default_level}.{clazz} 反射实例化。
-- 因此 default_level 必须与 java 类所在的包一致；level 是可在后台调整的实际权限等级。

-- @roll 投掷 0-100 随机数
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'roll', 0, 1, 'RollCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'roll');

-- @mapdrops 当前地图掉落查询入口，打开脚本中心已有的「当前地图掉落」脚本
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'mapdrops', 0, 1, 'MapDropsCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'mapdrops');

-- @sellinv 批量出售背包物品
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'sellinv', 0, 1, 'SellInvCommand', 0
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'sellinv');

-- @patrol 自动巡逻
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'patrol', 2, 1, 'PatrolCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'patrol');

-- @cospreview 造型预览，默认打开美发店脚本
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'cospreview', 2, 1, 'CosPreviewCommand', 2
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'cospreview');

-- @testscript 按脚本名打开NPC脚本，调试用
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'testscript', 5, 1, 'TestScriptCommand', 5
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'testscript');
