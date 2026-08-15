# LichKingMod → BeiDou 移植文档

> 建立于 2026-08-15。记录把 `HeavenMS_LichKingMod` 的全部改动复刻到本仓库的盘点结论、
> 移植约束、分批计划和可复现的分析命令。
> **本文档只是计划书，动手前先看第 2、3 节，那两节决定了这活儿怎么干。**

---

## 0. 两个仓库的关系

| 仓库 | 位置 | 上游 | 说明 |
|---|---|---|---|
| `BeiDou-Server-Mod` | `E:\Programming\MapleStoryServer\2026\BeiDou-Server-Mod` | `BeiDouMS/BeiDou-Server` ← Cosmic ← HeavenMS ← OdinMS | 本仓库，移植目标 |
| `HeavenMS_LichKingMod` | `E:\Programming\MapleStoryPS\HeavenMS_LichKingMod` | `liqingnz/HeavenMS_LichKingMod`，fork 自 HeavenMS（2022 快照） | 移植来源 |

两边都能追溯到 OdinMS，但**分叉点在 HeavenMS 之后就各走各路**：LK 从 2022-09 的 HeavenMS
起步做运营向魔改，BeiDou 走的是 Cosmic 这条线并做了 Spring Boot 化重构。
**没有共同祖先提交**，这是整件事最关键的前提。

---

## 1. 源仓库盘点

### 1.1 基本信息

- 分支 `main`，**91 个提交**
- 基线 `b0671161 initial commit`（2022-09-11），是 HeavenMS 的压平导入
- 最后一个提交 `ac7830b5`（2024-10-12）
- 所以「全部改动」就是 `b0671161..HEAD`

工作区另有 8 个未提交改动（6 个 PQ 脚本、`npc/9000036.js`、`sql/db_LichKingMod.sql`）——
**已决定不纳入**，只以 git 历史为准。

### 1.2 原始 diff 严重虚高

```
18728 files changed, 557690 insertions(+), 10574734 deletions(-)
```

这个数字没有参考价值，三个噪音源：

| 噪音源 | 规模 | 说明 |
|---|---|---|
| 删除 `wz/_backups/` | 约 7300 文件 | 纯删备份目录 |
| `91235cf0 format all source code` | **623 个 Java 文件** | 2022-10-14 的一次全局 IDE 重排 |
| 换行重排残留 | 贯穿全仓库 | 即使 `git diff -w` 也去不掉（`if(x) y;` 拆成两行会被算作真实改动） |

### 1.3 去噪后的真实规模

绕开 format 提交的算法：分别统计 `b0671161..91235cf0^` 和 `91235cf0..HEAD`。

| 区域 | 原始 | 去噪后 | 备注 |
|---|---|---|---|
| `src/` Java | 710 文件 | **204 个文件有真实改动**（+5962 / -1509） | 按文件去重后的数；format 前 65 处、format 后 180 处，合计 245 处「触碰」，同一文件被反复改故去重后更少 |
| `scripts/` | 948（39 新 / 909 改） | **283 个含代码改动**，665 个可证明只改文案 | 判定方法见 §6.5；不能用「非中文新增行数」启发式 |
| `wz/` | 17011 | 9740（不含 `_backups`），其中 8944 新增 | 8807 是 `Character.wz` 点装 |
| `sql/` | 4 | 4 张新表 + 商店/掉落数据调整 | |

Java 改动规模按行数分桶（去 format 提交后的 180 处）：

| 改动行数 | 文件数 |
|---|---|
| 1–5 行 | 56 |
| 6–20 行 | 51 |
| 21–60 行 | 41 |
| 60+ 行 | 32 |

**结论：Java 侧真正要看的只有 32 个大文件 + 41 个中等文件，其余是零碎调参。**

---

## 2. 为什么不能 cherry-pick / apply patch

Cosmic 相对 HeavenMS 做过全局重命名（去掉 `Maple` 前缀）和包迁移（全部挪进 `org.gms`），
再加上 BeiDou 自己的 Spring 化改造，**同一个功能在两边的文件路径、类名、依赖注入方式全不一样**。
`git cherry-pick` 会 100% 冲突，`git apply` 会直接找不到目标文件。

**唯一可行的方式是：按功能逐项人工重写移植。**

---

## 3. 强制映射表（每移植一个文件都要过一遍）

### 3.1 类名与包

| LK（HeavenMS 2022） | BeiDou（Cosmic） |
|---|---|
| `client.MapleCharacter` | `org.gms.client.Character` |
| `client.MapleClient` | `org.gms.client.Client` |
| `tools.MaplePacketCreator` | `org.gms.util.PacketCreator` |
| `server.MapleItemInformationProvider` | `org.gms.server.ItemInformationProvider` |
| `server.expeditions.MapleExpedition` | `org.gms.server.expeditions.Expedition` |
| `net.server.guild.MapleGuild` | `org.gms.net.server.guild.Guild` |
| `server.maps.MapleMap` | `org.gms.server.maps.MapleMap`（**保留原名，别一律去前缀**） |

> 不确定的类名一律去 `gms-server/src/main/java/org/gms/` 下搜一遍再写，别凭记忆推导。

### 3.2 配置系统

LK 改的是 `config.yaml` + `YamlConfig.config.server.XXX`。
**BeiDou 没有 `YamlConfig`**，走 `GameConfig` 单例 + `game_config` 数据库表（支持热重载）：

```java
// LK
if (YamlConfig.config.server.USE_MTS_TO_FM) { ... }

// BeiDou
if (GameConfig.getServerBoolean("use_mts_to_fm")) { ... }
```

- key 命名：**小写下划线**（表里已有的都是这个风格）
- 新增配置项 = 写一条 `insert into game_config` 的 Flyway 迁移，**不是**加进 `application.yml`
- world 级参数用 `GameConfig.getWorldXxx(worldId, key)`
- 表结构见 `V1.7.0__create_game_config.sql`：
  `config_type / config_sub_type / config_clazz / config_code / config_value / config_desc`

### 3.3 持久层

| | LK | BeiDou |
|---|---|---|
| 方式 | 裸 JDBC `DatabaseConnection.getConnection()` + PreparedStatement | MyBatis-Flex |
| 实体 | 无 | `org.gms.dao.entity.XxxDO`（`@Table` + Lombok） |
| 访问 | 手写 SQL | `org.gms.dao.mapper.XxxMapper` |
| 建表 | `sql/db_LichKingMod_patch.sql` 手动跑 | Flyway；**本次移植的迁移一律放 `src/main/resources/db/lkport/`，版本号用 `V1000.x`**（见下） |
| 生成 | — | `mvn -pl gms-server test -Dtest=CodeGen#genMapperAndEntity` |

**不能直接跑 LK 的 sql 文件**，必须转成 Flyway 迁移。注意 LK 的 DDL 是 `CHARSET=gbk`，
BeiDou 要用 utf8mb4。

