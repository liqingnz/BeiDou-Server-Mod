-- 注册从 LichKingMod 移植过来的批次 6 指令，规则同 V1000.0.3：
-- default_level 必须与 java 类所在的包一致（反射按 gm{default_level} 找类），
-- level 是可在后台调整的实际权限等级。

-- @proequip：在装备原有属性上加值，属性为 0 的项保持 0。
-- 与既有的 @proitem（把全属性设成定值）互补，两条都保留。
-- 原实现里另有一个 DropProEquipCommand，与本指令 90% 逐字重复、
-- 唯一区别是掉在地上而非进背包，这里合并成第三个参数 drop，不单独建类。
INSERT INTO `command_info`(`syntax`, `level`, `enabled`, `clazz`, `default_level`)
SELECT 'proequip', 4, 1, 'ProEquipCommand', 4
WHERE NOT EXISTS (SELECT 1 FROM `command_info` WHERE `syntax` = 'proequip');
