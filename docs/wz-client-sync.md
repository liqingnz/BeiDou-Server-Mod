# 服务端 wz 改动 → 客户端同步账本

> 目的：服务端每一次 wz 改动都在此登记，便于同步到客户端。
> 起点：分支 `port/asm-wz`（ASM wz 增量导入起）。更早的改动见
> [lichkingmod-port.md](lichkingmod-port.md) 各批次记录。

## 映射规则

CLAUDE.md 的「wz 补丁工作流」：服务端 `wz/`（英文基础层）↔ 客户端 `EN/`；
服务端 `wz-zh-CN/`（中文覆盖层）↔ 客户端 `Data/`。

但 **BeiDou-Client-ASM 的 `EN/` 只含 `Quest`、`String`、`UI` 三项**，其余（Map/Mob/
Npc/Item/Reactor/Character/Skill…）中英文客户端共用 `Data/`。所以：

| 服务端改动落在 | 客户端要动的目录 |
|---|---|
| `wz/String.wz/*`（英文名） | `EN/String/` |
| `wz-zh-CN/String.wz/*`（中文名） | `Data/String/` |
| `wz/Item.wz/*`、`Mob.wz`、`Npc.wz`、`Map.wz`、`Reactor.wz` 等 | `Data/<对应目录>/` |

**坑**：`xml-img-patcher` 的 `patch` ADD 是**合并/追加**，不是覆盖。目标 `.img` 里已
存在同名子树时会产生重复节点。打之前一律先 `--dry-run` 看变更类型（见 CLAUDE.md）。

---

## 账本

### 1. `9e9e9ad34` 导入 ASM wz 增量 — **客户端无需动作**

1,456 个纯新增文件（Map.wz 421 / Mob.wz 331 / Npc.wz 308 / Item.wz 308 /
Reactor.wz 51 / Morph.wz 29 / Sound.wz 6 / UI.wz 1 / wz-zh-CN/Etc.wz 1）。

来源即 `BeiDou-Server-ASM`，与用户在用的 `BeiDou-Client-ASM` 是配套的一整套，
客户端本就有对应 `.img`。**这批是服务端在追赶客户端，不是客户端要追服务端。**

Map.wz 421 个的构成：真地图 328（Map7 97 / Map8 73 / Map2 66 / Map5 52 /
Map0 19 / Map6 15 / Map3 6）+ 渲染资源 93（Obj 43 / Tile 20 / Back 20 / WorldMap 10）。

### 2. `113eeef91` 删 `wz/UI.wz/CashShop.imgX.xml` — **客户端无需动作**

ASM 服主 2021 年留的 `CashShop.img` 备份，扩展名不是 `.img`，加载器本就不认。

### 3. `dd35605fc` PQ/BOSS 凭证 — **需要同步**

| 服务端文件 | 改动 | 客户端目标 |
|---|---|---|
| `wz/Item.wz/Install/0310.img.xml` | **新建**，6 个道具 | `Data/Item/Install/0310.img` |
| `wz/String.wz/Ins.img.xml` | +6 条（英文名） | `EN/String/Ins.img` |
| `wz-zh-CN/String.wz/Ins.img.xml` | +6 条（中文名） | `Data/String/Ins.img` |

六个道具：`3100000` BOSS凭证 / `3100001` 组队凭证 / `3101000` 周年帽 /
`3101001` 周年蜡烛 / `3101002` 龙年勋章（金）/ `3101003` 龙年勋章（银）。

**要点**：`0310.img.xml` 里的 `canvas` 只有尺寸和 origin，**没有实际图像数据**
（LK 导出的 XML 本就如此）。所以同步过去道具仍然没有图标，只是不再报错。
真要图标得另找 `.img` 二进制源——ASM 与 LK 客户端都没有 `Install/0310.img`，
这一条目前无解，已知并接受。

**客户端实测**（`BeiDou-Client-ASM`）：`Data/Item/Install/` 下只有 `0301.img` 与
`0399.img`，**没有 `0310.img`** —— 属 ADD 整个新文件，不存在重复节点风险，可直接打。
`Data/String/Ins.img` 与 `EN/String/Ins.img` 均已存在，属 MODIFY，走正常 patch 流程。

### 4. `072b51c9e` 克雷塞尔入场道具「扳手」 — **需要同步**

| 服务端文件 | 改动 | 客户端目标 |
|---|---|---|
| `wz/Item.wz/Etc/0403.img.xml` | +`04031942` | `Data/Item/Etc/0403.img` |
| `wz/String.wz/Etc.img.xml` | +`4031942` "Wrench" | `EN/String/Etc.img` |
| `wz-zh-CN/String.wz/Etc.img.xml` | +`4031942` "扳手" | `Data/String/Etc.img` |

**客户端实测**：`Data/Item/Etc/0403.img`、`Data/String/Etc.img`、`EN/String/Etc.img`
三个文件均已存在，故三处都是 MODIFY。

**注意 ADD 语义的坑**：ASM 服务端的 `0403.img.xml` 本就有 `04031942`，所以配套的
ASM 客户端 `0403.img` 很可能也已经有这个子树——那样 patch 会追加出重复节点。
打之前必须 `--dry-run` 确认，若客户端已有则整条跳过，只同步两个 `String` 即可。

---

## 已知缺口（服务端已引用，客户端与服务端都缺资源）

| 缺什么 | 影响 | 状态 |
|---|---|---|
| `Install/0310.img` 的实际图标位图 | 6 个凭证道具无图标 | 三方（BeiDou/ASM/LK）皆无，无解 |
| 18 个反应堆的 `Reactor.wz` | 14 张图加载抛 NPE（详见 port 文档） | 三方皆无 |
| NPC `2030016` 的 `Npc.wz` | `211042401` 加载抛 NPE | 三方皆无 |
| 乌鲁城任务链 `4526`–`4530`、道具 `4000434` | 克雷塞尔入场门无正规来源 | ASM/LK 有，待合并 |
| 新地图的中文名（`String.wz/Map.img`） | 309 张缺名，ASM 能补 259 张 | 待办 |
| 新怪的名字（`String.wz/Mob.img`） | 如狮子王之城 9 个怪全无名 | ASM 有，待合并 |