**迁移文件与上游隔离**：`db/migration/` 留给上游 BeiDou-Server，本次移植的全部放 `db/lkport/`。
但 Flyway 的版本号是**全局唯一**的，目录隔离防不住冲突——上游哪天也发 `V1.12.0` 就会报
`Found more than one migration with version`。所以 lkport 用 `V1000.x` 段位，上游不会碰到。
`application.yml` 里 `locations` 必须同时列出两个目录，只写一个会让另一个整体失效。

### 3.4 i18n（硬约束）

CLAUDE.md 规则 2：所有面向人输出（日志、异常、界面文本）必须走资源文件。
LK 的 29 个新指令**全是硬编码中文**，还有一个 `constants/string/CNLanguageConstants` 专门堆中文常量。

移植时必须：
- 中文字面量拆进 `src/main/resources/i18n/message_zh_CN.properties`，用 `I18nUtil.getMessage(...)` 取
- 日志用 `I18nUtil.getLogMessage(...)`，异常用 `BizExceptionEnum` + `I18nUtil.getExceptionMessage(...)`
- **同时补 `_en_US` 版本**（这是纯增量工作量，LK 那边没有）
- `CNLanguageConstants` 整个类不要移植，内容化进 i18n 资源

### 3.5 脚本双语覆盖

| | LK | BeiDou |
|---|---|---|
| 结构 | 单套中文 `scripts/` | `scripts/`（英文基础）+ `scripts-zh-CN/`（中文覆盖） |
| 引擎 | Nashorn/Graal 混用 | GraalVM JS |
| 配置访问 | `Packages.config.YamlConfig.config.server.X` | `Java.type('org.gms.config.GameConfig').getServerX("x")` |
| 类引用 | `Java.type("net.server.guild.MapleGuild")` | `Java.type("org.gms.net.server.guild.Guild")` |

**逻辑改动要同时落到 `scripts/` 和 `scripts-zh-CN/` 两套**，否则切语言就丢功能。

### 3.6 wz 双语覆盖 + 客户端同步

| | LK | BeiDou 服务端 | BeiDou 客户端 |
|---|---|---|---|
| 中文数据 | `wz/`（单套） | `wz-zh-CN/`（覆盖层） | `Data/` |
| 英文数据 | — | `wz/`（基础层） | `EN/`（只含 String/Quest/UI 等文本类） |

服务端 wz 改动需用 `.claude/skills/wz-patch-java/xml-img-patcher.exe` 同步到 BeiDou-Client。

> **坑**：`patch` 的 ADD 是**合并/追加**，不是覆盖。客户端已存在同名子树时 ADD 会产生重复节点脏数据。
> 打补丁前一律先 `--dry-run` 确认变更类型，ADD 整个子树的要确认客户端确实缺该子树。

### 3.7 其他

- 遗留 OdinMS/Cosmic 文件保留 AGPL 版权头
- `import` 规范：禁止「包名+类名」内联写法，只有同名类冲突才允许全限定名
- JSON 用 fastjson2，HTTP 序列化用 Jackson
- 日志框架 log4j2

---

## 4. 差集比对结论

### 4.1 脚本：汉化整体放弃

| | 数量 |
|---|---|
| LK 改过的脚本总数 | 948 |
| BeiDou `scripts-zh-CN/` **已有中文覆盖** | **927** |
| BeiDou 有英文版但缺中文覆盖 | **0** |
| BeiDou 两边都没有（LK 独有） | **21** |

**BeiDou 的中文覆盖是满的，零缺口。** 所以纯译文脚本整体不搬，
只处理 21 个独有脚本 + 262 个含代码改动的脚本（后者**只搬逻辑，不搬译文**）。

> 早期版本用「新增行里不含中文的行数 ≤ 2 即视为纯汉化」来筛，会把
> `CafePQ_1.js`（最低人数 3→1）、`BalrogBattle.js`（人数 6→1、等级上限 255→200）、
> `enterBackStreet.js`（准入条件改写）、`reactor/5511000.js`（新增地图防护）
> 这类真逻辑改动误判成噪音。现在改成可证明的判定，详见 §6.5。

### 4.2 wz

| | 数量 |
|---|---|
| LK 改过（不含 `_backups`） | 9740 |
| BeiDou `wz-zh-CN/` 已有 | 61 |
| BeiDou `wz/` 英文基础已有（需逐个 diff 判断改动是否已被覆盖） | **831** |
| BeiDou 完全没有 | **8848** |

8848 里 8807 是 `Character.wz`（皇家点装/发型/脸型），归到最后一批。
真正必须处理的非点装 wz 只有 **41 个**（清单见附录 D）。

换个切法更好安排工作（这也是清单里的分组方式）：

| 分组 | 数量 | 处置 |
|---|---|---|
| `Character.wz` 全部 | 9423（其中 BeiDou 缺 8807） | 压成清单里的 1 行，批次 8 整体决策 |
| 非 `Character.wz`，BeiDou 已有同名文件 | **276** | 逐个 diff 判断改动是否已被覆盖 |
| 非 `Character.wz`，BeiDou 完全没有 | **41** | 直接补，见附录 D |

### 4.3 新增 Java 文件：BeiDou 侧 100% 不存在

逐个查过，LK 新增的 38 个 Java 文件在 BeiDou 中一个都没有，是最干净的移植目标。

---

## 5. 改动分类

| 类别 | 内容 | 处置 |
|---|---|---|
| **A** 新功能代码 | 38 个新 Java 文件 | ✅ 做 |
| **B** 基础设施 | 4 张新表、GameConfig 新增项、`AbstractPlayerInteraction` 脚本 API 扩展 | ✅ 做 |
| **C** 游戏性/平衡 | 技能平衡、`Character`、`MapleMap`、`Expedition`、Godly 系统、经验阶梯、刷怪倍率 | ⚠️ 逐条 triage |
| **D** 数据类 | drops/shopitems SQL、262 个含代码改动的脚本、41 个缺失 wz、276 个待 diff 的 wz | ⚠️ 做，量大 |
| **E** 放弃 | 665 个纯文案脚本、`_backups` 删除、format 提交、工具类重排、logs/cores/out 垃圾 | ❌ 不搬 |
| **F** 待定 | 皇家点券系统 + 8807 个 `Character.wz` | ❓ 最后决策 |

**已定范围：A+B+C+D 全做，分批推进，先 A 和 B。**

---

## 6. 分批计划

按功能纵切，不按 91 个提交时间顺序回放。每批可独立编译验证。

```
批次0 基础设施 ──┬── 批次1 无状态指令（试点）
                 ├── 批次2 账号安全
                 ├── 批次3 投票系统
                 ├── 批次4 留言板/邮件/签到/兑换
                 ├── 批次5 脚本 API + 独有脚本
                 └── 批次8 皇家系统（最后）

批次6 游戏性 triage ── 批次7 数据类
```
| 批次 | 内容 | 依赖 |
|---|---|---|
| 0 | Flyway 建 login_history / message_board 两张表 + DO/Mapper | — |
| 1 | CommandManager + 6 个指令；3 个功能复用 BeiDou 现成脚本 | 0 |
| 2 | 登录 IP 记录（邮箱验证与改密码已 deferred） | 0 |
| 3 | 投票奖励系统 | 0 |
| 4 | 留言板 / 站内邮件 / 签到 / 账号角色删除（`@redeem` 已移出，见批次 8） | 0 |
| 5 | `AbstractPlayerInteraction` +338 行 + 21 个独有脚本 | 0 |
| 6 | C 类游戏性/平衡逐条 triage | — |
| 7 | 掉落/商店 SQL + 262 个含代码改动的脚本 + 41 个缺失 wz + 276 个待 diff wz | 6 |
| 8 | 皇家点券系统（含 `royal_accounts` 表与 `@redeem`）+ 8807 个点装 wz + 客户端 img 补丁 | 0 |

---

## 6.5 进度追踪与完成判据

**分母不是 91 个提交，是文件级改动清单。**

commit 不适合当追踪单位，三个原因：

1. **commit 不是功能原子。** 一条提交塞十几件不相干的事（看 §1.1 那些提交信息），没法整体打勾；`91235cf0` 一个提交动 623 个文件，说它「完成」毫无意义。
2. **按 commit 回放会让你实现完再删掉。** LK 跨两年反复推翻自己：经验倍率 8x→6x→4x，皇家点券 1:100→1:1，`57717d1e 取消工作人员E的所有功能` 之后又 `6f78f347 工作人员E可兑换皇家`，`476a024a quickFix: remove item data cache` 把之前加的缓存删了（最终 diff 里只剩一坨注释掉的死代码）。`b0671161..HEAD` 的最终态 diff 已经把这些折叠掉了。
3. **同一个文件被反复触碰。** `MapleCharacter` 被改了几十次，按 commit 追踪要移植几十遍；按文件只需要判定一次。

### 清单

| 文件 | 作用 |
|---|---|
| `docs/tools/gen-port-manifest.sh` | 生成器。分母由它算，不由人维护 |
| `docs/lichkingmod-port-manifest.tsv` | 清单本体。人只填 `disposition` 和 `evidence` 两列 |

```bash
bash docs/tools/gen-port-manifest.sh
```

重跑是安全的：**人工填过的行（disposition ≠ pending）原样保留**，只有 pending 行会按最新自动判定刷新，新增文件追加为 pending，消失的行会告警。区间钉死在 `base=b0671161 head=ac7830b5`，LK 已冻结所以分母稳定。

`disposition` 只有五种：

| 值 | 含义 | evidence 要求 |
|---|---|---|
| `ported` | 已移植 | 填 BeiDou 侧文件路径 |
| `already-fixed` | BeiDou/Cosmic 已独立覆盖 | **必须填 文件:行号**，否则这一档会变成垃圾桶 |
| `rejected` | 明确不搬 | 填一句理由 |
| `noise` | 格式化 / 汉化 / 垃圾文件 | 不需要 |
| `pending` | 还没看 | — |

首版分布（`noise` 由脚本自动判定，其余待人工处理）：

| 区域 | 总行数 | pending |
|---|---|---|
| `java` | 672 | 166（其余 506 是仅格式化改动） |
| `java-new` | 38 | 38 |
| `script` | 927 | 262（其余 665 可证明只改了文案） |
| `script-new` | 21 | 21 |
| `wz` | 276 | 276 |
| `wz-missing` | 41 | 41 |
| `wz-cosmetic` | 1 | 1（9423 个点装文件压成一行） |
| `config` | 3 | 3 |
| `handbook` | 13 | 13 |
| `other` | 39 | 3 |
| `sql` | 4 | 4 |
| **合计** | **2035** | **828** |

### 分母必须是仓库全量

清单覆盖 LK 仓库**全部**变更路径，不只是 `src/scripts/wz/sql`。生成器最后会做一次自检：

```
分母自检通过：2034 个变更路径全部有归宿
```

任何在 diff 里却没进清单的路径都会让脚本 **exit 1**。两类例外：`wz/_backups/`（整目录删除的噪音）和 `wz/Character.wz/`（压成一行）。

这条自检不是摆设 —— 首版就漏掉了顶层配置：

| 文件 | 规模 | 内容 |
|---|---|---|
| `config.yaml` | +70 / -46 | 倍率、刷怪系数、等级上限、堆叠上限 |
| `configServer.yaml` | +70 / -46 | 同上，另一套世界 |
| `configServer2.yaml` | **+483** | 整个新区世界配置（老区/新区双服务器那次改动） |

另有 `launch.bat`、`helperTools/questWriter.js`、`cores/javax.mail-1.6.2.jar`（批次 2 邮件依赖）、`handbook/` 13 个文件。这些都不在原来的扫描范围里，`pending` 归零也发现不了。

### 自动判 noise 的规则必须可证明

脚本类改动**不能**用「新增行里不含中文的行数 ≤ N」这种启发式。反例：

| 文件 | 非中文新增行 | 实际改动 |
|---|---|---|
| `event/CafePQ_1.js` | 1 | `minPlayers` 3 → 1 |
| `event/BalrogBattle.js` | 2 | `minPlayers` 6 → 1，`maxLevel` 255 → 200 |
| `portal/enterBackStreet.js` | 2 | 注释掉原准入条件，换成新条件 |
| `reactor/5511000.js` | 1 | 新增 `if (rm.getMapId() != 551030200) return;` 地图防护 |

现在的判定是：把每条 +/- 行归一化（抹掉字符串字面量内容、去注释、压空白），比较新增与删除行的归一化多重集。**相等才判 noise** —— 代码骨架没变，改动可证明只落在文案里。引号跨行导致归一化不可靠的文件一律退回 `pending`。

换成这个规则后脚本 pending 从 130 涨到 262，多出来的就是原先会被漏掉的真逻辑改动。

### 完成判据是两个轴

**轴一 · 覆盖率**：`pending` 归零。这证明「每一处都被处理过」。

```bash
awk -F'\t' '$5=="pending"' docs/lichkingmod-port-manifest.tsv | wc -l
```

**轴二 · 验收**：清单证明不了「处理对了」。每批还需要——

- `mvn clean package` 通过
- 该批的功能性冒烟：指令能执行、新表能读写、脚本能触发
- **反向抽查**：从 LK 的 91 条提交信息里随机抽 15 条**功能描述**（不是文件），在 BeiDou 里找对应实现。清单按文件组织，一个功能横跨多文件时容易出现「文件都打了勾、功能却是残的」，这是唯一能抓住它的办法。

反向抽查是唯一需要回头看 commit 的地方 —— commit message 是很好的功能清单，只是不适合当工作单位。

---

## 7. 各批次详细清单

### 批次 0 — 基础设施 ✅ 已完成

产出：`V1.12.0__create_login_history.sql`、`V1.12.1__create_message_board.sql`，
以及 `LoginHistoryDO` / `MessageBoardDO` 与对应 Mapper。

动手后改了三个原定计划，都是查证后的结果：

**1. 只建 2 张表，不是 4 张。**

| LK 表 | 处置 | 依据 |
|---|---|---|
| `loginHistroy` → `login_history` | ✅ 建（批次 2 用） | `MapleClient.java:628` 写入 |
| `messageBoard` → `message_board` | ✅ 建（批次 4 用） | `MessageBoard.java` + `npc/9800001.js` |
| `monsterBookReward` | ❌ **不建** | `grep -rni monsterbookreward src/ scripts/` 在 LK 全仓库**零引用**，是张死表 |
| `royalAccounts` | ⏸ 推迟到批次 8 | 只被 `RedeemCommand`（皇家月卡）和 `RoyalCommand` 用，属待定的 F 类 |

> 连带调整：**`RedeemCommand` 从批次 4 挪到批次 8** —— 它读写 `royalAccounts`，
> 是皇家月卡领取逻辑，不该跟留言板/站内邮件放一批。

**2. 表结构相对 LK 原始 DDL 做了四处改动**（附录 C 是原始 DDL，实际以迁移文件为准）：

- 补自增代理主键。LK 两张表都没有主键，MyBatis-Flex 的 `BaseMapper` 需要 `@Id`；
  `login_history` 的去重仍由 `UNIQUE(account_id, ip)` 保证。
- `CHARSET=gbk` → `utf8mb4`。
- `messageBoard.time` 是 MySQL 关键字，改名 `create_time`，并加索引
  （LK 靠 `DELETE ... ORDER BY time ASC LIMIT 1` 淘汰旧留言，只保留 30 条）。
- 名字与留言从 `TEXT` 改成定长 `VARCHAR`。LK 侧 `CHARACTER_LIMIT = 40` 是玩家输入上限，
  入库前会拼上角色名与颜色控制码，`VARCHAR(255)` 足够。

**3. GameConfig 的 21 个新配置项不在批次 0 一次性写入**，改为**跟随各自的消费代码分批加**。

原因：`game_config` 是 gms-ui 后台可见的运营旋钮。提前塞进 21 个点了不起作用的开关
（`mob_spawn_base_rate` 要等批次 6 才有代码读它），对运维是误导，比晚一点加更糟。
键名与归属批次的对照见附录 B。

写 insert 迁移时注意：`game_config` 的每一条都要**同时**往 `lang_resources` 插
`zh-CN` 与 `en-US` 两行描述，格式照 `V1.11.3__insert_game_config_stage_skip.sql`。

**4. i18n 骨架没有单独建。** 批次 0 没有任何面向人的输出，凭空加空 key 没有意义；
key 跟着各批次的代码一起进。命名沿用现有约定：`<类名>.message1` 是指令的
`@help` 描述文案，`message2` 起是运行时消息。

> **DO/Mapper 是手写的，没跑 CodeGen。** CodeGen 需要目标表已存在于本地 `beidou` 库，
> 而建表要先启动服务端跑 Flyway；手写并严格照 `AutobanConfigDO` 的产物格式即可，
> 已 `mvn -pl gms-server compile` 验证通过。后续如果跑了 CodeGen，产物应与此一致。

### 批次 1 — 指令（试点）✅ 已完成

**原定的「12 个无状态指令」前提不成立**，逐个查依赖后重新划分。实际结果：6 个写了代码，
2 个毙掉，4 个挪到别的批次。

| LK 指令 | 处置 | 依据 |
|---|---|---|
| `RollCommand` | ✅ gm0 `@roll` | 无依赖 |
| `MapDropsCommand` | ✅ gm0 `@mapdrops`，**改成入口指令** | 见下 |
| `SellInvCommand` | ✅ gm0 `@sellinv` | 靠 `CommandManager` 解锁 |
| `PatrolCommand` | ✅ gm2 `@patrol` | 同上 |
| `CosPreviewCommand` | ✅ gm2 `@cospreview`，**默认走 Salon** | 见下 |
| `TestScriptCommand` | ✅ gm5 `@testscript` | 无依赖 |
| `WhoDrops2Command` | ❌ 不移植 | BeiDou 脚本版更完善，改为让既有 `@whodrops` 指向它 |
| `LichDebugCommand` | ❌ 不移植 | 作者自用的 `public static int debugVar`，LK 全仓库无消费方 |
| `BossDmgAnalysisCommand` | ⏭ 挪批次 6 | 依赖 `Monster.getTakenDamage()`，BeiDou 无此方法 |
| `MobRateCommand` | ⏭ 挪批次 6 | 热写 `MOB_SPAWN_BASE_RATE`，但要等批次 6 才有刷怪逻辑消费它 |
| `DetectCommand` | ⏭ 挪批次 5 | 依赖 `APi.detectPlayer()` 与 `npc/detectMap.js`，两者都无 |
| `RecallCommand` | ⏭ 待定 | `EventRecallCoordinator` 已有，但缺 `MAX_RECALL_TIME`/`RECALL_COOLDOWN` 配置键 |

#### 关键发现一：BeiDou 的指令注册机制完全不同

[CommandsExecutor.java:72](../gms-server/src/main/java/org/gms/client/command/CommandsExecutor.java#L72) 里
**所有 `registerLvXCommands()` 都被注释掉了**，改由 `CommandService.loadCommands` 从
`command_info` 表读取，再按 `org.gms.client.command.commands.gm{default_level}.{clazz}` 反射实例化。

所以**新增指令要写 Flyway 迁移插 `command_info` 行，不是改代码**。照 HeavenMS 的习惯往
`registerLv0Commands()` 里加 `addCommand(...)` 是死代码。

副作用是好的：指令的启用/禁用和权限等级可以在 gms-ui 后台直接改。

#### 关键发现二：三个指令的功能 BeiDou 已有更好的实现

| LK 指令 | BeiDou 现成实现 | 差距 |
|---|---|---|
| `MapDropsCommand` | `scripts-zh-CN/BeiDouSpecial/当前地图掉落_当前地图.js` | 脚本版按 BOSS/普通分组、可逐怪下钻、显示怪物属性与立绘（含超大图防客户端假死）、区分基础掉率与角色实际掉率。LK 版把全图掉落拼成一个字符串一次性输出，怪多时撑爆客户端文本框 |
| `WhoDrops2Command` | `当前地图掉落_物品查询.js` | 脚本版 11 个大类浏览 + 分页 + 掉落源怪物名。LK 版只能精确输入 itemId，输出 80 条纯文本，连怪物名都是注释掉的 |
| `CosPreviewCommand` | `Salon.js` | Salon 用客户端原生 `sendStyle` 预览窗口，不落库不改角色。LK 版起定时器每 800ms 真实修改角色发型/脸型，靠遍历撞可用 id |

处理方式：**指令退化成入口，查询逻辑复用脚本**。

- `@mapdrops` → `openNpc(9900001, "当前地图掉落_当前地图")`
- `@whodrops` → 改写既有的 `WhoDropsCommand`，指向 `"当前地图掉落_物品查询"`
- `@cospreview` → 默认 `openNpc(9900001, "Salon")`；LK 的遍历分支保留，需显式传
  `face/hair` + 起始 id 才进入

> `@whodrops` 的改写**丢掉了原来的按名字搜索**（脚本是分类浏览，不接受搜索词）。
> 如果需要，可以按 `@cospreview` 的模式做成「带参数走搜索、不带参数开脚本」。

#### 移植时修掉的 LK 问题

| 文件 | 问题 | 处理 |
|---|---|---|
| `CommandManager` | 四个共享 map 用裸 `HashMap`，被多频道线程并发读写 | 换 `ConcurrentHashMap`；`cancelRunningCommands` 里的 `put(id, null)` 换成 `remove` |
| `PatrolCommand` | **巡逻队列是 Command 实例字段**，而指令全局只实例化一次，多 GM 同时巡逻会互抢目标 | 队列挪进 `CommandManager` 按角色 id 隔离 |
| `PatrolCommand` | `getNextPlayer` 递归，目标全在自由市场时会递归到底 | 改循环 |
| `PatrolCommand` | `Short.parseShort` 无保护、硬编码 `910000000` | 加 try/catch、用 `MapId.FM_ENTRANCE` |
| `SellInvCommand` | equip/use/etc 三分支逐字重复 60 行 | 合并，`InventoryType` 走 map 查 |
| `SellInvCommand` | **硬编码格数上限 96**，扩容过的背包会漏格 | 改用 `inventory.getSlotLimit()` |
| `CosPreviewCommand` | 调试残留 `yellowMessage("param length " + ...)`、拼写错误 `"only support face and hari"`、吞异常 | 全部清掉 |
| 多处 | 大量未使用 import（`TestScriptCommand` 有 14 个 import 只用 2 个） | 删除 |

#### 因 BeiDou API 差异做的调整

- `Character.announce()` 不存在 → `MapleMap.broadcastStringMessage(int, String)`
- `Shop.sell()` 返回 `void` 而非成交额 → 用前后 `getMeso()` 差额统计（比 LK 更准，
  商店有税率或上限时差额才是玩家实际到手）
- `isLoggedinWorld()` → `isLoggedInWorld()`
- 脚本中心 NPC 是 `NpcId.BEI_DOU_NPC_BASE`（9900001），不是 LK 的 9010000
- `CommandManager` 的 `setWorldExpRate/QuestRate/DropRate` 三个静态方法**没有移植**——
  只被批次 4 的 `RateEventCommand` 用，且 `World` 只有 `setExpRate`/`setDropRate`，
  **没有 `setQuestRate`**（`questRate` 是无 setter 的私有字段）。等做 `RateEventCommand`
  时再决定是给 `World` 加 setter 还是走 `GameConfig`

#### 已知未验证

只做了编译验证，**没有运行验证**。要验证 `command_info` 插入是否生效需启动服务端跑 Flyway，
而服务端一起来会连带让已删除的 6 个任务生效，那件事还卡在客户端 img 补丁上。

另外 `@mapdrops`/`@whodrops`/`@cospreview` 依赖 `scripts-zh-CN/BeiDouSpecial/` 下的脚本，
而 **`scripts/BeiDouSpecial/` 整个目录不存在**，en-US 语言下这三个指令会静默失效。
这是既有状况（`@gacha` 菜单同样如此），不是本批引入。

> BeiDou 的 gm0 已有 `ChangeLanguage/DropLimit/EnableAuth/EquipLv/Gacha/MapOwnerClaim/ReadPoints/ShowRates/ToggleExp` 等——
> 这些是 HeavenMS 上游就有的，不是 LK 新增，别重复移植。

### 批次 2 — 账号安全 ✅ 已完成（缩到只做登录 IP 记录）

**邮箱验证与改密码整批 `deferred`**，本批只做登录 IP 记录。

| 项 | 处置 |
|---|---|
| 登录 IP 记录 → `login_history` | ✅ 做了 |
| `net/mailing/{MailManager, MailConst, Verifier}` | ⏸ deferred |
| `VerifyEmailCommand` + `npc/verifyEmail.js` | ⏸ deferred |
| `ChangePasswordCommand` + `npc/changePassword.js` | ⏸ deferred |
| `tools/LogHelper` 扩展 | 随投票系统走批次 3 |

#### 为什么改密码不能脱离邮箱单独做

LK 的 `ChangePasswordCommand` 本体只有 4 行，全部逻辑在 `scripts/npc/changePassword.js` 里，
而那个脚本的安全闸门就是邮箱验证码：

```js
var c = a + b;                                 // 脚本自己算出来的数字
status 0: cm.sendGetText("填写验证码：#b" + c);  // 又自己显示给玩家 —— 纯防误触，无鉴权作用
status 2: cm.sendVerificationCode();           // ← 真正的闸门：发邮件
status 3: if (cm.verifyChangePassword(newPassword, cm.getText())) → 改密码
```

去掉邮箱环节，剩下的就只有一个自显自验的算术码，等于**任何人在一台已登录的客户端上
都能改掉账号密码**。所以这两项必须一起做或一起缓。

补充：BeiDou 本来就有改密码，闸门是「输入旧密码」
（`AccountService.updateAccountByUser:101`），只是入口在 gms-ui 网页而不是游戏内。
将来重启这项时，「游戏内改密码 + 旧密码闸门」是比照搬 LK 更合理的形态。

#### 登录 IP 记录的实现要点

LK 的两句 SQL 分工不同，容易看混：

| 语句 | 每次登录都执行 | 每次登录都改数据 |
|---|---|---|
| `UPDATE accounts SET ip = ?` | ✅ | ✅ 覆盖，保存**最近一次** |
| `INSERT IGNORE INTO loginHistroy` | ✅ | ❌ 只有该 (账号, IP) **首次**出现时才真的落行 |

`INSERT IGNORE` 撞上 `UNIQUE(accountId, ip)` 会把重复键错误降级成警告并跳过整行，
不更新任何字段。所以 LK 那个叫 `lastLoginTime` 的字段，存的其实是该 IP 的**首次**登录时间。
**字段已按实际行为改名 `first_login_time`**，两张表的分工是自洽的：
`accounts.ip` 管「最近一次」，`login_history` 管「用过哪些 IP」。

查证结果：BeiDou 的 `accounts.ip` 列存在但**从来没人写过也没人读过**
（`AccountsDO.ip` 是 CodeGen 生成的，全仓库只有 `IpbansDO.ip` 在用），所以 LK 那句
`UPDATE accounts SET ip` 是有意义的，一并搬了。

#### 与 LK 的差异

| # | 差异 | 原因 |
|---|---|---|
| 1 | 裸 JDBC → MyBatis-Flex | 仓库规范；LK 那坨手动 `try/finally` 关连接全部消失 |
| 2 | `INSERT ignore ... VALUES(?,?,?)` → 显式列名 | 本表比 LK 原表多了自增主键，按列位置插入会错位 |
| 3 | **只在 `loginok == 0` 时记录** | LK 放在 `case SUCCESS` 里无条件执行，而该分支的进入条件是 `loginok == 0 \|\| loginok == 4`，**`4` 是密码错误**——LK 会用失败尝试的 IP 覆盖 `accounts.ip` |
| 4 | `split(":")[0]` 不搬 | BeiDou 的 `Client.getRemoteAddress()` 已是纯 IP（`getHostAddress()`） |
| 5 | `printStackTrace()` → `log.warn` + i18n | CLAUDE.md 规则 2、5 |
| 6 | 加 IP 空值 / 字符串 `"null"` 保护 | `getRemoteAddress()` 取不到时返回字符串 `"null"` |

`Client` 是本仓库第一个引 Spring bean 的 Netty 侧遗留类，取法照抄 `Character.java:500-505`
的 `ServerManager.getApplicationContext().getBean(...)`。

`INSERT IGNORE` 用 Mapper 上的 `@Insert` 注解手写——MyBatis-Flex 1.8.9 的 `BaseMapper`
只有 `insertOrUpdate`（UPDATE 语义），**没有 IGNORE 语义的方法**。仓库里 `AccountsMapper`
已有同样的自定义 SQL 写法。

> `MapleClient.java` 在清单里仍是 `pending`：它还含角色删除重构（批次 4）与投票日志改动（批次 3）。

### 批次 3 — 投票奖励

- `net/server/handlers/VotePingBackHandler`（+52）
- `net/server/task/UpdateVotePointTask`（+143）
- `UpdateVoteCommand`
- `Character` 里的投票点数逻辑：每账号每日 1 票、12 点刷新、进商城领取无衰减、
  未绑定邮箱投票无效、衰减因子 `NX_DECLINE_FACTOR`

> BeiDou 已有 `ReadPointsCommand` 和 `gm3/GiveVpCommand`，**要对齐而不是并存重复实现**。
> 定时任务接入 Spring 调度或 BeiDou 现有的 TimerManager，别照搬 HeavenMS 写法。

### 批次 4 — 留言板 / 邮件 / 签到 / 兑换

`server/MessageBoard`（+91）、`SendMailCommand`、`QianDaoCommand`（签到）、
`RedeemCommand`（月卡领取）、`RetrieveCommand`、`ItemDropTimedCommand`、
`RateEventCommand`、`ReloadConfigCommand`、`DeleteAccountCommand`、
`DeleteCharacterCommand`、`ProEquipCommand`、`DropProEquipCommand`、`GMBotCommand`。

> - `DeleteAccount`/`DeleteCharacter` 要踩 CLAUDE.md 提到的级联删除坑：
>   `deleteCharacterEntry` 有 NPE 风险，`ExtendValue` 表会被复用，鉴权与删除逻辑分离。
> - `ReloadConfigCommand` 在 BeiDou 已被 GameConfig 热重载覆盖，评估是否还需要。
> - 部分 GM 指令（`@mobrate` `@rateevent` `@deleteaccount`）在 BeiDou 更适合做成 gms-ui 后台接口。

### 批次 5 — 脚本 API + 独有脚本

先移植 `scripting/AbstractPlayerInteraction`（**+338/-15，后续所有 NPC 脚本的前置依赖**），
连带 `NPCConversationManager`、`EventInstanceManager`、`EventManager`、`QuestScriptManager`。

然后是 21 个 BeiDou 完全没有的脚本（清单见附录 E），其中 3 个测试类脚本
（`1022101_test`、`testScript`、`npcTemplate`）评估是否需要。

### 批次 6 — 游戏性 triage（唯一无法机械化的部分）

逐条对比 BeiDou 现状后择优移植：

| 文件 | 改动量 | 内容 |
|---|---|---|
| `client/Character` | +225/-158 | 装备成长、经验分配、投票点、多个功能钩子（**需拆散到各批次**） |
| `server/ItemInformationProvider` | +129/-13 | 装备成长/等级限制、发型脸型 ID 段扩大、`ITEM_MAX_SLOT` |
| `server/maps/MapleMap` | +74/-39 | 怪物刷新倍率随地图人数变化 |
| `client/autoban/AutobanManager` | +67/-2 | 误封修复 |
| `server/expeditions/Expedition` | +53/-33 | 远征次数/重连限制（2 分钟重连、10 分钟 CD） |
| `util/PacketCreator` | +58/-29 | |
| `server/life/Monster` | +31/-18 | BOSS 元素属性 |
| `constants/skills/*` | 52 文件 | 技能平衡 |
| `client/inventory/Equip` | | Godly 系统（每项属性 5% 概率 +1~5） |
| `server/quest/*` | 37 文件 | 任务倍率/奖励 |
| `net/.../AbstractDealDamageHandler` | | 伤害计算 |

> **最大风险点。** Cosmic 相对 2022 HeavenMS 修了很多 bug，LK 那些「修复 XX 的 BUG」
> 有相当比例 BeiDou 已经修过甚至修得更好。**每条都要先读 BeiDou 当前实现再决定，
> 不可无脑覆盖，否则造成功能回退。**

### 批次 7 — 数据类

1. `sql/db_drops.sql`、`db_LichKingMod.sql` 里的 `drop_data` 与 `shopitems` 调整 → 转成 Flyway 迁移
2. 约 262 个含代码改动的脚本（Top 60 见附录 F），重点是兑换/活动/远征/PQ
3. 41 个 BeiDou 缺失的非点装 wz（附录 D）
4. 276 个 LK 改过而 BeiDou 已有同名文件的非点装 wz —— 逐个 diff 判断改动是否已被覆盖
5. wz 改动按 CLAUDE.md 的 wz 补丁工作流同步到 BeiDou-Client

### 批次 8 — 皇家系统（最后决策）

`server/ultils/RoyalAccount`（+69）、`RoyalCommand`（+114）、`royal_accounts` 表、
皇家点券兑换与月卡逻辑，以及 8807 个 `Character.wz` 点装/发型/脸型/坐骑。

> **必须一并移植的前置**：`ItemInformationProvider` 中为支持新发型/脸型扩大的 ID 段判断，
> 否则点装不显示：
> - Face: `20000–30000` 与 `50000–60000`（原 `20000–22000`）
> - Hair: `30000–50000` 与 `60000–70000`（原 `30000–35000`）
> - Cape: `1102000–1104000`（原 `1102000–1103000`）

---

## 8. 风险清单

| 风险 | 影响 | 缓解 |
|---|---|---|
| **C 类改动造成功能回退** | 高 | 每条先读 BeiDou 现状，不可无脑覆盖 |
| `Character` 是多功能钩子的汇聚点 | 中 | 按功能拆散到各批次，避免产生一个巨大冲突文件 |
| i18n 是纯增量工作量 | 中 | 批次 0 先建好 key 命名空间，英文文案可批量补 |
| wz ADD 语义产生脏数据 | 中 | 打补丁前一律 `--dry-run` |
| LK 的 GBK 编码假设 | 低 | LK 有大量 GBK/中文编码补丁（`serverNotice` 用 GBK、`GenericLittleEndianWriter`、`HexTool`），BeiDou 全程 UTF-8，**这批改动基本都不该搬** |
| 投票/点券与 BeiDou 现有实现冲突 | 低 | 批次 3 先对齐设计再动手 |

---

## 附录

### A. 可复现的分析命令

```bash
# 去掉 format 提交后的真实 Java 改动
cd /e/Programming/MapleStoryPS/HeavenMS_LichKingMod
git diff -w --ignore-blank-lines --numstat b0671161 91235cf0^ -- src
git diff -w --ignore-blank-lines --numstat 91235cf0 HEAD -- src
```

```bash
# 按提交列出各区域改动量（用于定位某个功能在哪个提交）
git log --format="%h|%ad|%s" --date=short b0671161..HEAD --reverse | while IFS='|' read h d s; do echo "$h $d src=$(git show --numstat --format="" $h -- src | wc -l) scripts=$(git show --numstat --format="" $h -- scripts | wc -l) | $s"; done
```

```bash
# 脚本：区分纯汉化与逻辑改动（靠"新增行是否含 CJK"判断）
git diff -w --ignore-blank-lines b0671161 HEAD -- scripts | awk '
/^diff --git/ { split($0,p," b/"); cur=p[2]; L[cur]=0; order[++n]=cur; next }
/^\+\+\+/ { next }
/^\+/ { if (cur=="") next; if ($0 !~ /[\344-\351]/) L[cur]++ }
END { for(i=1;i<=n;i++){f=order[i]; if(L[f]>2) printf "%d\t%s\n", L[f], f} }' | sort -rn
```

```bash
# 脚本/wz 差集比对
git diff --name-only b0671161 HEAD -- scripts | sed 's|^scripts/||' | sort > /tmp/lk.txt
(cd <BeiDou>/gms-server/scripts-zh-CN && find . -name "*.js" | sed 's|^\./||' | sort) > /tmp/bd_zh.txt
comm -12 /tmp/lk.txt /tmp/bd_zh.txt | wc -l   # 已覆盖
comm -23 /tmp/lk.txt /tmp/bd_zh.txt           # 未覆盖
```

### B. LK 新增的 server 级配置字段（22 个）

来自 `src/config/ServerConfig.java` 与 `WorldConfig.java` 的 diff。
经查 BeiDou 只有 `equip_exp_rate` 已存在，其余都要新增 `game_config` 记录。

| 字段 | 类型 | LK 默认值 | 用途 |
|---|---|---|---|
| `MOB_SPAWN_BASE_RATE` | float | 0.7 | 地图刷怪基础倍率 |
| `MOB_SPAWNRATE_TO_PLAYER_COUNT` | float | 0.1 | 每多一个有效玩家增加的刷怪比例 |
| `USE_MTS_TO_FM` | boolean | true | 拍卖入口改跳自由市场 |
| `MAX_RECALL_TIME` | short | 2 | 召回次数上限 |
| `RECALL_COOLDOWN` | short | 10 | 召回 CD |
| `CHECK_FOR_VOTE_POINT` | boolean | false | 投票点数校验开关 |
| `GTOP_PING_BACK_URL` | String | gtop100 回调地址 | 投票回调 |
| `NX_DECLINE_FACTOR` | float | 0.8 | 投票奖励衰减因子 |
| `NX_REWARD_PER_VOTE` | int | 8000 | 每票点券 |
| `EXP_MOB_LEECH_INTERVAL` | byte | 5 | 蹭经验判定间隔 |
| `MERCHANT_EXPIRE_TIME` | short | 3 | 雇佣商店存续天数 |
| `ARAN_COMBO_LAST_TIME` | int | 6 | 战神 combo 持续时间 |
| `BATTLESHIP_HP_FACTOR` | short | 1200 | 船长战舰耐久系数 |
| `MAX_LEVEL_CAP` | int | 200 | 等级上限 |
| `CYGNUS_MAX_LEVEL_CAP` | int | 155 | 骑士团等级上限 |
| `ITEM_MAX_SLOT` | short | 800 | 道具堆叠上限 |
| `ELEMENTAL_WEAPON_USE_DEFAULT_LVLUP` | boolean | false | 元素武器升级方式 |
| `EQUIP_EXP_RATE` | double | 2.0 | 装备经验倍率（**BeiDou 已有**） |
| `EQUIP_STAT_RANDOMIZE_RANGE` | short | 5 | Godly 系统属性浮动范围 |
| `exp_rate_30` | int (world) | 2 | 30 级前经验倍率（阶梯式） |
| `exp_rate_70` | int (world) | 3 | 70 级前经验倍率（阶梯式） |
| `quest_rate` | float (world) | 1.25 | 任务倍率改为 float |

另有一批 LK 只改了默认值、字段本身 HeavenMS 就有的（`CREATE_GUILD_COST`、
`BUYBACK_COOLDOWN_MINUTES`、`USE_QUEST_RATE`、`COLLECTIVE_CHARSLOT` 等），
移植时只需在 BeiDou 侧调 `game_config` 的值，不用加字段。

### C. LK 新增的 4 张表（原始 DDL，移植时需改名 + 改 utf8mb4 + 加 Flyway 版本）

```sql
CREATE TABLE IF NOT EXISTS `loginHistroy` (      -- → login_history（顺便修拼写）
  accountId int unsigned NOT NULL,
  ip VARCHAR(50),
  UNIQUE(accountId, ip),
  `lastLoginTime` timestamp NOT NULL DEFAULT '2015-01-01 05:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=gbk;

CREATE TABLE IF NOT EXISTS `royalAccounts` (     -- → royal_accounts
  `accountId` int unsigned NOT NULL,
  `tier` tinyint(1) NOT NULL DEFAULT '0',
  `expireTime` timestamp NOT NULL DEFAULT '2015-01-01 05:00:00',
  `lastRedeemed` timestamp NOT NULL DEFAULT '2015-01-01 05:00:00',
  PRIMARY KEY (`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=gbk;

CREATE TABLE IF NOT EXISTS `monsterBookReward` ( -- → monster_book_reward
  `characterId` int unsigned NOT NULL,
  `stage` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`characterId`)
) ENGINE=InnoDB DEFAULT CHARSET=gbk;

CREATE TABLE IF NOT EXISTS `messageBoard` (      -- → message_board
  `characterId` int unsigned NOT NULL,
  `characterName` text NOT NULL,
  `message` text NOT NULL,
  `time` timestamp NOT NULL DEFAULT '2015-01-01 05:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=gbk;
```

### D. BeiDou 完全缺失的非点装 wz（41 个）

```
Item.wz/Etc/0490.img.xml
Item.wz/Install/0310.img.xml
Map.wz/Map/Map7/749040000..749040008.img.xml      (9 个，中国地图)
Map.wz/Map/Map7/749050500..749050502.img.xml      (3 个)
Map.wz/Obj/{FishingSystemTW,Tokyo2JP,TokyoJP,beer1,eventTW,glacierExplorer,trapSG}.img.xml
Map.wz/Tile/{TokyoJP,grassySoil3,lionCastle,ninjaJP,ninja_jp,sakuraCastle_inside,
             sakuraCastle_outside,snowyLightrock3,thai}.img.xml
Map.wz/WorldMap/WorldMap016.img.xml
Mob.wz/{9601105,9601116}.img.xml
Npc.wz/{9250002,9250021,9330085,9330086,9330108,9390221,9400794}.img.xml
Reactor.wz/5411001.img.xml
```

（`Character.wz` 的 8807 个点装文件归批次 8）

### E. BeiDou 完全缺失的 21 个 LK 独有脚本

| 脚本 | 说明 |
|---|---|
| `event/CentipedeBattle.js` | 蜈蚣 BOSS 战（上海野外） |
| `event/KrexelBattle.js` | 熊狮 BOSS 战 |
| `event/YaoSengBattle.js` | 妖僧 BOSS 战 |
| `npc/9000036_accessory.js` | 工作人员 E 的饰品分支（最大的一个，+190 逻辑行） |
| `npc/1022101.js` 系列 | 见附录 F |
| `npc/2081004.js` | |
| `npc/2140000.js` | |
| `npc/9270045.js` | |
| `npc/9800001.js` | |
| `npc/1002103.js` | |
| `npc/verifyEmail.js` | 邮箱验证（批次 2 用） |
| `npc/changePassword.js` | 改密码（批次 2 用） |
| `npc/detectMap.js` / `npc/detected.js` | 测谎仪配套 |
| `npc/under_maintenance.js` | 维护公告 |
| `portal/mahavira_enter.js` | 妖僧入口 |
| `portal/treeboss00.js` | 大树入口 |
| `reactor/5411001.js` | |
| `npc/npcTemplate.js` / `npc/testScript.js` / `npc/1022101_test.js` | **测试类，评估是否需要** |
| `npc/1022007 .js` | **文件名带空格，是 LK 的笔误，不要移植** |

### F. 有逻辑改动的脚本 Top 40（共约 150 个，完整清单用附录 A 的命令生成）

| 逻辑行数 | 脚本 |
|---|---|
| 190 | `npc/9000036_accessory.js` |
| 182 | `event/YaoSengBattle.js` |
| 181 | `event/KrexelBattle.js` |
| 162 | `event/CentipedeBattle.js` |
| 156 | `npc/1022101.js` |
| 152 | `npc/9310039.js` |
| 148 | `npc/2012007.js` |
| 123 | `npc/9310031.js` |
| 102 | `npc/9000036.js`（工作人员 E 主体） |
| 99 | `npc/9310032.js` |
| 91 | `npc/9201142.js` |
| 82 | `npc/9310037.js` |
| 63 | `npc/9270037.js`、`npc/9201083.js` |
| 62 | `npc/2081004.js` |
| 60 | `npc/9310006.js` |
| 59 | `npc/1012117.js` |
| 55 | `npc/9310036.js` |
| 50 | `npc/9310013.js` |
| 47 | `portal/treeboss00.js`、`npc/9800001.js`、`npc/2100005.js` |
| 44 | `npc/2140000.js` |
| 42 | `npc/9310005.js` |
| 41 | `npc/9310004.js` |
| 40 | `npc/9201097.js` |
| 39 | `npc/9201016.js`、`npc/2100006.js`、`npc/2090101.js` |
| 38 | `npc/9201063.js` |
| 36 | `npc/1052101.js` |
| 34 | `npc/9120101.js` |
| 33 | `npc/1012104.js` |
| 32 | `npc/9000040.js` |
| 31 | `quest/3306.js`、`quest/3305.js`、`npc/9270023.js` |
| 30 | `portal/mahavira_enter.js`、`npc/9270036.js`、`npc/9201015.js`、`npc/2090100.js`、`npc/2041009.js` |
| 29 | `reactor/5411001.js`、`npc/2010001.js`、`event/ScargaBattle.js` |
| 28 | `npc/9120100.js` |
| 27 | `npc/gachapon.js`、`npc/2041007.js`、`npc/2012009.js` |
| 25 | `npc/9310050.js`、`npc/9201070.js`、`event/LudiPQ.js` |
| 24 | `event/KerningPQ.js` |

### G. LK 新增的 38 个 Java 文件全清单

**指令（29 个）**

| 权限 | 类 |
|---|---|
| — | `client/command/commands/CommandManager` |
| gm0 | `BossDmgAnalysis`、`ChangePassword`、`Detect`、`MapDrops`、`QianDao`、`Redeem`、`Retrieve`、`Roll`、`SellInv`、`VerifyEmail` |
| gm1 | `WhoDrops2` |
| gm2 | `CosPreview`、`ItemDropTimed`、`Patrol`、`Recall` |
| gm4 | `DeleteAccount`、`DeleteCharacter`、`DropProEquip`、`GMBot`、`LichDebug`、`MobRate`、`ProEquip`、`RateEvent`、`SendMail`、`UpdateVote` |
| gm5 | `ReloadConfig`、`Royal`、`TestScript` |

**其他（9 个）**

| 文件 | 说明 | 批次 |
|---|---|---|
| `net/mailing/MailManager` / `MailConst` / `Verifier` | 邮件与验证码 | 2 |
| `net/server/handlers/VotePingBackHandler` | 投票回调 | 3 |
| `net/server/task/UpdateVotePointTask` | 投票点数定时任务 | 3 |
| `server/MessageBoard` | 留言板 | 4 |
| `server/gachapon/Leafre` | 里福抽奖池 | 7 |
| `server/ultils/RoyalAccount` | 皇家账号（注意 LK 拼错了 `utils`） | 8 |
| `constants/string/CNLanguageConstants` | 中文常量堆 | **不移植，化进 i18n** |
