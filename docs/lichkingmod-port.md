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

### 3.7 工作方式（约定，别跳过）

**每个文件动手前，先把「LK 原文」和「拟写入 BeiDou 的版本」并排发给仓库主人确认。**
对比里要点明：

1. 逐条列出差异及其原因（类名映射 / 持久层 / i18n / API 不存在 / 修 LK 的问题）
2. **发现 LK 代码有问题就修，但必须在对比里标出来**，不要默默改
3. 阻塞项（依赖的 API 或数据在 BeiDou 不存在）要在对比里点名，不要写一半才发现

已经这样跑完批次 0–2，效果是：批次 1 原定 12 个指令，对比过程中发现 4 个依赖没到位、
2 个功能 BeiDou 已有更好实现，实际只写了 6 个。**这些都是在动手前发现的，没有返工。**

### 3.8 其他

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
| 3 | ⏸ 投票奖励系统 —— **整批暂缓**，见 §7 | 0 |
| 4 | ✅ `@retrieve` / `@drop` 有效期 / `@gmbot`；留言板与站外邮件暂缓，见 §7 | 0 |
| 5 | ✅ `AbstractPlayerInteraction` 的 4 个方法 + 4 个独有脚本 + `@detect`；其余 already-fixed / rejected / 挪批次7 | 0 |
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
  ~~**没有 `setQuestRate`**（`questRate` 是无 setter 的私有字段）~~。等做 `RateEventCommand`
  时再决定是给 `World` 加 setter 还是走 `GameConfig`
  > **划掉部分已被批次 6 G2 更正：`World` 有 `setQuestRate`**，Lombok `@Setter` 生成的。
  > 结论（不补那三个方法）不变，但正确依据是批次 4 那条：唯一消费方 `RateEventCommand` 已 `rejected`。

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

> 这是 LK 的行为。本次移植把第二句改成了 upsert，见下。

`INSERT IGNORE` 撞上 `UNIQUE(accountId, ip)` 会把重复键错误降级成警告并跳过整行，
不更新任何字段。所以 LK 那个叫 `lastLoginTime` 的字段，**存的其实是该 IP 的首次登录时间**，
名实不符：一个 IP 天天登半年，字段值也一直停在第一天。

**本次改成 `INSERT ... ON DUPLICATE KEY UPDATE last_login_time = ?`**，
每次登录成功都刷新时间，让 `last_login_time` 名副其实。两张表分工：
`accounts.ip` 管「最近一次登录用的哪个 IP」，`login_history` 管「用过哪些 IP，各自最近一次什么时候」。

查证结果：BeiDou 的 `accounts.ip` 列存在但**从来没人写过也没人读过**
（`AccountsDO.ip` 是 CodeGen 生成的，全仓库只有 `IpbansDO.ip` 在用），所以 LK 那句
`UPDATE accounts SET ip` 是有意义的，一并搬了。

#### 与 LK 的差异

| # | 差异 | 原因 |
|---|---|---|
| 1 | 裸 JDBC → MyBatis-Flex | 仓库规范；LK 那坨手动 `try/finally` 关连接全部消失 |
| 2 | `INSERT ignore ... VALUES(?,?,?)` → 显式列名 + `ON DUPLICATE KEY UPDATE` | 本表比 LK 原表多了自增主键，按列位置插入会错位；改 upsert 让 `last_login_time` 名副其实 |
| 3 | **记录点放在 `finishLogin()` 返回 0 之后**（见下「记录点的两次修正」） | LK 放在 `case SUCCESS` 里无条件执行，而该分支的进入条件是 `loginok == 0 \|\| loginok == 4`，**`4` 是密码错误**——LK 会用失败尝试的 IP 覆盖 `accounts.ip` |
| 4 | `split(":")[0]` 不搬 | BeiDou 的 `Client.getRemoteAddress()` 已是纯 IP（`getHostAddress()`） |
| 5 | `printStackTrace()` → `log.warn` + i18n | CLAUDE.md 规则 2、5 |
| 6 | 加 IP 空值 / 字符串 `"null"` 保护 | `getRemoteAddress()` 取不到时返回字符串 `"null"` |

`Client` 是本仓库第一个引 Spring bean 的 Netty 侧遗留类，取法照抄 `Character.java:500-505`
的 `ServerManager.getApplicationContext().getBean(...)`。

upsert 用 Mapper 上的 `@Insert` 注解手写——MyBatis-Flex 1.8.9 的 `BaseMapper.insertOrUpdate`
是按主键判断的，而这里要按 `uk_account_ip` 这个业务唯一键 upsert，用不上。仓库里
`AccountsMapper` 已有同样的自定义 SQL 写法。

#### 记录点的两次修正

这条踩了两遍，值得记下来——**「登录成功」在 BeiDou 里不是一个点，是一条链**。

| 版本 | 记录点 | 问题 |
|---|---|---|
| LK 原版 | `login()` 的 `case SUCCESS` 无条件执行 | `loginok == 4`（密码错误）也会进这个分支 |
| 本批初版 | `login()` 里 `loginok == 0` 时 | 见下，两类错误 |
| **现版** | `finishLogin()` 返回 0 之前 | — |

初版只挡住了密码错误，仍然两头不准：

**记了但其实没登进去（假阳性）**。`login()` 返回 0 之后还有三道关卡，
全在 `LoginPasswordHandler` 里：`hasBannedIP() || hasBannedMac()`（:98）、
临时封禁未过期（:103）、`finishLogin() != 0` 的抢登竞态（:119）。任何一道拒掉，
`accounts.ip` 和 `login_history` 都已经被污染了。

**登进去了却没记（假阴性）**，两条真实成功路径压根不经过 `loginok == 0`：

- **bcrypt 迁移**。`bcrypt_migration` 默认为 `true`（`V1.7.0__create_game_config.sql:226`），
  旧哈希密码 + 已接受条款时 `login()` 返回 **-10**，连
  `if (loginok == 0 || loginok == 4)` 这个外层判断都进不去就 return 了。
  Handler 随后把密码重写成 bcrypt 并把 `loginok` 改成 0，登录正常完成。
- **首次接受服务条款**。`tos == 0` 时返回 23 / -23，同样不进那个分支；
  实际登录是客户端确认条款后由 **`AcceptToSHandler`** 调 `finishLogin()` 完成的，
  而那条路径上根本没有记录调用。

修法是把记录挪进 `finishLogin()`：它是唯一的成功边界，且全仓库只有
`LoginPasswordHandler:116` 和 `AcceptToSHandler:24` 两个调用点，两个都是「成功才继续」。
一处覆盖两条路径，handler 不用改。写在 `encoderLock` 释放之后，
避免把库操作拖进临界区。`RelogRequestHandler` 不走 `finishLogin()`，
那是频道重连不是新登录，不记是对的。

> `MapleClient.java` 在清单里仍是 `pending`：它还含角色删除重构（批次 4）。
> 原先以为还有投票日志改动，查证后那部分只是格式化提交的位移，无逻辑变更。

### 批次 3 — 投票奖励 ⏸ 整批不做

一行代码没写。**两个 `deferred` + 一个 `rejected`**。

| 文件 | 规模 | 档 |
|---|---|---|
| `net/server/task/UpdateVotePointTask` | +143 | `deferred` |
| `gm4/UpdateVoteCommand` | +49 | `deferred` |
| `net/server/handlers/VotePingBackHandler` | +52 | **`rejected`**，死代码 |

#### 先厘清这三个文件的关系（初版写反了）

初版把 `UpdateVotePointTask` 写成「`VotePingBackHandler` 的消费方」，**是错的**。实际是：

- **`UpdateVotePointTask` 是主动出站轮询**，不是被动回调的消费方。它每 5 分钟
  `GET GTOP_PING_BACK_URL`，把 gtop100 返回的 XML 按 `<entry><pingusername>` 解析、
  给对应账号加 1 点投票点数，LK 侧在 `Server.java:932` 注册。
- **`VotePingBackHandler` 从头到尾没被用过。** 全仓库零引用，
  `extends javax.xml.ws.spi.http.HttpHandler`（JAX-WS SPI，JDK 11+ 已从 JDK 移除，
  Java 21 下要额外加依赖才编译得过），`handle()` 里 JSON 解析和 `sendResponseHeaders`
  全被注释掉，只剩一句 `System.out.println`。

所以它归 `rejected` 而不是 `deferred` —— 和 `LichDebugCommand` 一个性质，
是作者留在仓库里的半成品，不存在「将来条件成熟了再搬」这回事。

#### 为什么缓

**1. 投票点数的读写 BeiDou 已经有了，LK 没有增量。**
`Client.votePoints` / `voteTime` / `getVotePoints` / `addVotePoints` / `useVotePoints`
是 HeavenMS 上游就有的，两边都有。查 LK 的 `MapleClient.java` diff，这一整段
**只被 `91235cf0` 那次全局格式化触碰过，没有任何逻辑改动**。BeiDou 侧对应的入口是
gm0 `ReadPointsCommand`（查点数）和 gm3 `GiveVpCommand`（发点数）。

**2. LK 真正新增的是三条运营策略，每条都卡在外部决策上。**

| 策略 | 卡在哪 |
|---|---|
| 衰减因子 `NX_DECLINE_FACTOR`（每票 -20%，最低 80 点券） | 纯运营参数，要先定发放曲线 |
| 进商城领取豁免衰减 | 同上 |
| 未绑定邮箱投票无效 | 就是 `UpdateVotePointTask` 那句 SQL 里的 `and email is not null`，依赖 `net/mailing/MailManager`，**批次 2 已 deferred** |

**3. `UpdateVotePointTask` 需要一个真实的投票站。**
它 GET 的 URL 里带着 gtop100 的 `siteid` 与 `pass`（LK 硬编码了自己的
`siteid=101331` / `siteid=103015`）。没有自己的站点注册，这个任务拉回来的是别人的票。

**4. 它还读写 `accounts.lastVoteTime`，BeiDou 没有这一列**（`AccountsDO` 只有 `votepoints`）。

**5. 调度属重写而非搬运。** LK 用 HeavenMS 的 `TimerManager` 自建调度，
BeiDou 要改接现有调度方式。

#### 重启条件

确定是否接入外部投票站（并拿到自己的 `siteid`/`pass`）+ 衰减策略定案 + 邮箱验证方案定案。
连带的 `check_for_vote_point` / `gtop_ping_back_url` / `nx_decline_factor` /
`nx_reward_per_vote` 四个 `game_config` 键**一并不插**——按批次 0 的原则，
提前塞进没有消费代码的运营旋钮对运维是误导。

> **`tools/LogHelper` 不属于本批。** 原计划把它归在批次 3，读 diff 后发现里面
> **没有任何投票相关代码**：新增的是 `logDropItem` / `logPickupItem` /
> `logQuestItemGain` / `logMerchantListing` 这批审计日志，外加 `logRoyal` /
> `logRedeemRoyalReward`（属批次 8）。清单里这行**仍是 `pending`**，
> 需要时作为独立的「审计日志」项处理。

### 批次 4 — 留言板 / 邮件 / 签到 / 兑换 ✅ 已完成（只写了 3 项）

原定 13 项。`RedeemCommand` 批次 0 就已挪到批次 8，剩 12 项逐个查 BeiDou 现状后：
**3 项写了代码，2 项暂缓，2 项挪批次 6，5 项终局不做**。

| LK | 处置 | 依据 |
|---|---|---|
| `gm0/RetrieveCommand` | ✅ gm0 `@retrieve` | 批次 1 `@sellinv` 的收尾 |
| `gm2/ItemDropTimedCommand` | ✅ **并进既有 `@drop`** | 见下 |
| `gm4/GMBotCommand` | ✅ gm4 `@gmbot` | 见下 |
| `server/MessageBoard` + `npc/9800001.js` | ⏸ deferred | 本轮决定跳过；前置（表、DO、Mapper）批次 0 已就绪 |
| `gm4/SendMailCommand` | ⏸ deferred | 双重依赖：`MailManager`（批次 2 缓）+ `UpdateVotePointTask`（批次 3 缓） |
| `gm4/ProEquipCommand`、`gm4/DropProEquipCommand` | ⏭ 挪批次 6 | 依赖 Godly 系统的 `EQUIP_STAT_RANDOMIZE_RANGE` |
| `gm0/QianDaoCommand` | ❌ already-fixed | `每日签到.js` 已有 |
| `gm4/DeleteAccountCommand`、`gm4/DeleteCharacterCommand` | ❌ already-fixed | `CharacterService` 已有且更完整 |
| `gm4/RateEventCommand` | ❌ rejected | 应走 GameConfig，不该由内存态定时器控制 |
| `gm5/ReloadConfigCommand` | ❌ rejected | GameConfig 本身热重载 |

#### 关键发现一：计划书原先记的「级联删除坑」BeiDou 早就填好了

§7 原文写着 `DeleteAccount`/`DeleteCharacter` 要踩 CLAUDE.md 说的那个坑。查下来**反了**：

- CLAUDE.md 点名的 `deleteCharacterEntry` NPE，`CharacterService.java:535` 的
  `safeDeleteCharacterEntry` 已经兜住了，**LK 版没有这个兜底**
- `CharacterService.java:548` 的 `deleteAccount` 是 `@Transactional`，清 8 张账号级关联表
  加 `ExtendValue` 的三种账号类型；**LK 版无事务，只删 4 张**，照搬会留孤儿数据
- 两个能力都已经挂在 gms-ui 后台（`AccountController:79`、`CharacterController:68`）

所以问题不是「怎么移植」，是「还需不需要游戏内 GM 入口」——结论是不需要。

#### 关键发现二：三个「新指令」里有两个不该是新指令

| LK | 实际增量 |
|---|---|
| `ItemDropTimedCommand`（+111） | 是 `ItemDropCommand` 的整份复制，**逐行比对后唯一功能增量就是给非宠物道具 `setExpiration`**。做成 `@drop` 的可选第三参，加了 3 行 |
| `RateEventCommand`（+88） | BeiDou 已有五个倍率指令，它只是套了个「改完定时改回」。而 GameConfig 改 world 倍率会即时写回 `World` 对象——限时活动走 GameConfig + 后台才对，内存态定时器在活动期间重启就丢状态、后台显示的还是旧值 |

`RateEvent` 被否决连带敲定了批次 1 的一个遗留：`CommandManager` 那三个
`setWorldExpRate/QuestRate/DropRate` **确定不补**，它们唯一的消费方就是这个指令。
（~~`World` 确实没有 `setQuestRate`，那个缺口也就不用补了。~~ **这句是错的，批次 6 G2 查明
`World` 有 `setQuestRate`**；不补的理由只有「唯一消费方已 rejected」这一条。）

#### 移植时修掉的 LK 问题

| 文件 | 问题 | 处理 |
|---|---|---|
| `RetrieveCommand` | **末尾 `set...(id, null)` 会直接抛异常**——批次 1 已把 `CommandManager` 的 map 换成 `ConcurrentHashMap`，不接受 null 值 | 加 `clearItemSold(characterId)` 成对移除 |
| `RetrieveCommand` | **物品凭空销毁**：先扣钱 → `addFromDrop` → 无条件清记录，而 `addFromDrop` 的返回值被忽略。背包满时钱扣了、物品没进包、记录也没了 | 改成整批预检 → 扣钱 → 发放 |
| `RetrieveCommand` | 扫到任意一件装备就把**全部**物品当装备处理 | 逐件按自身背包类型分支 |
| `GMBotCommand` | 提示写 `<playername>`，实际却是裸 `parseInt`，传名字直接崩；`0`/`1`/`2` 是魔法选择器，`1`/`2` 硬编码作者自己的角色 id `2768`/`2971` | 改收角色 id，加解析保护 |
| `GMBotCommand` | **检测到目标掉线后 `cancel` 完没有 `return`**，继续对已下线角色调 `getMap()` | 加 `return` |
| `GMBotCommand` | 手工比对 `getOwnerId()` 与 `partyId` 做拾取过滤 | 整段删掉，见下 |
| `GMBotCommand` | 闭包持有 `Character` 引用，目标下线后回收不掉 | 任务体内按 id 重新取 |
| `ItemDropTimedCommand` | 宠物分支把同一个「分钟」参数当天数用 | 不跟，BeiDou 宠物分支保持现状 |

#### 复查时又抓出来的三个（都是移植版自己引入的，不是 LK 的）

**1. `@retrieve` 曾经是个洗标记的后门（P1）。** 非装备原先走
`InventoryManipulator.addById(c, itemId, quantity)`，那个重载委托成
`owner=null, flag=0, expiration=-1`——发回来的是一件全新的干净物品。
而 `Shop.canSell`（`Shop.java:174`）只校验数量，不看 flag 也不看过期时间。
`@sellinv` 和 `@retrieve` **都是 gm0**，于是任何玩家都能靠这一卖一买
洗掉 USE/ETC 物品的 `UNTRADEABLE`/`SANDBOX`/`ACCOUNT_SHARING` 标记，
并把限时物品变成永久物品。

改为一律走 `addFromDrop` 发放**原物品对象**：它在新建堆时原样复制
`expiration`/`owner`/`flag`（`InventoryManipulator.java:231-233`），
且只与 flag 和 owner 都相同的堆合并（:215）。

**2. 聚合前的预检会低估堆叠所需格数（P2）。** 清单里**一个原背包格是一条记录**，
同一种堆叠物品可能有好几条。`checkSpaceProgressively` 的 `usedSlots`
只累计新增格数，**不累计前一条已经假想占掉的堆叠余量**，
所以逐条问会让每条都看到当前背包里同一份剩余容量，全部通过，
实际发放到第二条才发现要开新格。

改为非装备先按 `itemId + flag + owner`（与 `addFromDrop` 的合并条件一致）聚合再检查；
装备不堆叠，仍逐件累加。另外发放阶段**逐件检查 `addFromDrop` 的返回值**：
放不下的留在记录里待玩家腾出空间后重试，并把待付金额清零，不二次收费。

**3. `@gmbot` 多 GM 并发会留下幽灵任务（P2）。** 「查 → 建 → 登记」三步不是原子的，
本指令的 key 又是**目标角色 id 而非发起者自己**（`@patrol`/`@cospreview` 都是按自己 id，
所以没这个问题）。两个 GM 同时对同一目标发起时会双双看到 null、各自起一个任务，
后登记的覆盖前一个——**被覆盖的那个 future 谁也取消不到，会一直跑下去**，
而且它每轮发现目标离线时取消的是登记在册的**另一个**任务，
目标重新登录后自己还会接着清怪。

`CommandManager` 加 `registerRunningCommandIfAbsent`（`putIfAbsent` 原子占位），
抢输的一方立刻撤掉自己刚建的 future。顺带把 `cancelRunningCommands`
从「先查后删」改成「先原子 `remove` 再 `cancel`」——原写法在并发下会取消掉
别人刚登记的新任务，这条对 `@patrol`/`@cospreview` 一并生效。

#### 因 BeiDou API 差异做的调整

- **`@retrieve` 的空间预检不能用 `checkSpace`**。它对装备只判断「还有没有一格」
  （`!inv.isFull()`），循环里逐件问会得出「一格空位放得下五件装备」的错误结论。
  改用 `checkSpaceProgressively`，并**按背包类型分别累加 `usedSlots`**——
  仓库里 `Inventory.java:506` 和 `ItemAction.java:234` 两个现有调用方都是这么做的。
- **`@gmbot` 的手工 owner 过滤整段删掉**。`Character.pickupItem` 内部已经在 `itemLock` 下
  调 `canBePickedBy()` 做完整校验（`Character.java:2019`）；而且 LK 那个判断本身就是错的——
  队伍归属在 `MapItem` 里是独立的 `party_ownerid` 字段，拿 `getOwnerId()` 去比 `partyId`
  比不上，`MapItem.java:116` 的注释还明确要求这类字段必须持锁读。现在与
  gm4 `ItemVacCommand.java:46` 的写法一致。
- `@gmbot` 改用 `getWorldServer().getPlayerStorage()` 而非 LK 的频道级查找，
  省得 GM 为了开机器人先跳频道。
- 魔法数字 `8810010..8810018` → `MobId.isDeadHorntailPart()` + `MobId.HORNTAIL`。

#### 已知未验证

只做了 `mvn -pl gms-server compile`，**没有运行验证**。`V1000.0.4` 的 `command_info`
插入是否生效需启动服务端跑 Flyway，情况同批次 1。`@gmbot` 的定时任务行为
（取消、目标掉线、跨频道查找）没有实跑确认。

### 批次 5 — 脚本 API + 独有脚本 ✅ 已完成（4 个脚本 + 4 个 API + 1 个指令）

原定「`AbstractPlayerInteraction` +338 行 + 21 个独有脚本」。逐条查证后：
**Java 侧 338 行里真正要搬的只有 4 个方法，21 个脚本里只有 4 个当下能落地。**

#### Java：+338 行的实际构成

| LK 新增 | 处置 | 依据 |
|---|---|---|
| `startQuestPro(int)` | ✅ 搬 | 任务重置，`Quest.getNpcRequirement(boolean)` BeiDou 已有 |
| `createExpedition(type, silent)` 重载 | ✅ 搬 | 2 行，`Expedition` 构造器对 0 就是「取该类型默认值」 |
| `isRecyclableScroll(Item, boolean)` | ✅ 搬 | 消费方 `npc/9201142.js` 在批次 7，先把前置放好 |
| `detectPlayer(Character)` | ✅ 搬（重写） | 见下 |
| `weakenAreaBoss` + 三个私有方法 | ❌ already-fixed | `AbstractPlayerInteraction.java:1252` 已有，且用的是 `MobSkillType` 枚举而非魔法数字 157/155 |
| `getFirstJobStatRequirement` 中文化 | ❌ already-fixed | 同文件 `:1218` 已是中文 |
| 背包已满提示中文化 | ❌ already-fixed | 同文件 `:651` 已是中文 |
| 注释掉「饰品补 3 格升级卷孔」 | ❌ rejected | 不跟 LK 的删法，但这条讨论出了一个 BeiDou 侧改动，见下 |
| `redeemDailyRoyalReward` / `gainRoyalPoint` / `gainRoyalTime` | ⏸ 批次 8 | 读写 `royalAccounts` |
| `getEmail` / `sendVerificationCode` / `checkEmailAndSendVerificationCode` / `verifyEmail` / `verifyChangePassword` | ⏸ 批次 2 deferred | 全部依赖 `net/mailing/Verifier` |

> 因此清单里 `AbstractPlayerInteraction.java` 这一行**仍是 `pending`** ——
> 皇家与邮箱两组方法还没落地，等批次 8 与批次 2 重启时再收尾。同批次 2 的 `MapleClient.java`。

连带的四个类，真增量比预期少得多：

| 文件 | 处置 |
|---|---|
| `EventInstanceManager` | ✅ `distributeBossCertificate` / `distributePQClearReward` 两个发奖方法 |
| `EventManager` | ❌ rejected，见下 |
| `NPCConversationManager` | ✅ 批次 7 gachapon 工作包已落地（`doGachapon(quantity, ticketItemId)`）；`displayCharacterRanks` 零消费终局否决 |
| `NPCScriptManager` | ❌ rejected，唯一改动是一段整体注释掉的 `createEmptyCMS` |
| `QuestScriptManager` | — 清单里本来就是 `noise`（`git diff -w` 后无差异），计划书写错了 |
| `MapScriptMethods` / `ReactorActionManager` | ❌ already-fixed（前者已是中文，后者 `dropRate` 已是 `float`） |

**`EventManager.startInstance` 的返回类型不改。** LK 把 `boolean` 改成 `int` 想让远征入口脚本
区分失败原因，但它自己 `treeboss00.js` 里那句 `em.startInstance(expedition)` 是注释掉的，
全仓库无人读这个返回码；而改签名会让 BeiDou 现有远征脚本里所有
`if (!em.startInstance(...))` 的判断整体反过来。**收益为零，风险是全部远征入口失灵。**

`EventInstanceManager.registerPlayer` 里 LK 加的 `storeEventInstance(chr.getId(), null)` 也没搬 ——
两边的 `isRecallableEvent` 都会把 `null` 挡在门外，这句是空操作。

#### 连带产生的一个 BeiDou 侧改动：饰品补孔收紧到制作流程

**这不是移植，是 BeiDou 自己的设计决定**，记在这里只为不丢失结论。清单里 `AbstractPlayerInteraction.java`
的判定与本条无关。

LK 把 `gainItem` 里这三行整个注释掉了，改动处留的是一句 `// why this line exist?`：

```java
if (ItemConstants.isAccessory(item.getItemId()) && it.getUpgradeSlots() <= 0) {
    it.setUpgradeSlots(3);
}
```

**先厘清它原本的意思。** `upgradeSlots` 取自 wz 的 `tuc`（total upgrade count，出厂自带几个卷孔），
链路是 `getEquipById` → `stat.getKey().equals("tuc")` → `setUpgradeSlots`
（[ItemInformationProvider.java:1238](../gms-server/src/main/java/org/gms/server/ItemInformationProvider.java#L1238)），
字段缺失时 `getEquipStats` 兜底成 0。所以 `<= 0` 的含义是
**「这件饰品按游戏数据本来就没有卷孔」** —— 不是数据坏了，也不是没初始化。

**出处能查到。** 一字不差的同三行还在
[MakerProcessor.java:381](../gms-server/src/main/java/org/gms/client/processor/action/MakerProcessor.java#L381)，
那是专业技能制作（Maker）系统 —— GMS 里 Maker 产出的饰品确实带孔，在那儿它是对的。
`gainItem` 这份是从那儿抄的，连紧随其后的 `use_enhanced_crafting` + 混沌卷轴分支都一起抄了。

**LK 问对了一半：这行在 `gainItem` 里挂错了位置。** 看两行的守卫差异 —— 补孔那行无条件，
混沌卷轴那行要求 `c.getPlayer().isUseCS()`。而 `useCS` 的声明注释就写着
`//chaos scroll upon crafting item`（[Character.java:463](../gms-server/src/main/java/org/gms/client/Character.java#L463)），
由 18 个精炼/制作 NPC 脚本 `setCS(true)` 打开，`NPCScriptManager.dispose` 复位，
**它就是「玩家此刻正处在制作流程中」的标记**。下面那行用了它，上面那行没用。

结果是所有脚本发放的饰品都吃这条 —— 任务奖励、活动、扭蛋、GM 脚本全算在内。
数据上这不是边缘情况，`1110000..1139999` 段在 BeiDou 的 wz 里共 166 个饰品：

| | 数量 | 占比 |
|---|---|---|
| wz 里没有 `tuc` 字段（戒指基本都是） | 101 | 61% |
| `tuc = 0` | 13 | 8% |
| **本来没孔、会被强行改成 3 孔** | **114** | **69%** |
| 自带孔（3~7，项链腰带居多） | 52 | 31% |

也就是同一枚戒指，怪掉的 0 孔、NPC 给的 3 孔。

**但 LK 的删法也不对**：整段删掉会让制作 NPC 也不补孔，包括它自己批次 7 要搬的
`9000036_accessory.js`（第 49 行就是 `setCS(true)`）。为了修「适用面太宽」而把合理用途一起砍掉。

**最终做法：把补孔挪进 `isUseCS()`，与混沌卷轴分支合并成一个制作块。**
Maker 不受影响（`MakerProcessor` 是独立的一份），18 个制作 NPC 不受影响，
任务/活动/扭蛋发的饰品回归 wz 数据。注意补孔只挂 `isUseCS()`，**不挂 `use_enhanced_crafting`** ——
后者是混沌卷轴那条单独的开关，两件事。

> **动手前扫过依赖，对现有内容零影响。** 全仓库脚本只发两种饰品：`1122007` 与 `1122010`，
> 两个都自带 `tuc=3`，`<= 0` 对它们从来就不成立，这行代码压根没对它们生效过。
> `BeiDouSpecial/` 的在线奖励、签到、新人福利奖励表里没有饰品。唯一行为会变的是
> `一键刷道具.js` 这个 GM 刷物工具刷戒指时 —— 那本来就该按物品数据来。

#### 关键发现一：两个 BOSS 战 BeiDou 早就有了，而且更完整

| LK | BeiDou 现成实现 | 证据 |
|---|---|---|
| `event/CentipedeBattle.js` | `scripts-zh-CN/event/WuGongPQ.js` | 进出场地图 701010323 / 701010320 / 701010322、BOSS 9600009、入口 `npc/9310006.js` **逐项相同** |
| `event/YaoSengBattle.js` | `scripts-zh-CN/event/YaoSengPQ.js` | 地图 702060000 / 702070400、BOSS 9600025 相同 |

BeiDou 版另有难度倍率、掉落表、多大厅并发，以及按 `use_enable_solo_expeditions` /
`use_enable_party_level_limit_lift` 解限。**LK 版没有任何增量。**

顺带查出 `YaoSengBattle.js` 在 LK 全仓库零引用，本身就是死脚本 —— 同 `VotePingBackHandler`。

#### 关键发现二：克雷塞尔整条线卡在 BeiDou 缺两张地图

`KrexelBattle.js` / `portal/treeboss00.js` / `reactor/5411001.js` / `npc/9270045.js` 是一套，
全部指向 `541020700`（大厅）与 `541020800`（战场）。**这两张地图 BeiDou 的 `wz/Map.wz/Map/Map5/` 里没有**
（该目录只有 57 个文件，LK 有 87 个）。

这个缺口**清单发现不了**：LK 基线 `b0671161` 自带这两张 wz，从没改过，所以它们压根不在
`b0671161..HEAD` 的分母里。附录 D 的「41 个缺失 wz」是从 LK 的 diff 里推的，同样看不见。

> **教训**：`pending` 归零只证明「LK 改过的都处理了」，不证明「移植过来的东西能跑」。
> 依赖 LK 基线自带资源的脚本，必须单独查 BeiDou 有没有那份资源。§6.5 的「反向抽查」是唯一的兜底。

连带的还有 `distributeBossCertificate` 发的 BOSS凭证 `3100000` ——
它在 `Item.wz/Install/0310.img.xml` 里，正好在附录 D 的缺失清单上。所以那 8 个调用它的批次 7
BOSS 脚本，也得等 wz 补齐才有意义。

> **2026-08-17 处置**：这类「代码已接线、道具还不存在」的调用**一律注释掉**，不留在生效路径上。
> 现在发出去只是一件无名无图标的道具，既骗玩家也让问题难被发现。涉及 27 处：
>
> | 凭证 | 调用 | 处 |
> |---|---|---|
> | `3100000` BOSS凭证 | `distributeBossCertificate` | 13（6 个 BOSS 脚本 × 2 层 + `YaoSengPQ` 仅 zh-CN） |
> | `3100001` 组队凭证 | `distributePQClearReward` | 14（7 个 PQ × 2 层） |
>
> 每处都保留了三行说明注释，写明缺的是哪两个 wz（`Item.wz/Install/0310.img.xml` 整份缺失、
> 名字在 `String.wz/Ins.img.xml`），wz 随第 4 项补齐后取消注释即可。
> `LudiPQ` 另发的阿尔泰碎片 `4001198` **不在此列**——该道具 BeiDou 已有，保持生效。

`portal/mahavira_enter.js` 同理但成因不同：这个脚本名只出现在 LK **改过**的
`wz/Map.wz/Map/Map7/702050000.img.xml` 里，BeiDou 的同名文件没有任何 `portal script` 字段。
脚本单独搬过来永远不会被触发，得跟那一行 wz 一起处理。

#### 关键发现三：测谎是唯一一个需要做运营决策的功能

`detectPlayer` + `@detect` + `detectMap.js` / `detected.js` 是一套「玩家互测挂机」机制：
花 1500 点券对另一个玩家发起，对方 15 秒内答不出一道加法题，就被关进监狱 60 分钟并被罚走
10000 点券，钱转给发起方。

**这是一条现成的骚扰渠道** —— 专挑对方打 BOSS、跑图、开商店的时候发起，成本 1500 点券。
所以移植时把它整套参数化并**默认关闭**：

| `game_config` 键 | 默认 | 作用 |
|---|---|---|
| `use_player_detect` | **false** | 普通玩家能否发起。GM（`gmLevel >= 2`）不受此开关限制，也不花钱 |
| `detect_cost_nx` | 1500 | 发起成本 |
| `detect_reward_nx` | 10000 | 罚没并转给发起方的点券上限 |
| `detect_jail_minutes` | 60 | 监禁时长 |
| `detect_answer_seconds` | 15 | 答题时限 |

**开不开是运营决定，不是移植决定。** 现状是「GM 可用、玩家不可用」，
把 `use_player_detect` 打开就变成 LK 的原始形态。

#### 移植时修掉的 LK 问题

| 文件 | 问题 | 处理 |
|---|---|---|
| `detectPlayer` | **目标为空时只发了条消息没有 `return`**，下一句就对 `null` 调 `getLastAttack()` | 加 `return` |
| `detectPlayer` | 没挡「测自己」，测自己会把自己关进监狱 | 加判断 |
| `detectPlayer` | 目标正在与NPC对话时，`openNpc` 直接返回，题目根本弹不出来，倒计时结束照样处罚 | 发起前查 `getCM()`，有会话就不发起 |
| `detectPlayer` | 目标掉线时**直接写 `accounts.nxCredit`** 扣点券 | 不跟。掉线角色的点券还在内存 `CashShop` 里，登出保存与这条 UPDATE 谁后写谁生效，轻则罚款丢失，重则冲掉登出时保存的其它点券改动。改为不处罚 + 退还发起方 |
| `detectPlayer` | `dropMessage("player nx: " + victimNX)` 把别人的点券余额播给发起方 | 删掉 |
| `detectPlayer` | 没考虑**发起方**在这十几秒里下线 | 判罚照做，但退款与赏金不发——往已登出的 `CashShop` 对象记账没人会保存，钱等于凭空消失 |
| `detectPlayer` | 另有 4 处由复查查出（可处罚 GM、题没弹出去也处罚、截止时刻答对仍被罚、入狱污染所有存档位） | 见本节末「复查发现的 6 个问题与修正」 |
| `detectPlayer` | 结束时 `registerRunningCommands(..., null)` | 批次 1 已把 `CommandManager` 换成并发容器，`null` 值会直接抛异常；改成对应的移除 |
| `detectPlayer` | 「先查有没有在测 → 再登记」，两人同时对同一目标发起会双双通过 | 用 `registerRunningCommandIfAbsent` 原子登记 |
| `detectMap.js` | **`getAllPlayers()` 是 `java.util.List`，却按数组用 `.length` / `[i]`** | `.length` 恒为 `undefined`，循环一次都进不去，名单永远是空的 —— 这个脚本在 LK 那边就是坏的。改 `size()` / `get()` |
| `detectMap.js` | 选项值用含自己在内的原下标，跳过自己后下标错位，会选中名单里的另一个人 | 单独维护候选 id 数组 |
| `detectMap.js` | `sendYesNo("是否要检测：" + delectedPlayer)` 把角色对象拼进字符串 | 改 `getName()` |
| `detected.js` | `cm.getText() == c` 拿 `java.lang.String` 和数字做松散比较，GraalVM 下不会像纯 JS 那样转数值 | 改 `parseInt` 严格比较 |
| `detected.js` | 通过检测发 1000 点券 | 去掉。被检测不该有收益，否则找管理员反复检测自己就是刷点券 |
| `2081004.js` | **材料校验写在循环体内**，第一种材料够了就走 `else` 收材料发成品，另外两种一件都不用有 | 改成整批预检再一次性扣除 |
| `2140000.js` | 先扣一千万再重置，不看重置结果 | 改成重置成功才扣钱 |
| `distributeBossCertificate` | 对 `getCharacterById` 的结果直接调 `getAbstractPlayerInteraction()`，打完就离开地图的人会当场 NPE，整个发放循环断在这里，后面的人一个都拿不到 | 加空值跳过 |
| `distributeBossCertificate` | 硬编码物品 `3100000`，还有一句 `System.out.println` 打伤害占比 | 改成 `itemId` 参数；日志删掉 |
| `distributePQClearReward` | 直接迭代 `chars.values()`，不持读锁 | 改走 `getPlayers()` 取快照 |

#### 因 BeiDou API 差异做的调整

- **`Character` 没有 `lastAttack`**。LK 在 `MapleCharacter` 上加了字段并在
  `AbstractDealDamageHandler:143` 打点，BeiDou 两处都没有，本批一并补上
  （`Character.java` 的字段 + `AbstractDealDamageHandler` 里一行）。字段只活在内存，不落库。
- **`Monster.getTakenDamage()` 不存在**，但 `takenDamage` 字段是有的。加了个返回**拷贝**的访问器：
  内部那张表是裸 `HashMap`，写入点在 `applyDamage` 里，直接把内部表交出去会让调用方一边遍历
  一边撞上别人打怪。批次 6 的 `BossDmgAnalysisCommand` 也依赖这个访问器，届时直接用即可。
- `TimerManager.getInstance().schedule(...)` 对齐 BeiDou 现有用法（同批次 4 的 `@gmbot`）。
- 脚本中心 NPC 用 `NpcId.BEI_DOU_NPC_BASE`（9900001），不是 LK 的 9010000。
- 监狱地图用 `MapId.JAIL`，不是魔法数字 `300000012`。
- 卷轴 id 段 `2040000..2050000` 落成 `ItemId.SCROLL_RANGE_START/END`。

#### 21 个独有脚本的最终去向

| 处置 | 数量 | 明细 |
|---|---|---|
| ✅ ported | 4 | `detectMap` / `detected` / `2081004` / `2140000` |
| ❌ already-fixed | 2 | `CentipedeBattle` / `YaoSengBattle` |
| ❌ rejected | 5 | `1002103`（LK 自造的一句寒暄，而该 NPC 在 `Quest.wz/Check.img.xml` 里出现 5 次，给它挂只 `sendOk` 的脚本是净损失）、`1022101_test` / `testScript` / `npcTemplate`（作者自用试验稿）、`1022007 .js`（文件名带空格的笔误，内容其实是 NPC 2010000 的脚本，BeiDou 已有归位版） |
| ⏸ deferred | 10 | 克雷塞尔四件套 + `mahavira_enter` + `9000036_accessory`（挪批次 7）、`under_maintenance`（挪批次 8）、`9800001` / `changePassword` / `verifyEmail`（批次 2、4 已缓） |

> ported 的 4 个脚本都**同时落到 `scripts/` 与 `scripts-zh-CN/` 两套**（§3.5），
> 英文层是重写不是复制，en-US 语言下功能一致。

#### 复查发现的 6 个问题与修正

代码复查提了 1 个 P1、5 个 P2，全部核实成立并已修。**其中两条是本批自己写出来的问题，不是 LK 的**，
分开记：

| # | 级别 | 问题 | 来源 | 修正 |
|---|---|---|---|---|
| 1 | **P1** | **测谎可以处罚 GM。** 只挡了「自己」，没校验目标权限。开了 `use_player_detect` 后普通玩家能对正在打怪的 GM 发起并罚走其点券，低权限 GM 也能处罚高权限 GM | LK 原有 | 加 `victim.isGM()` 拒绝。与 `JailCommand` 一致——它同样直接拒绝 `victim.isGM()`。`isGM()` 的阈值 `gmLevel > 1` 恰好与「发起方免费」的 `gmLevel >= 2` 对齐 |
| 2 | P2 | **题没弹出去也照样处罚。** `getCM()` 预检与 `openNpc` 不是原子的，目标在两者之间自己点开别的 NPC，`openNpc` 就静默返回，而费用与判罚已经生效 | LK 原有（本批的预检只缩小了窗口，没关掉） | 新增 `openDetectionPrompt` 把结果透出来，**成功之后才收费**，失败则 `abortDetection` 撤销整场 |
| 3 | P2 | **截止时刻答对仍会被处罚。** `cancel(false)` 拦不住已经开跑的结算，且原先没看取消结果。答题包与倒计时同时到达时玩家看到「通过」，结算线程照样扣券关监狱 | LK 原有 | 判定改为 CAS，见下 |
| 4 | P2 | **入狱污染所有存档位。** `saveLocationOnWarp()` 会把当前地图灌进 `savedLocations` 的**每一个空槽**，连带占掉自由市场、活动、副本的返回点，而出狱脚本只读 `JAIL` | LK 原有 | 改 `saveLocation("JAIL")`，与 `JailCommand` 一致 |
| 5 | P2 | **`lastAttack` 跨线程读没有可见性保证。** 写在目标频道的攻击线程，而 `@detect` 支持跨频道找人，读的通常是另一个线程，两者之间没有共同的锁 | **本批新增的代码** | 字段加 `volatile` |
| 6 | P2 | **`Monster.getTakenDamage()` 的「快照」不是快照。** `new ArrayList<>(takenDamage.entrySet())` 仍然直接遍历内部裸 `HashMap`，返回拷贝并不能消除拷贝过程本身的竞争 | **本批新增的代码，注释还写错了** | 拷贝动作放进 `lockMonster()`——那正是写入点 `applyDamage` 所在的锁（见 `Monster.damage()`）。可重入，已持锁的调用方直接调也没问题 |

**#3 连带把整个判定机制换掉了。** 原先靠「两个定时任务谁先响」决定结果，这是 LK 的设计，
本批照搬了。它的根本问题是 `ScheduledFuture.cancel(false)` 只能拦住还没开跑的任务。现在改成：

- 新增 `DetectSession`，按被测角色 id 登记在 `DETECT_SESSIONS` 里，登记入口只有 `putIfAbsent` 一处
- 里面一个 `AtomicBoolean settled` 是**判罚与答对之间唯一的裁决点**，两条路径都要 CAS 成功才继续，
  抢输的直接退出；`cancel` 降级成「省一次无谓唤醒」，不再承担正确性
- 脚本侧不再自己下结论：`detected.js` 调 `cm.passDetection()`，按返回值显示「通过」还是
  「答对了但已超时」。顺带把 `Detect` 这个类别字符串从脚本里拿掉了——脚本不该知道它
- **「通过检测」的 20 秒延迟提示整个删掉。** 有了 CAS，答对时可以立刻通知发起方，
  不需要 LK 那个第二定时器，也就不存在两个定时器互相取消的时序问题
- 测谎不再借用 `CommandManager`，改为自带登记表，单一事实来源。
  `registerRunningCommandIfAbsent` 仍由批次 4 的 `@gmbot` 使用，不受影响

**#2 查到了 `start()` 的第三条静默失败路径**，复查意见里没提到：
`NPCScriptManager.start` 在目标处于 500 毫秒点击 NPC 冷却（`canClickNPC()` 为假）时，
只补发一个 `enableActions` 就**照样返回 true**，对话框根本没弹。所以判定成功不能只看返回值，
还要看会话有没有真的登记进去（只有成功那条分支才 `cms.put`），即 `getCM() != null`。

> `openDetectionPrompt` 开头那道 `getCM()` 检查也不能省，理由和防误判无关：
> `NPCScriptManager.start` 自己会把已存在的会话 `dispose` 掉再开新的，
> 少了这道检查，测谎会直接顶掉目标正在进行的对话。

#### 已知未验证

只做了 `mvn -pl gms-server clean compile`，**没有运行验证**。`V1000.0.5` 的 `command_info` 与
`V1000.0.6` 的 5 个 `game_config` 键是否生效需启动服务端跑 Flyway，情况同批次 1、4。
测谎的运行时行为（答对、超时判罚、截止时刻的 CAS 竞争、目标掉线退款、发起方掉线、
题弹不出去时的撤销、两人同时发起）没有实跑确认。

### 批次 6 — 游戏性 triage（唯一无法机械化的部分）

> **本节的范围表已按清单重算。** 原先那张表是按「原始 diff 的文件数」写的，
> 与真实改动数差得很远（`constants/skills/*` 写 52 个文件，实际 **51 个是 noise**，
> 只有 `Corsair.java` 有 +1/-1；`server/quest/*` 写 37 个，实际 **33 个是 noise**）。
> 现在的分母一律取清单里 `area ∈ {java, java-new} 且 disposition = pending` 的行。

#### 真实分母

批次 6 动手时，Java 侧的 pending 是 **168 行**（160 `java` + 8 `java-new`）。
但这 168 行**不都属于批次 6** —— 它们是「Java 侧还没判过的全部」，里面混着别的批次的尾巴
和一大票汉化/编码噪音。按内容分完之后：

| 归属 | 行数 | 说明 |
|---|---|---|
| **批次 6 本批**（G0–G16） | **49** | 见下面的分组表 |
| 批次 7（掉落 / 扭蛋 / 地图数据） | 22 | `MonsterDropEntry` 的 `distinctive` 列、`MonsterInformationProvider`、`@whodrops`/`@whatdropsfrom`、15 个 `server/gachapon/*`、`MapleMapFactory` |
| 批次 8（皇家） | 5 | `RoyalCommand` / `RedeemCommand` / `RoyalAccount` / `CashOperationHandler` / `CashShop` |
| 批次 2、3 的 deferred 尾巴 | 3 | `MapleClient`（角色删除重构）、`AbstractPlayerInteraction`（皇家+邮箱两组方法）、`EnterCashShopHandler`（进商城领投票券） |
| 审计日志（独立项，非本批） | 6 | `LogHelper` / `FilePrinter` / `PlayerInteractionHandler` / `InventoryManipulator` / `GeneralChatHandler` / `PetChatHandler` |
| 封禁重构 | 2 | `BanCommand` / `AdminCommandHandler`（连带 `Character.ban(String→int)`） |
| **GBK/编码补丁 → 终局 rejected** | 17 | §8 风险清单里点名的那批：`BCrypt`、`GenericLittleEndianWriter`、`HexTool`、`StringUtil`、`MapleAESOFB`、`MapleLogger`、`data/{input,output}/*`、`PacketCreator` 的 `writeMapleChartFromCNString` 全套 |
| **硬编码中文汉化 → rejected / already-fixed** | 41 | 把英文串直接换成中文字面量，违反 CLAUDE.md 规则 2；BeiDou 走 i18n 资源 |
| **指令参数由「角色名」改成「角色 id」→ rejected** | 15 | LK 作者自用习惯（`@dc`/`@jail`/`@summon`/`@givenx` 等 15 个），玩家侧是功能倒退 |
| 其余零碎 | 8 | `CommandsExecutor`（BeiDou 走 `command_info` 表，rejected）、`MapleServerHandler`、`RankingLoginTask`、`EnterMTSHandler`、`ItemConstants`、`MapleShop`、两个空异常类 |
| **合计** | **168** | |

> 中间三类（GBK 17 + 汉化 41 + 改 id 15 = **73 行**）不需要写一行代码，
> 只需要在清单里填 `rejected` / `already-fixed` + 依据。
> 它们占了 168 里的 43%，是「pending 数字大 ≠ 工作量大」最典型的一段。

#### 批次 6 本批的分组（49 行 + 2 行 deferred 复核）

| 组 | 主题 | 文件 | 配置键 |
|---|---|---|---|
| **G0** | 配置字段清点 | `config/ServerConfig` | 附录 B 全表的对照基准 |
| **G1** | 刷怪倍率随地图人数变化 | `maps/MapleMap`、`life/SpawnPoint`、`gm4/MobRateCommand`（批次 1 挪来）、`gm0/RatesCommand` | `mob_spawn_base_rate`、`mob_spawnrate_to_player_count`、`mob_count_multiplier` |
| **G2** | 阶梯经验 + 倍率 float 化 | `world/World`、`net/server/Server`、`config/WorldConfig`、`gm0/ShowRatesCommand` | `exp_rate_30`、`exp_rate_70`（world 级） |
| **G3** | 组队蹭经验判定 | `life/MapleMonster`、`tools/IntervalBuilder` | `exp_mob_leech_interval` |
| **G4** | **Godly 装备属性 + 装备成长等级门槛 + 堆叠上限** | `MapleItemInformationProvider`、`inventory/Equip` | `equip_stat_randomize_range`、`item_max_slot`、`elemental_weapon_use_default_lvlup` |
| **G5** | 白医卷轴 / 制作 | `ScrollHandler`、`MakerProcessor`、`MakerItemFactory` | ✅ 已完成 |
| **G6** | 怪物技能与怪打怪 | `life/MobSkill`（157 封技能）、`MobDamageMobHandler`、`maps/MapleReactor` | ✅ java 侧完成（wz 留 pending） |
| **G7** ✅ | 远征次数配额 | `expeditions/{Expedition, ExpeditionType, ExpeditionBossLog}`、`world/PartyCharacter` | — |
| **G8** ✅ | 反外挂 / 误封 | `autoban/{AutobanManager, AutobanFactory}`、`AbstractDealDamageHandler`、`CloseRange`/`Magic`/`Ranged`/`Summon` 四个伤害 handler | — |
| **G9** ✅ | 技能平衡 | `MapleStatEffect`、`AranComboHandler`、`SpecialMoveHandler`、`gm2/BuffMapCommand`、`gm2/EmpowerMeCommand`、`constants/skills/Corsair`、`AssignAPProcessor` | `aran_combo_last_time`、`aran_combo_gm_bonus`、`battleship_hp_per_skill_level`、`battleship_hp_per_level`、`battleship_stance`、`mana_reflection_stance`、`marksman_blind_stance`、`use_gm_no_skill_cooldown`、`fast_reuse_hero_will_divisor` |
| **G10** ✅ | 等级上限 | `constants/game/GameConstants` | `max_level_cap`、`cygnus_max_level_cap` |
| **G11** ✅ | 自动喂药重复消耗 | `PetAutoPotHandler`、`PetAutopotProcessor` | — |
| **G12** | 活动召回限制 | `coordinator/world/EventRecallCoordinator`、`PlayerLoggedinHandler`、`gm2/RecallCommand`（批次 1 待定项） | `max_recall_time`、`recall_cooldown` |
| **G13** | 雇佣商店存续天数 | `maps/HiredMerchant` | `merchant_expire_time` |
| **G14** | `@analysis` BOSS 伤害占比 | `gm0/BossDmgAnalysisCommand`（批次 1 挪来） | — |
| **G15** | 任务奖励 / HP 药丸 | `quest/MapleQuest`、`quest/requirements/MinLevelRequirement`、`UseItemHandler` | — |
| **G16** | `client/Character`（钩子汇聚点，**按组拆散**） | `client/MapleCharacter` 一个文件同时属于 G2/G3/G7/G9/G10/G11 | — |

批次 4 挪进来的两项仍是 `deferred`，跟 **G4** 一起决策（收工时必须把这两行改掉，
`deferred` 不算处理完）：

| LK | 说明 |
|---|---|
| `gm4/ProEquipCommand` | BeiDou 已有 gm4 `ProItemCommand`，但语义不同：BeiDou 把全属性**设为**定值，LK 是在原属性上**加**值且原本为 0 的属性保持 0（保留装备特性） |
| `gm4/DropProEquipCommand` | 与上一个互为 90% 复制，唯一区别是 `spawnItemDrop` 而非 `addFromDrop`。**合并成一个带 drop 开关的指令**，不要两个类 |

#### 盘点阶段就查实的几条（动手前）

| # | 事 | 结论 |
|---|---|---|
| 1 | **Godly 系统不在 `Equip.java`**，计划书原先归错了文件 | 实际在 `ItemInformationProvider.getRandStat()` 的两个重载里（`Randomizer.nextDouble() < 0.05` 分五档 +1~5），`randomizeStats` 是唯一调用方。`Equip.java` 的真改动是**装备成长等级门槛**（`reqLevel + itemLevel*5 > 玩家等级` 就不给经验）和**一次只升一级**（LK 把 `while` 循环注释掉了） |
| 2 | **`Corsair.SPEED_INFUSION` → `HEROS_WILL` 的重命名 BeiDou 已经做过** | `constants/skills/Corsair.java:41` 已是 `HEROS_WILL`，`already-fixed` |
| 3 | **但 Cosmic 的重命名只改了一半，留下一个真 BUG** | [StatEffect.java:1750](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1750) 的 `isInfusion()` 里仍然列着 `Corsair.HEROS_WILL`，而 [:1707](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1707) 的 `isHerosWill()` 开关里**没有** Corsair。结果：船长放英雄的意志会被当成加速灌注，且**不解除异常状态**。LK 的两行改动正好修的是这个 —— 归 **G9**，是本批少数「LK 比 BeiDou 对」的地方 |
| 4 | **发型/脸型 ID 段扩大，BeiDou 早就有了** | `ItemConstants.isFace/isHair` 已按 `itemId/10000 ∈ {2,5}` / `{3,4,6}` 判定，等价于 LK 的 `20000–30000 ∪ 50000–60000` 与 `30000–50000 ∪ 60000–70000`，且 `ItemInformationProvider` 已改调这两个方法。**§7 批次 8 里列的三条前置只剩 Cape 一条**（`1102000..1103000` → `1104000`） |
| 5 | `World` 的 `expRate`/`questRate` **BeiDou 已是 `float`** | LK 的 int→float 那半边是 `already-fixed`；G2 真正的增量只有 `getExpRate(int level)` 这个阶梯重载 |
| 6 | `Character.lastAttack`（`volatile`）与 `Monster.getTakenDamage()` **批次 5 已经加好** | G14 的 `@analysis` 前置齐了，可直接写 |
| 7 | `ExpeditionType` 缺 `KREXEL` / `YAOSENG`，`ExpeditionBossLog` 缺 `BALROG_NORMAL` / `KREXEL` / `YAOSENG` / `SHOWA` 四个条目 | 批次 5 已记，G7 补齐；克雷塞尔仍卡在缺失的两张 wz 地图 |
| 8 | `mob_count_multiplier` / `max_level_cap` / `item_max_slot` 在 BeiDou 的 `game_config` 里**都不存在** | 附录 B 里只有 `equip_exp_rate` 是已有的，`exp_split_level_interval` / `exp_split_leech_interval` 是 BeiDou 侧的同类键（G3 要决定是复用还是新增 `exp_mob_leech_interval`） |
| 9 | `CommandsExecutor` 的 +220/-187 **全是 `addCommand(...)` 注册表** | BeiDou 走 `command_info` 表 + 反射（批次 1 关键发现），整份 `rejected` |
| 10 | LK 的 `MapleMap.getNumShouldSpawn` 里有一段**硬编码地图段 ×2 刷怪** | `220060000..220070400`（玩具城）、`270010100..270030500`（时间神殿）、`702070100..702070400`（藏经阁）。属运营调参而非机制，移植时要么落成配置要么不搬，别把魔法数字抄进来 |

> **最大风险点。** Cosmic 相对 2022 HeavenMS 修了很多 bug，LK 那些「修复 XX 的 BUG」
> 有相当比例 BeiDou 已经修过甚至修得更好。**每条都要先读 BeiDou 当前实现再决定，
> 不可无脑覆盖，否则造成功能回退。** 上面第 2、4、5 条就是这么查出来的。

#### G4 — Godly + 装备成长 ✅ 已完成

原定 7 个子项，逐条查 BeiDou 现状后 **3 个 already-fixed，4 个写了代码**。

| 子项 | 处置 | 依据 |
|---|---|---|
| Godly 属性（每档 1% 概率 +1~N） | ✅ `equip_godly_max_bonus`（默认 5） | 见下 |
| `randomizeStats` 浮动范围参数化 | ✅ `equip_stat_randomize_range`（默认 5） | 默认值与原硬编码逐位相同，参数化零行为变更 |
| 成长装备等级门槛 | ✅ `use_equip_growth_level_limit`（默认 true） | `Equip.gainItemExp` + `ItemInformationProvider.canWearEquipment` 两处 |
| 元素武器升级方式 | ✅ `use_elemental_weapon_gms_levelup`（默认 true） | 1 行 |
| `@proequip` / `@dropproequip` | ✅ 合并成一条带 `drop` 开关的指令 | 批次 4 挪来的两个 `deferred` 就此结清 |
| **`ITEM_MAX_SLOT`** | ❌ **already-fixed，BeiDou 更完整** | 见下 |
| **「一次只升一级」** | ❌ **already-fixed** | [Equip.java:725](../gms-server/src/main/java/org/gms/client/inventory/Equip.java#L725) 的 `use_equipment_level_up_continuous` 是同一件事且可配；LK 是硬编码 |

**`ITEM_MAX_SLOT` 为什么判 already-fixed。** LK 只替换了 `smEntry == null` 兜底分支里的
魔法数字 `100`，而绝大多数消耗品在 wz 里**都有** `slotMax`，压根走不到那条分支 ——
这个旋钮在 LK 那边基本是失效的。BeiDou 的
[`item_slot_max`](../gms-server/src/main/java/org/gms/server/ItemInformationProvider.java#L369)
（`V1.7.0`，默认 `0` = 取 wz 值）两条分支都覆盖，还多一层 `canChangeSlotMax()` 只放开 USE/ETC 不动 CASH。
**附录 B 的 `ITEM_MAX_SLOT` 一行作废。**

##### Godly 的真实作用面（LK 没算过）

它改的是 `getRandStat` / `getRandUpgradedStat` 两个**共用**的私有方法，所以牵连范围比
「装备掉落」大得多：

| 入口 | 调用点 |
|---|---|
| 怪物掉落 / 任务掉落 / `spawnItemDropList` | `MapleMap:694`、`:722`、`:2246` |
| 反应堆掉落 | `ReactorActionManager:183`、`:215` |
| 脚本 `gainItem(..., randomStats=true)` | `AbstractPlayerInteraction:695` |
| **专业技能制作（Maker）** | `MakerProcessor:447` → `randomizeUpgradeStats` |

Maker 这条是单独确认过要跟的 —— Maker 本身就是「花材料赌属性」，加档位符合定位。

##### 移植时修掉 / 改掉的

| 文件 | 问题 | 处理 |
|---|---|---|
| `getRandStat` / `getRandUpgradedStat` | 同一段 20 行 if-else **逐字复制了两遍**，档位数写死 5 无法调 | 抽成一个 `godlyBonus()`，档位数由配置给，`0` = 关闭 |
| `canEquip` | 等级上限写死 `chr.getLevel() < 200`，而 LK 自己在 `Equip.gainItemExp` 里用的是 `MAX_LEVEL_CAP` —— **同一套规则两个口径** | 两处统一用 `max_level_cap` |
| `canEquip` | 拒绝时直接 `return false`，没有 `equip.wear(false)` | 补上。BeiDou 该方法所有其它失败分支都会先 `wear(false)`，漏了会让客户端显示态与服务端不一致 |
| `canEquip` | 另加 `chr.gmLevel() < 8` 作 GM 豁免 | 不搬。BeiDou 该方法开头 [:1861](../gms-server/src/main/java/org/gms/server/ItemInformationProvider.java#L1861) 已对 `Job.SUPERGM/GM` 直接放行，再加一层 gmLevel 就是两套 GM 口径 |
| `ProEquipCommand` | `Math.max(0, x > 0 ? x + statGain : 0)` **只防负不防上溢**，`@proequip <id> 30000` 会把 `short` 绕成负数 | 先在 `int` 域相加再钳到 `Short.MAX_VALUE` |
| `ProEquipCommand` | 裸 `Integer.parseInt` / `Short.parseShort` | 加 `NumberFormatException` 保护 |
| `DropProEquipCommand` | 与上一个 90% 逐字复制 | 不建类，合并成第三个参数 `drop` |
| 全部 | 中文硬编码 | `I18nUtil` + zh/en 两份（`ProEquipCommand.message1..4`、`ItemInformationProvider.message1`） |

##### 因 BeiDou 差异做的调整

- **`equip_stat_randomize_range` 的作用面比看上去小，已写进配置描述**：浮动区间是
  `min(ceil(属性值 * 0.1), 本配置)`，所以只有属性值 **> 50** 时本配置才可能成为约束，
  调它对低等级装备完全无效。LK 没说这件事。
- **`randomizeStats` 里把配置取值提到方法开头取一次**。`GameConfig` 支持热重载，
  逐项取 14 次可能读到不一致的中间态，同一件装备的 14 项应该用同一个范围。
- **`ELEMENTAL_WEAPON_USE_DEFAULT_LVLUP` 改名 `use_elemental_weapon_gms_levelup`**。
  原键名里的 "default" 指的是 **GMS 原版**（读 wz 的 0~2 点小幅成长），不是
  `improveDefaultStats`；名字读起来和实际行为正好相反。
- **两个成长门槛公式差一级是有意的，照搬**：`itemLevel = L` 的装备穿戴要求
  `reqLevel + (L-1)*5`，而它升到 `L+1` 需要玩家已达 `reqLevel + L*5` ——
  正好是 L+1 级的穿戴要求。即「只有已经穿得上下一级，装备才会长到下一级」。
- **`@proequip` 不打 `UNTRADEABLE` 也不 `setOwner`**（与原实现一致）。
  既有的 `@proitem` 两样都做，两条指令定位不同，都保留。

##### 已知未验证

只做了 `mvn -q -pl gms-server clean compile`，**没有运行验证**。`V1000.0.7` 的 5 个
`game_config` 键与 `V1000.0.8` 的 `command_info` 插入是否生效需启动服务端跑 Flyway，
情况同批次 1、4、5。Godly 的实际掉落分布、成长门槛在登录时对已穿装备的判定、
`@proequip` 的 drop 分支都没有实跑确认。

#### G1 — 刷怪倍率 ✅ 已完成

| 子项 | 处置 |
|---|---|
| `getCurrentSpawnRate` 按有效玩家数计 | ✅ `mob_spawn_base_rate` + `mob_spawnrate_to_player_count` |
| 单刷怪点容量 1 → 2 | ✅ `mob_spawn_point_capacity`（默认 2），BOSS 点恒为 1 |
| BOSS 重生时间 ±20% 随机 | ✅ |
| `@mobrate` | ✅ gm4，批次 1 挪来的项就此结清 |
| `@rates` 显示刷怪倍率 | ✅ |
| **按地图 id 段硬编码 ×2** | ❌ **rejected，改用 wz 数据**，见下 |

##### 关键发现：`Map.wz` 的 `info/mobRate` BeiDou 一直在读，读完扔了

原实现给三段地图 id 硬编码 ×2 刷怪：

```java
if ((mapid >= 220060000 && mapid <= 220070400) || (mapid >= 270010100 && mapid <= 270030500)
        || (mapid >= 702070100 && mapid <= 702070400)) {
    maxNumShouldSpawn *= 2;                     // 玩具城 / 时间神殿 / 藏经阁
}
```

而 MapleStory 本来就有表达「这张图刷怪多密」的字段。
[MapFactory.java:155](../gms-server/src/main/java/org/gms/server/maps/MapFactory.java#L155) 把
`info/mobRate` 解析出来传给构造器，[MapleMap.java:202](../gms-server/src/main/java/org/gms/server/maps/MapleMap.java#L202)
存进 `private byte monsterRate` —— **然后全仓库再没有第二处引用**。没有 getter，没有 Lombok，是个死字段。

| | |
|---|---|
| 地图 img 总数 | 5364 |
| 带 `mobRate` 的 | **5363** |
| 取值范围 | 0.4 ~ 10，其中 2321 张是 1.0，**3000 多张不是** |

再看原实现那三段在 wz 里的真实值，方向甚至是反的：

| 硬编码 ×2 的段 | wz `mobRate` |
|---|---|
| 玩具城 `2200[6-7]` | 0.4 / 0.5 / 0.6 / 0.7×5 / 0.8 / 1.0×2 / 1.1 —— **Nexon 特意调低的** |
| 时间神殿 `2700[1-3]` | 1.0×18 / 1.4×5 / 1.5×10 |
| 藏经阁 `70207` | 0.5 / 0.9×3 —— 该段本身是 LK 自加的少林寺地图，BeiDou 没有 |

**改法**：`getNumShouldSpawn` 里乘上 `monsterRate`，字段从 `byte` 改回 `float`
（`(byte) Math.ceil` 会把 0.4~1.0 全压成 1、1.1~2.0 全压成 2，整个分布毁掉），
加 `use_wz_map_mob_rate` 开关（默认 `true`，关掉即恢复到启用前的表现）。

**为什么这样比硬编码好**：3000 多张地图各有各的密度而不是三段 id 一刀切；
新地图自带数值不用改 Java；`mobRate` 是 Nexon 的原始设计意图，与客户端表现一致。

**溢出风险已核**：`mobRate = 10` 的有 615 张，但其中 **576 张刷怪点数为 0**
（925/926 段全是 PQ 与活动图），乘出来还是 0；剩下刷怪点多的几张也全在 9xxxxxxxx 活动图段。
且真正的天花板是 `SpawnPoint` 的容量 —— 单点最多 `mob_spawn_point_capacity` 只，
所以 `mobRate` 再大也只是「一次填满」而非无限刷。

##### 移植时修掉的

| 文件 | 问题 | 处理 |
|---|---|---|
| `getCurrentSpawnRate` | **裸遍历 `characters` 两遍，完全不持锁** | ⚠️ `characters` 是 `LinkedHashSet`，由 `chrLock` 读写锁保护，`respawn()` 自己取个 `size()` 都要先 `chrRLock.lock()`。照搬会在有人进出地图时 `ConcurrentModificationException`。改为 `getAllPlayers()` 取一次快照，两遍都在快照上走。**与批次 5 复查抓出的两条并发问题同一类** |
| `getCurrentSpawnRate` | 逐人 `+= 0.1f` 累加浮点 | 改为累加人数、最后乘一次，消除累积误差 |
| `getCurrentSpawnRate` | 保留了已经用不上的 `int numPlayers` 参数，它自己的 `RatesCommand` 里只好瞎传 `getCurrentSpawnRate(1)` | 去掉参数，连带 `getNumShouldSpawn(int)` 也去掉（全仓库只有 `respawn()` 一个调用方；`numPlayers == 0` 的提前返回留在 `respawn()` 里） |
| `SpawnPoint` | 为了调 `mob.isBoss()` 加了 `private MapleMonster mob` 字段 —— 那是**有状态的实例对象**（HP、buff、控制者），每个刷怪点常驻一份，而 `getMonster()` 每次又 `new` 一只新的，存着的那只永远用不上 | 改为构造时取一次 `private final boolean boss` |
| `SpawnPoint` | `Math.random()` | 改 `Randomizer.nextDouble()`。前者是全局共享的 `Random`，刷怪定时器多线程调用会争用同一个种子 |
| `SpawnPoint` | `new Double(mobTime)` | Java 9 起 `@Deprecated`；连带 `* 1000` 改用该文件既有的 `SECONDS.toMillis` |
| `SpawnPoint` | 最终态把 `MOB_COUNT_MULTIPLIER` 注释掉写死 `2` | 取回配置形态（§6.5 说的「反复推翻自己」） |
| `MobRateCommand` | 硬编码下限 `Math.max(value, 0.7f)`，**恰好等于 `MOB_SPAWN_BASE_RATE` 的默认值，意味着永远调不低** | 改为不得为负 |
| `MobRateCommand` | 写 `YamlConfig` 静态字段，后台完全看不见 | `GameConfig.update`（照 `gm5/ShowMoveLifeCommand`）。仍只改内存不落库，所以 `@mobrate` 是临时调参，重启回表里的值 —— 这一点在指令描述里写明了 |
| `RatesCommand` | 为显示刷怪点数把 `getMonsterSpawn()` 改成 `public` | 不改。该方法返回整个列表的拷贝，只为取 `size` 暴露不划算；改为加 `getMonsterSpawnPointCount()` |

##### 人数上限：不跟原实现，保留封顶

原公式是 `0.70 + 0.05 × min(6, 人数)`，封顶 6 人；移植来源把这个上限去掉了，
一张图 20 个有效玩家就是 `0.7 + 2.0 = 2.7` 倍，无天花板。**这一条不跟** ——
上限保留为 6，落成配置项 `mob_spawnrate_max_players`（置 `0` 才是不封顶）。

最终公式：

```
刷怪倍率 = mob_spawn_base_rate
         + min(有效玩家数, mob_spawnrate_max_players) × mob_spawnrate_to_player_count
怪物数上限 = ceil(刷怪倍率 × 本图 wz mobRate × 刷怪点数)
实际天花板 = 刷怪点数 × mob_spawn_point_capacity（BOSS 点恒为 1）
```

##### 已知未验证

只做了 `mvn -q -pl gms-server clean compile`。`V1000.0.9` 的 5 个 `game_config` 键与
`V1000.0.10` 的 `command_info` 是否生效需启动服务端跑 Flyway。刷怪密度的实际观感、
`mobRate` 高的活动图会不会有意外、BOSS 重生随机化都没有实跑确认。

#### G2 — 阶梯经验 / 倍率 float 化 ✅ 已完成（**一行移植代码都没写**）

整组 `already-fixed` + `rejected`。这是 C 类 triage 最典型的一次结果 ——
**Cosmic/BeiDou 在同一件事上做得更细，照搬会造成功能倒退。**

| 子项 | 处置 | 依据 |
|---|---|---|
| 阶梯经验 `exp_rate_30` / `exp_rate_70` | ❌ already-fixed | BeiDou 有**四套**，见下 |
| `World.getExpRate(int level)` 分档重载 | ❌ rejected | 随上；BeiDou 的等级加成挂在 `Character` 层不在 `World` 层 |
| 倍率 `int` → `float` | ❌ 一半 already-fixed | `World` 与 `Character` 的 exp/drop/meso/quest 倍率**本来就是 float** |
| 点券券倍率 `int` → `float` | ❌ rejected | 见下 |
| `gainExp(float)` / `gainMeso(float)` 重载 | ❌ rejected | 见下 |
| `hasMerchant()` 时经验 ×1.05 | ❌ rejected | 摆摊本就是挂机收益，再给经验加成会让「开店挂机」严格优于「不开店挂机」 |
| `ShowRatesCommand` 传等级 | ❌ rejected | 那行的唯一目的是配合已否决的分档重载 |

##### 为什么阶梯经验判 already-fixed

原实现是世界级三档写死：**<30 → 2x，30–69 → 3x，≥70 → 4x**（`config.yaml` 的
`exp_rate_30: 2` / `exp_rate_70: 3` / `exp_rate: 4`）。BeiDou 侧已有的：

| 机制 | 位置 | 形状 | 默认 |
|---|---|---|---|
| 每 20 级提升倍率 | `Character.setPlayerRates` + `GameConstants.EXP_RATE_GAIN` | 斐波那契 `{1,2,3,5,8,13,21,34,55,89,144,233,377,610}`，按 `level/20` 取档，**14 档** | `use_add_rates_by_level` = false |
| 线性等级经验 | [Character.java:4632](../gms-server/src/main/java/org/gms/client/Character.java#L4632) `getLevelExpRate()` | `1 + level_exp_rate × 等级`，连续 | `level_exp_rate` = 0 |
| **冲刺等级** | [Character.java:4636](../gms-server/src/main/java/org/gms/client/Character.java#L4636) `getQuickLevelExpRate()` | `1 + (quick_level − 等级) × 系数`，**低于目标等级越多加成越高** | `quick_level` = 0 |
| 新手保护 | `hasNoviceExpRate()` | 初心者 11 级前恒 1x | `use_enforce_novice_exp_rate` |

第三条**就是那两个键的意图**（早期给加成、到线收回），只是连续斜坡而非两个断崖；
第一条是同样的「随等级抬倍率」但 14 档而非 3 档，而且挂在 `Character.expRate` 上、
经 `ExtendValue` **按角色持久化**、有 `revertLastPlayerRates` 正确回滚、`@level`/`@maxstat` 都维护它。
再叠一层世界级三档只会与这四套**连乘**，得到一个谁也说不清的最终倍率。

##### 券倍率与 float 重载为什么 rejected

- **券倍率**：原实现只是把 `rs.getInt("rate")` 改成 `rs.getFloat("rate")`，`nxcoupons.rate`
  那一列它自己没动 —— 这是全面 float 化的**附带产物，不是特性**。BeiDou 侧要跟就得连 DDL 一起改，
  换来的只是「点券券可以有 1.5 倍」这种目前没人要的能力。
- **`gainExp(float)`**：函数体就是 `gainExp((int) gain, ...)`。原实现加它是因为自己的倍率变 float 后
  调用点传不进去，BeiDou 没这个问题。**一个静默 `(int)` 截断的重载是坑** —— `gainExp(0.9f)` 变成 0 且无提示。

##### 顺带修掉的一个 BeiDou 自身 BUG：冲刺等级功能是死的

| 位置 | 键名 |
|---|---|
| `Character.getQuickLevelExpRate()` 读 | `quick_level_exp_rate` |
| `V1.3.0__create_world_prop.sql:19` 旧表列 | `quick_level_exp_rate` |
| **`V1.7.0__create_game_config.sql:29` 实际插入** | **`quick_level_rate`** ← 少了 `_exp` |

从 `world_prop` 迁到 `game_config` 时键名写错了。`GameConfig.getWorldFloat` 缺键返回 `0F`，
于是 `1 + (quickLv − level) × 0 = 1` —— **只要有人把 `quick_level` 打开，加成恒为 1 倍，功能静默失效**。
默认 `quick_level = 0` 时方法提前返回 1，所以一直没暴露。

**修法：改 `Character.java` 去读 `quick_level_rate`**，不发迁移改 DB 键名。
理由是这样不动上游迁移建的行、在任何安装状态下都成立，且 `quick_level_rate` 正是运维
今天在 gms-ui 里看到的名字；命名与 `level_exp_rate` 不一致是观感问题，功能失效才是 bug。

> 这不是移植项，是路过发现的。清单里不占行。

##### 更正批次 1 的一条记录

§7 批次 1 写着「`World` 只有 `setExpRate`/`setDropRate`，**没有 `setQuestRate`**
（`questRate` 是无 setter 的私有字段）」—— **实际有**，Lombok `@Setter` 生成的
（[World.java:141](../gms-server/src/main/java/org/gms/net/server/world/World.java#L141)），
`GameConfig.update` 的 `case "quest_rate"` 一直在调它。当时据此判定
`CommandManager.setWorldQuestRate` 「补不了」，结论（不补）不变但依据是错的 ——
真正的理由是批次 4 记的那条：唯一消费方 `RateEventCommand` 已 `rejected`。

#### G1/G4 复查发现的 5 个问题与修正

代码复查提了 5 个 P2，**全部核实成立并已修**。其中 4 条是本批自己写出来的，1 条是既有的，分开记：

| # | 问题 | 来源 | 修正 |
|---|---|---|---|
| 1 | **连续升级绕过成长门槛。** 门槛只在 `gainItemExp` 进入时查一次，开着 `use_equipment_level_up_continuous` 时 `while` 会连升多级而不重新校验。15 级玩家能把需求 10 级的装备从 Lv1 一口气升到 Lv3，最终穿戴要求 20 级 —— 自己穿不上了 | **本批新增** | 抽出 `isGrowthBlocked(Client)`，**每次 `gainLevel` 前重新判**；被门槛拦下时 `break` 而**不清零 `itemExp`**，等玩家够级了接着升 |
| 2 | **满级骑士团拿不到门槛豁免。** 两处都用统一的 `max_level_cap`（200）判满级，而 `Character.getMaxClassLevel()` 对骑士团返回 120。120 级骑士团已经满级却仍被当作未满级，装备在需求 125 级时永久停止成长 | **本批新增** | 两处（`Equip.gainItemExp`、`ItemInformationProvider.canWearEquipment`）都改用 `chr.getMaxClassLevel()`。附带好处：G10 把该方法改成读 `max_level_cap`/`cygnus_max_level_cap` 之后，这里自动跟着走 |
| 3 | **刷怪点容量检查不是原子的。** `shouldSpawn()` 读完 `spawnedMonsters` 到 `getMonster()` 里 `incrementAndGet` 之间有窗口 | **既有问题**，改动前判的是 `spawnedMonsters.get() > 0`，同样是先查后增 | 见下 |
| 4 | **`@mobrate` 接受 NaN 与 Infinity。** `Float.parseFloat` 收下 `NaN`/`Infinity`/溢出的科学计数法，`Math.max` 也拦不住 NaN。写进配置后 `getNumShouldSpawn` 的乘积取整恒为 0，**全服所有地图停止补怪**直到再改一次或重启 | **本批新增** | 抽出 `parseRate`，用 `Float.isFinite` 校验并限制到 `0..100`，非法输入给出提示 |
| 5 | **Godly 档数没有有效范围。** 该值运营可在后台自由填。填到 100 以上时低档位的概率区间被高档位挤没，「总概率 = 档数%」不再成立；填到 `Short.MAX_VALUE` 以上返回值溢出成负数，直接污染装备属性 | **本批新增** | 消费端 `Math.min(..., 100)` 钳位；顺带把 `equip_stat_randomize_range` 钳到非负（负值会让浮动区间反向） |

**#3 的竞态路径是通的，但性质与其余四条不同。** `MapManager.updateMaps()` 遍历**所有**地图调
`map.respawn()`，而 `MonsterCarnival` 对自己那张图另起了一个 `respawnTask`
（[MonsterCarnival.java:114](../gms-server/src/main/java/org/gms/server/partyquest/MonsterCarnival.java#L114)），
两个定时器会并发打同一张图。不过这个窗口在改动前就存在，且后果**自愈**
（多出来的怪被打死后 `monsterKilled` 会把计数减回去），既不泄漏也不可利用。

修法选了**不改调用契约、无泄漏风险**的那一种：把名额占用挪进 `getMonster()`，
**先 `incrementAndGet` 再比对容量，超了立刻 `decrementAndGet` 并返回 `null`**。
`shouldSpawn()` 退化成预筛，7 个 `getMonster()` 调用点加空值跳过。

> 没有选「`shouldSpawn()` 占位 + `getMonster()` 消费」那种方案：它要在
> `MapleMap` 里重建一套预留协议，而**一次泄漏的预留会让该刷怪点永久不再出怪** ——
> 比它要修的这个自愈问题严重得多。回退发生在建怪之前，也就不存在「挂上监听器却没入场」的怪。

#### G3 — 组队蹭经验判定 ✅ 已完成（同样一行代码没写）

原实现把整套 `IntervalBuilder` 删掉，换成一行：

```java
// below mob leech level and did no damage to mob
if (member.getLevel() < this.getLevel() - EXP_MOB_LEECH_INTERVAL && member.getId() != killerId) {
    underleveled.add(member);
    continue;
}
```
并在基线里就先把等级上界拆了（`addInterval(mobLevel - N, 300)`，注释写 `remove upper limit`），
两个 `EXP_SPLIT_*` 键合并成一个 `EXP_MOB_LEECH_INTERVAL`。

##### 判反了会很容易：`killerId` 豁免 BeiDou 早就有，而且更宽

[Monster.java:552](../gms-server/src/main/java/org/gms/server/life/Monster.java#L552) 的
`leechInterval` **给每个出过伤害的队员都以自己的等级为中心加了一段区间**，
所以任何造成过伤害的人 `inInterval(自己的等级)` 恒为真。
而 `partyParticipation` 只由 `takenDamage` 构建
（[Monster.java:617](../gms-server/src/main/java/org/gms/server/life/Monster.java#L617)），
里面只有真正打过怪的人 —— 「出力即豁免」成立。

| | 低于怪物等级时谁还能拿到经验 |
|---|---|
| **BeiDou** | **任何出过力的队员** |
| 原实现 | **只有最后一击那个人** |

打了 90% 血但没抢到最后一击的低级队员，在原实现那儿颗粒无收，在 BeiDou 这儿拿得到。
**`killerId` 豁免不是增量，是收窄。**

##### 逐条判定

| 子项 | 处置 | 依据 |
|---|---|---|
| 用单一 `mobLevel − N` 规则替换 `IntervalBuilder` | ❌ rejected | 见上；BeiDou 的区间方案豁免更宽、可调项更多（两个半径 vs 一个）、还多一条上界闸门 |
| 去掉等级上界（`…, 300`） | ❌ rejected | 这是反代练的那一半。删掉后 200 级角色陪 20 级朋友打怪也算有效成员，收益基本为零（低级怪经验可忽略），代价是失去上界 |
| `EXP_MOB_LEECH_INTERVAL` 配置键 | ❌ rejected | 合成一个键是**降低**表达力；BeiDou 的 `exp_split_level_interval` / `exp_split_leech_interval` 默认都是 5，与它同量级，数值上也不用调 |
| `killerId` 传进 `distributePartyExperience` | ❌ rejected | 不需要；该参数在 BeiDou 的 `distributeExperience` 里本来就有，用于事件实例 |
| `tools/IntervalBuilder` | ❌ rejected | 唯一改动是去掉 `private final` 并留了句 `// HanHuaMod`，无行为变化；该对象是每次新建的局部实例，`final` 该留 |
| `Character` 的「无法获取经验」提示中文化 | ❌ already-fixed | [Character.java:8624](../gms-server/src/main/java/org/gms/client/Character.java#L8624) 已走 `I18nUtil.getMessage("Character.showUnderLeveledInfo", ...)`，zh/en 两份都在 |

> `MapleMonster.java` 判 `ported` 而非 `rejected` —— 它还含批次 5 已移植的 `getTakenDamage()`。
> 本组只否掉了蹭经验判定那一半。

##### 清单影响

`WorldConfig.java` / `ShowRatesCommand.java` / `IntervalBuilder.java` 三行判 `rejected`，
`MapleMonster.java` 判 `ported`。
`World.java` / `Server.java` / `MapleCharacter.java` / `ServerConfig.java` **仍是 `pending`** ——
它们各自还夹着别组的改动（`World` 有 G13 的雇佣商店存续、`Server` 有角色删除与批次 3 的投票任务、
`MapleCharacter` 是 G2/G3/G7/G9/G10/G11 的汇聚点、`ServerConfig` 要等全部配置键落地）。

#### G5 — 白医卷轴 / 制作 ✅ 已完成

`git diff --stat` 看是 4 个文件 300+ 行，`git diff -w` 之后只剩 **8 个语义点**（LK 在这批做过一次
全仓库 IDE 重排，`switch(` → `switch (`、去尾空格、import 之间加空行，占了绝大部分行数）。
其中 2 个搬、5 个否、1 个纯噪声。

##### 逐条判定

| # | 项 | 判定 | 依据 |
|---|---|---|---|
| 1 | `ScrollHandler` 白医失败无提示 | ✅ ported | 唯一的真改动。原先客户端只收到一个失败特效，不说明原因 |
| 2 | `canUseCleanSlate` 规则重写 | ✅ ported（**带开关**） | 见下 |
| 3 | `canUseCleanSlate` 硬编码禁用 1122000 | ❌ rejected | 运营口味不是修 BUG。黑龙项链在 v83 数据里 `Character.wz/Accessory/01122000.img.xml:25` 是 `tuc=3`，本来就可打卷；且 LK 只堵白医不堵普通卷轴，自身也不自洽 |
| 4 | `scrollEquipWithId` 去掉 `assertGM` | ❌ rejected | `assertGM` 在 BeiDou 是 `isGM && use_perfect_gm_scroll`，删掉它等于把这个配置的唯一效果删掉，键就成了死键。想要 LK 的行为把配置关掉即可，零代码 |
| 5 | `MakerProcessor` 护盾并入 `isWeapon` | ✅ ported | 真 BUG，且是活的，见下 |
| 6 | `MakerProcessor` 提示文案 | ✅ ported（**转 i18n，不抄中文硬编码**） | LK 把 6 处英文字面量换成中文字面量，两者都不合规则 2 |
| 7 | `MakerItemFactory` 配方改读 wz | ❌ rejected | 见下 |
| 8 | `MakerSkillHandler` | ⬜ noise | 只删了 javadoc 里一个空 `*` 行 |

##### 白医规则（项 2）——为什么给开关而不是直接覆盖

两套规则语义根本不同，不是「谁修了谁的 BUG」：

- **BeiDou 原实现**：白医 = 找回一次打卷失败掉掉的孔。判定式
  `剩余孔 + 已成功次数 < tuc + Vicious`，等价于「这件装备失败过」。总孔数永不超过 `tuc`。
- **LK**：白医 = 给已经打满的装备额外加一个孔。判定式只有 `剩余孔 == 0`。

逐状态对照：

| 装备状态 | 剩余孔 | 已成功 | BeiDou | LK |
|---|---|---|---|---|
| 全新未打（7 孔） | 7 | 0 | ✗ | ✗ |
| 失败过一次 | 6 | 0 | ✓ | ✗ |
| 7 孔全成功 | 0 | 7 | ✗ | ✓ |

关键在第三行：LK 规则下「白医开孔 → 打卷成功 → 剩余孔又是 0 → 再白医」可以无限循环，
**总孔数没有上界**。按原实现的语义这是漏判，按 LK 的语义这是刻意的产出放宽——所以做成
`use_lk_clean_slate`（`V1000.0.11`，**默认 true**），而不是二选一。

落地时补的两件事（LK 没有，标出来）：

1. **保留 `tuc == 0` 的前置拦截**。LK 直接 `return getUpgradeSlots() == 0`，那么本身不可打卷
   （`tuc=0`）的装备也会因为「剩余孔是 0」而通过，被白医开出第一个孔。BeiDou 这条通用拦截
   放在开关之前，两种规则共用——这也正是 LK 需要硬编码 1122000 那种单件黑名单的原因，
   通用拦截在，就不需要黑名单。
2. **挡 byte 溢出**。`upgradeSlots` 是 `byte`，开关打开后孔数没有 `tuc` 封顶，加到 127 再 +1
   会绕成 -128，装备既打不了卷（`< 1`）也用不了白医（`!= 0`），直接废掉。
   [ItemInformationProvider.java:1113](../gms-server/src/main/java/org/gms/server/ItemInformationProvider.java#L1113)
   的自增加了 `< Byte.MAX_VALUE` 条件。

##### 护盾吃不到攻击宝石（项 5）——查证是活 BUG

`removeOddMakerReagents` 里 `type < 42502 && !isWeapon` 直接 `return false`
（[MakerProcessor.java:257](../gms-server/src/main/java/org/gms/client/processor/action/MakerProcessor.java#L257)），
而 `ItemConstants.isWeapon` 的下界是 `1302000`，护盾段 `1092xxx` 落在外面。

三点确认它不是死代码：

- `V1.0.53__maker_insert_data.sql` 的 create 段里有 **20 个 1092xxx 护盾配方**
  （1092004、1092009、1092060 …）。
- 唯一的逃生阀 `use_maker_permissive_atk_up` 默认 **false**（`V1.7.0__create_game_config.sql:100`），
  而且它是一刀切放开**所有**非武器，粒度太粗，不能算已修。
- 上游那句 `// thanks Vcoc for finding a case where a weapon wouldn't be counted as such
  due to a bounding on isWeapon` 说的就是这个下界，LK 补的正是它漏掉的那一类。

`ItemConstants.isShield` 在 BeiDou 不存在，本组顺带新增。

##### 配方数据源（项 7）——不跟 LK 换到 wz

LK 新增 `getMakerRecipe` 读 `Etc.wz/ItemMake.img`，把 `MakerItemFactory` 从
`makercreatedata`/`makerrecipedata` 两张表切过去。不跟，三个理由：

1. **不是覆盖率问题**。`ItemMake.img.xml` 里有 **834** 个 8 位 itemid，
   `V1.0.53__maker_insert_data.sql` 的 create 段有 **836** 行，两边等价。
2. **DB 源可运营，wz 源不可**。改一条配方 = 一条 SQL vs 改 wz + 重启 + 客户端同步。
3. **LK 这版有 NPE**（修 LK 的问题，按 §3.7 标出）。`getMakerRecipe` 在缓存未命中且
   `ItemMake.img` 里也查不到该 itemid 时，`for` 一次都不 `break`，`makerEntry` 保持 `null` 返回；
   调用方 `MakerItemFactory:41` 紧接着 `makerEntry.isInvalid()` 就炸。BeiDou 的 DB 版在这条路上
   返回 `cost/reqLevel/reqMakerLevel` 全 `-1` 的 entry，被 `getCreateStatus` 的 `case -1` 正常拦住。

顺带记一笔：真正该走 wz 的地方 BeiDou 已经走了——
`getMakerStimulant`（[:2255](../gms-server/src/main/java/org/gms/server/ItemInformationProvider.java#L2255)）
读的就是 `ItemMake.img`。配方留在 DB 是有意的，不是遗漏。

##### i18n（项 6）——两处主动扩范围，先说明

- **多转了 3 条**。LK 只改了 7 条里的后 6 条，BeiDou 的 `execute` 里另有 3 条英文硬编码
  （怪物结晶转换/分解/未知错误，`:69` `:87` `:92`）LK 没碰。同一个方法、同一个
  `serverNotice(1, …)` 模式，7 条走 i18n、3 条留英文硬编码更糟，一并转掉，共 10 条。
- **`en_US` 保留 BeiDou 原有英文原文**，只有 `MakerProcessor.message4` 改了措辞
  （加上 shield，因为规则本身变了）。英文玩家其余文案零变化。
- **`zh_CN` 用 LK 的措辞，但改掉一处病句**：LK 写「你的背包不足 (N) 金币来完成此次锻造。」
  原文是 mesos 不足与背包无关，改成「你的金币不足（{0}），无法完成此次锻造。」
- `message6`/`message7` 的英文里有 `don't`，而这两条带 `{0}` 参数会走 `MessageFormat`，
  单引号是转义符。这两条写成 `don''t`。**注意仓库里已有同类隐患**
  （`ClearSavedLocationsCommand.message2`、`JailCommand.message4`、`GetAccCommand.message3` 等
  都是 `{0}'s` 单引号，渲染时撇号会被吃掉），不属本组范围，另记。

##### 清单影响

`ScrollHandler.java`、`MakerProcessor.java` 判 `ported`，`MakerItemFactory.java` 判 `rejected`
（`MakerSkillHandler.java` 生成器已判 `noise`）。

`ItemConstants.java` **仍是 `pending`**：本组只取走了 `isShield`，它还夹着两项别组的改动——
`isPotion` 加 `2002xxx` 与 `2050004`（消费方是宠物自动喂药，属 **G11**）、
`isHair` 上界 `35000` → `70000`（属**批次 8**，且 BeiDou 现有实现按 `itemId/10000 ∈ {3,4,6}` 判，
已覆盖 30000–69999，大概率是 `already-fixed`，留给批次 8 定）。

`MapleItemInformationProvider.java` 也**仍是 `pending`**：本组在它身上只加了白医开关，
它还欠批次 7 的 `getItemDataById` 与批次 8 的披风 ID 段。

##### 本组产物

| 文件 | 改动 |
|---|---|
| `ScrollHandler.java` | +1 条 i18n 提示 |
| `ItemConstants.java` | +`isShield` |
| `MakerProcessor.java` | `isShield` 并入 `isWeapon`；10 处文案转 i18n |
| `ItemInformationProvider.java` | `canUseCleanSlate` 加 `use_lk_clean_slate` 分支；白医自增挡 byte 溢出 |
| `V1000.0.11__insert_game_config_clean_slate.sql` | 1 个键 + zh/en 两条 `lang_resources` |
| `message_{zh_CN,en_US}.properties` | +11 键 × 2 |

无新增指令。`MakerItemFactory.java` 未改。

#### G6 — 怪物技能 / 反应堆 ✅ 已完成（java 侧）

三个 java 文件里两个是 `already-fixed`，只有一个真要动。**这组真正的东西在 wz 里，
按决定 img.xml 类文件统一推到最后处理，本节只结 java。**

##### 逐条判定

| # | 项 | 判定 | 依据 |
|---|---|---|---|
| 1 | `MobSkill` case 157 → `SEAL_SKILL` | ⬜ already-fixed | 见下 |
| 2 | `MapleReactor` 结束态判定 | ⬜ already-fixed | 见下 |
| 3 | `MobDamageMobHandler` 的 `buffAmplifier` | ✅ ported（**参数化，默认 1.5**） | 见下 |
| 4 | `MobDamageMobFriendlyHandler` | ⬜ noise | 删 javadoc 一个空 `*` 行 |
| 5 | `MobSkillFactory` | ⬜ noise | 多加一个空行 |
| 6 | `wz/Skill.wz/MobSkill.img.xml` | ⏸ 留 pending | 见「wz 侧的发现」，本批不动 |

##### 项 1 — 157 已在，且 BeiDou 走得更远

Cosmic 把 `MobSkill` 的 `int` switch 整体重构成了 `MobSkillType` 枚举：

- [MobSkillType.java:46](../gms-server/src/main/java/org/gms/server/life/MobSkillType.java#L46) `SEAL_SKILL(157),`
- [MobSkill.java:253](../gms-server/src/main/java/org/gms/server/life/MobSkill.java#L253) `case SEAL_SKILL -> stats.put(MonsterStatus.SEAL_SKILL, x);`

LK 只是把状态塞进 map，BeiDou 还接了消费方——
[Monster.java:1498](../gms-server/src/main/java/org/gms/server/life/Monster.java#L1498) 的
`isBuffed(MonsterStatus.SEAL_SKILL)` 真的会拦下怪物放技能，
[AbstractPlayerInteraction.java:1287](../gms-server/src/main/java/org/gms/scripting/AbstractPlayerInteraction.java#L1287)
还开放给脚本。

##### 项 2 — 逐字符相同

LK 的 `byte nextState = …; boolean isInEndState = nextState < this.state;` 在
[Reactor.java:412-415](../gms-server/src/main/java/org/gms/server/maps/Reactor.java#L412) 已有，
连变量名都一样。上游同源，不是 LK 独有。

##### 项 3 — 两边各修了一半的同一个 BUG

唯一触发路径是 **`Corsair.HYPNOTIZE`**——
[StatEffect.java:761](../gms-server/src/main/java/org/gms/server/StatEffect.java#L761)
是全仓库唯一写 `MonsterStatus.INERTMOB` 的地方。被控制的怪打其他怪时，客户端把伤害报上来，
服务端用 `calcMaxDamage` 估一个上限做反外挂钳位。那套估算式是 OdinMS 留下的，**估低了**。

| | 误封禁 | 合法伤害被砍 | 日志刷屏 |
|---|---|---|---|
| BeiDou 引入本改动前 | ✅ 已止（注释掉 `AutobanFactory.DAMAGE_HACK.alert`） | ❌ 仍砍到 1.0× 天花板 | ❌ 每次命中一条 `warn` |
| LK | ✅ 已止（天花板 ×2.5） | ✅ 大部分不再砍 | — |

BeiDou 侧原有注释已经写明了怀疑的原因（`StatEffect` 里 `damage` 缺省取 100，客户端可能也算上了），
但只处理了封禁，没处理钳位——**海盗的心灵控制伤害一直被服务端悄悄砍过**。

LK 的 `2.5` 没有任何推导，是调到不报警为止的魔数，而且抬天花板有安全代价：这个钳位本身就是
反外挂，天花板抬多少倍，改包能打的上限就抬多少倍。所以做成配置
`mob_damage_mob_max_damage_rate`（`V1000.0.12`），**默认 1.5 取中**，配 `1.0` 恢复严格钳位。

命名刻意避开 `multiplier`/`倍率`：它**不提高实际伤害**，伤害数值始终来自客户端包，
它只抬「服务端愿意接受的上限」。叫倍率会误导运营。

> 遗留未处理：那条 `log.warn` 是每次命中都打。系数调到 1.5 后大部分不再触发，
> 但真遇到改包会刷屏。降级或限频属 BeiDou 侧清理，不是移植，另记。

##### wz 侧的发现（本批不动，留给 wz 批次）

`wz/Skill.wz/MobSkill.img.xml` 的 `git diff --stat` 是 `1 insertion, 14613 deletions`，
**看着像删文件，其实是把整个 XML 压成了一行**。去掉全部空白后对比：

```
LK base     373501 字节
BeiDou 当前 373501 字节   ← 与 LK base 完全一致
LK head     373702 字节   ← 多出的 201 字节 = 两处真改动
```

两处都在 **skill 200（召唤）** 下面：

**A｜level 88 的召唤列表 `3110302/5110301` → `9300167/9300168`。倾向否。**
消费方是 `Mob.wz/8220002`（时钟塔怪人 Papulatus）。
但 `9300167`/`9300168` **在两个仓库里都不存在**——逐个数过 mob id 邻域，
LK 与 BeiDou 的 `Mob.wz` 都是 `9300160..9300166` + `9300169..9300179`，**缺口完全一样**。
它们只在 `String.wz` 里有名字（后期版本残留的字符串表）。LK 是从新版客户端抄了数据没抄本体，
搬过来只会让 Papulatus 召唤不存在的怪。

**B｜新增 level 187（召唤 `9600026` ×3，hp 85，limit 3）。倾向搬。**
消费方是 `Mob.wz/9600025` = **妖僧**，召唤 `9600026` = **妖僧分身**，两只 BeiDou 都有
（`Map7/702060000` 里刷），`YaoSengPQ.js` 批次 5 查证过是活脚本。
而 BeiDou 现在 `9600025` 指向 **level 81**——那一档召唤 `6230401` ×5、limit 20，
一个跟妖僧毫无关系的通用档位。**妖僧现在召唤的是错的怪**，这是真内容缺陷。

要生效必须连带把 `Mob.wz/9600025.img.xml` 的 `level 81 → 187` 一起改，而那个文件里
LK 还夹着另一套平衡改动，与 BeiDou 已有的调整互相竞争：

| | BeiDou 现状 | LK |
|---|---|---|
| `maxHP` | 80,000,000 | 100,000,000 |
| `exp` | 24,000,000 | 16,000,000 |
| `skill 200 level` | 81 | **187** |
| `elemAttr` | 无 | `I3`（冰抗） |

HP/exp 是两套口味不是修复，届时建议**只改 `level 81 → 187` 一处**，其余不动。

##### 清单影响

`MobDamageMobHandler.java` 判 `ported`，`MobSkill.java` / `MapleReactor.java` 判 `already-fixed`。
`wz/Skill.wz/MobSkill.img.xml`、`wz/Mob.wz/9600025.img.xml`、`wz/Mob.wz/9600026.img.xml`
**仍是 `pending`**，结论已记在上面，wz 批次直接取用。

##### 本组产物

| 文件 | 改动 |
|---|---|
| `MobDamageMobHandler.java` | `calcMaxDamage` 的两条公式前乘 `mob_damage_mob_max_damage_rate` |
| `V1000.0.12__insert_game_config_mob_damage_mob.sql` | 1 个键 + zh/en 两条 `lang_resources` |

无新增指令、无 i18n 变动。

#### G9 — 技能平衡 ✅ 已完成

7 个文件、12 个实质子项：**8 项写了代码，2 项 already-fixed，2 项 rejected。**

##### ⭐ 本批唯一「LK 比 BeiDou 对」的地方：船长的英雄意志

盘点阶段第 3 条的预判，读全链路后证实成立：

| 位置 | 现状 | 后果 |
|---|---|---|
| [StatEffect.java:672](../gms-server/src/main/java/org/gms/server/StatEffect.java#L672) `SPEED_INFUSION` case 组 | 已经没有 Corsair | ✅ Cosmic 改名时修对了一半 |
| [:1707](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1707) `isHerosWill()` | **漏了** Corsair | ❌ `isCureAllAbnormalStatus()` 返回 false → [:955](../gms-server/src/main/java/org/gms/server/StatEffect.java#L955) 不解除异常状态。**船长的英雄意志实际是个空技能** |
| [:1750](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1750) `isInfusion()` | **还列着** `Corsair.HEROS_WILL` | 语义错误（statups 为空所以暂未致害） |

两处都已修正。LK 的写法是把旧 case 注释掉留在原地，这里直接删并写明原因，不留死代码。
**正向副作用**：修完后 `use_fast_reuse_hero_will` 开始对船长生效，之前一直漏。

##### 三处额外防击退（STANCE）—— 落成配置

LK 给三个技能塞了 `BuffStat.STANCE`，全部落成 Integer 配置，**0 = 不附加、恢复原版**：

| 键 | 默认 | 说明 |
|---|---|---|
| `battleship_stance` | 30 | **经查不是死代码。** [:1376](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1376) `localstatups = statups` 专为战舰把被 [:1328](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1328) 覆盖掉的 statups 还原回来，STANCE 能发到客户端 |
| `mana_reflection_stance` | 30 | 直加 |
| `marksman_blind_stance` | 100 | **100 = 黑暗期间完全免击退**，三条里最猛。配套 `isExtraStance()` 广播一次 `Hero.STANCE` 特效（客户端对这个防击退没有自己的表现） |

##### 逐项处置

| 文件 | 处置 | 要点 |
|---|---|---|
| `constants/skills/Corsair` | **already-fixed** | `HEROS_WILL` 重命名 BeiDou 已有，其余是 javadoc 空行 |
| `MapleStatEffect` | **ported** | 见上两节；`USE_ULTRA_RECOVERY` 条件对调是纯短路顺序，噪声不搬 |
| `AranComboHandler` | **ported** | 3 秒窗口 → `aran_combo_last_time`（默认 3 = 原值）；GM 加成 → `aran_combo_gm_bonus`（默认 5）；**满连后续期**——原实现 100 连以上不再命中任何 case，buff 只能等自然过期 |
| `SpecialMoveHandler` | **ported** | GM 免冷却 → `use_gm_no_skill_cooldown`（默认 true，LK 没给开关，是我加的）；快速重用除数 → `fast_reuse_hero_will_divisor`，**默认 60 保持 BeiDou 现状**（LK 是 10，更保守，不覆盖） |
| `gm2/BuffMapCommand` | **ported** | 补加速灌注 + 枫叶勇士 |
| `gm2/EmpowerMeCommand` | **ported** | 补力量（`Hero.STANCE`） |
| `AssignAPProcessor` | **rejected** | 见下 |

LK 三处 buff 用的都是裸数字（`15111005` / `1121000` / `1121002`），按规则 1 改用
`ThunderBreaker.SPEED_INFUSION` / `Hero.MAPLE_WARRIOR` / `Hero.STANCE` 常量。

##### 战舰血量：唯一默认跟 LK 的一项

[`Character.resetBattleshipHp`](../gms-server/src/main/java/org/gms/client/Character.java#L7285) 原为
`400 * 技能等级 + (超120等级 * 200)`。LK 把 `400` **硬编码成 3000**（7.5×）却只把 `200` 参数化，很不一致；
这里两个都参数化：`battleship_hp_per_skill_level`（默认 **3000**，按用户决定跟 LK；调回 400 即原版）、
`battleship_hp_per_level`（默认 **200** = 原值）。

##### `AssignAPProcessor` 为什么 rejected —— 顺带查出 BeiDou 两个问题

LK 实质改动只有 3 行：升级 HP 随机区间 +2（飞侠/弓箭手 `rand(14,18)→rand(16,20)`、海盗 `rand(16,20)→rand(18,22)`）。
纯数值口味，而且**照搬会失效甚至反向**——BeiDou 重写过 `calcHpChange`，两处结构性差异：

1. **随机分支被反了。** 上游是「升级→随机，洗点→固定」；BeiDou
   [:860](../gms-server/src/main/java/org/gms/client/processor/stat/AssignAPProcessor.java#L860) 写的是
   `useRandomizeHpmpGain && usedAPReset`，**升级永远走固定值，只有洗点卷才随机**。
   把 LK 的数字抄进 `randomMin/Max` 影响的是洗点，不是 LK 想要的升级。
2. **洗点 HP 疑似双算。** [:856](../gms-server/src/main/java/org/gms/client/processor/stat/AssignAPProcessor.java#L856)
   在 `usedAPReset` 时 `MaxHP += resetValue`，[:865](../gms-server/src/main/java/org/gms/client/processor/stat/AssignAPProcessor.java#L865)
   又 `MaxHP += usedAPReset ? resetValue : baseValue`——战士洗点 20+20=40，上游是 20。
   **同文件 `calcMpChange` 没有这个额外分支**（[:941-963](../gms-server/src/main/java/org/gms/client/processor/stat/AssignAPProcessor.java#L941)），
   HP/MP 不对称，倾向判 BUG 而非「洗血卷轴额外加成」的设计。

> 两条都是 BeiDou 自身的事，**不在移植范围，本次只记录不动手**（用户已决定）。
> 第 2 条一旦修改会直接改变玩家已有的洗点收益，动手前需单独评估。
>
> 同文件 [:714/:747](../gms-server/src/main/java/org/gms/client/processor/stat/AssignAPProcessor.java#L714)
> 有 `"无法重新分配AP"`、`"[重置卷轴] 最大HP +"` 等硬编码中文，违反规则 2，同为 BeiDou 存量，一并记录。

##### 顺手补的 i18n 缺口

LK 把时空门提示改成硬编码中文（且原文有错别字「再斜坡」），**照搬违反规则 2 → rejected**。
但这暴露 BeiDou 侧 [StatEffect.java:1082/1084/1086](../gms-server/src/main/java/org/gms/server/StatEffect.java#L1082)
三条时空门提示全是硬编码英文，已改为 `StatEffect.message1~3`（中英各 3 条）。

##### 本组产物

| 文件 | 改动 |
|---|---|
| `StatEffect.java` | 英雄意志两处修正、三处 STANCE + `addExtraStance()`/`isExtraStance()`、时空门 i18n |
| `AranComboHandler.java` | 断连窗口配置化、GM 加成、满连续期、`Short.MAX_VALUE` 钳位 |
| `SpecialMoveHandler.java` | GM 免冷却、快速重用除数配置化（`Math.max(1,..)` 兜除零） |
| `BuffMapCommand.java` / `EmpowerMeCommand.java` | 各补 buff，改用技能常量 |
| `Character.java` | `resetBattleshipHp` 两个系数配置化 |
| `V1000.0.13__insert_game_config_skill_balance.sql` | 9 个键 + zh/en 各 9 条 `lang_resources` |
| `message_{zh_CN,en_US}.properties` | `StatEffect.message1~3` |

LK 没有、BeiDou 侧主动加的两处保险（LK 均无）：`AranComboHandler` 的 `short` 溢出钳位
（满连后 combo 不再清零，长时间连击会绕成负数）、`SpecialMoveHandler` 的除零兜底。

无新增指令（两个 GM 指令 BeiDou 已在 `command_info` 中注册）。

#### G7 — 远征次数配额 ✅ 已完成

4 个文件。LK 侧 55 行实质改动，**查出 BeiDou 三个真 BUG**，其中两个 LK 自己也没修对。

> **贯穿全组的前提。** `use_enable_daily_expeditions` 在 BeiDou **默认 `false`**
> （[V1.7.0:90](../gms-server/src/main/resources/db/migration/V1.7.0__create_game_config.sql#L90)），
> `attemptBoss` 一进门就 `return true`。下面三个 BUG **只在运营把次数限制打开后才咬人**——
> 但一旦打开就是三个一起咬。

##### 统一 `addMember` / `addMemberInt` 的判定（**不是**当时以为的活 BUG）

> ⚠️ **复查更正。** 本节初稿断言「`addMemberInt` 缺配额检查 = 配额可绕过，是活的真 BUG」，
> **该结论不成立**，已按事实改写。原判断只看了「谁调用 `addMemberInt`」，没有回查那个调用点用的远征类型。

事实是：

| 方法 | `attemptBoss` 检查 | 调用者 | 实际影响 |
|---|---|---|---|
| `addMember` | ✅ 本来就有 | 7 个 BOSS NPC 脚本（`1061014`、`2030013`、`2083004`、`2141001`、`9120201`、`9201113`、`9270047`） | 配额一直在生效 |
| `addMemberInt` | ❌ 缺 | 仅 `scripts/npc/2101014.js`（ARIANT / ARIANT1 / ARIANT2） | **ARIANT 系列没有 `BossLogEntry`，`attemptBoss` 恒放行**，缺不缺检查都一样 |

所以合并前**没有可利用的绕过口子**。这次重构的价值是**消除两个入口的判定分歧**，
避免以后哪个 BOSS 脚本改用 `addMemberInt` 时静默失去配额——是预防性收敛，不是修复。

做法：检查搬进 `addMemberInt`（新返回码 4），`addMember` 改为委托 + 返回码映射。
不搬 LK 的硬编码中文（BeiDou 早已全套 i18n），也不留 LK 那段注释掉的旧实现。

> `2101014.js:169` 对未知返回码兜底显示 "Error."，新增的码 4 会落进去 —— 当前不可达
> （ARIANT 无配额条目）。**批次 7 给 BOSS 脚本接配额时必须处理这个返回码。**

> 合并后 `addMember` 的成功播报统一走 `Expedition.addMemberInt.message1`，
> `Expedition.addMember.message5` 成为孤儿键，保留未删（两条文案几乎一样）。

##### BUG 2：`Calendar.HOUR` 是 12 小时制 → 每日榜清空点算成中午

`HOUR` 是 hour-of-am/pm（0–11）且**不动 `AM_PM`**。下午重启服务器时
`now.set(Calendar.HOUR, 0)` 得到的是**当天中午 12:00**，随后
`DELETE ... WHERE attempttime <= 中午` 把**当天上午的挑战记录删掉** → 玩家白嫖一次配额。

LK 改成 `HOUR, 12` 并注释 "12 am at midnight" —— `HOUR` 上限 11，宽松模式下 12 会跨 AM/PM 进位，
**结果依然取决于重启时刻**。不搬 LK 写法，两处一律改用 `HOUR_OF_DAY`（并补 `MILLISECOND` 清零）。

##### BUG 3：周榜在周日–周三启动时被整表清空

`set(DAY_OF_WEEK, THURSDAY)` 只在**本周内**移动，周日–周三指向**未来**的周四：

```
deltaTime = now - 未来周四   → 负（最多 -4 天）
+= 12h; %= 7d               → Java 的 % 对负数仍为负，值不变
-= 12h                      → 更负
if (deltaTime < 12h)        → 恒真
    → DELETE WHERE attempttime <= 未来时间   ← 删光整张周榜
```

**周日到周三，每次启动服务器都会清空周榜。** LK 的 `Math.abs(...)` 碰巧盖住症状但治标。
改为**回退到最近一个已过去的周四**，`deltaTime` 恒在 `[0, 7天)`，
原来那套 `+12h / %7d / -12h` 的绕法随之取消，直接比较。

##### 逐项处置

| 文件 | 处置 | 要点 |
|---|---|---|
| `MapleExpedition` | **ported** | BUG 1；`EXPEDITION_BOSSES` 补克雷塞尔双眼（`MobId` 新增两个常量） |
| `MapleExpeditionBossLog` | **ported** | BUG 2/3；新增 4 个条目；`PINKBEAN`/`SCARGA` 次数 1→2；新增字符串重载 |
| `MapleExpeditionType` | **ported** | 新增 `KREXEL`/`YAOSENG`；`getPartInfo()` 走 i18n。**minSize 大改 rejected** |
| `MaplePartyCharacter` | **ported** | `attemptBoss(String)`，供批次 7 的 `PapulatusBattle.js` |

**新增 4 个 `BossLogEntry` 为什么是功能而非调参**：没有条目时 `getBossEntryByName` 返回 `null`，
`attemptBoss` 直接放行 —— 炎魔（普通）、克雷塞尔、将军墨西、藏经阁此前**完全不受次数限制**。

**`ExpeditionType` 的 minSize 为什么 rejected**：LK 把 `BALROG_NORMAL` 6→1、`ZAKUM`/`HORNTAIL`/`SCARGA`
6→2、`SHOWA` 3→2、`PINKBEAN` 6→3，纯运营调参；BeiDou 已有
[`use_enable_solo_expeditions`](../gms-server/src/main/java/org/gms/server/expeditions/ExpeditionType.java#L61)
一开就把 minSize 压成 1，是同一件事的更彻底做法。要调门槛改 `game_config`，不改枚举。
LK 顺手重排的枚举顺序也不搬 —— 改 `ordinal()` 没必要冒险。

##### 本组产物

| 文件 | 改动 |
|---|---|
| `Expedition.java` | `addMemberInt` 补配额检查、`addMember` 改委托、`EXPEDITION_BOSSES` +2 |
| `ExpeditionBossLog.java` | 4 个新条目、两处次数调整、周/日清空点修正、字符串重载 |
| `ExpeditionType.java` | `KREXEL`/`YAOSENG` 两个枚举、`getPartInfo()` |
| `PartyCharacter.java` | `attemptBoss(String)` |
| `MobId.java` | `KREXEL_LEFT_EYE` / `KREXEL_RIGHT_EYE` |
| `message_{zh_CN,en_US}.properties` | `ExpeditionType.partInfo.size/level/time` |

无新增配置键、无新增指令、无迁移脚本。

##### 留给批次 7 的线索

1. BeiDou 现版 [`scripts/event/PapulatusBattle.js:99`](../gms-server/scripts/event/PapulatusBattle.js)
   **没有 `attemptBoss` 判断**——时空的裂缝同样在绕过配额。API 已在本组补齐，脚本改动归批次 7。
2. **`PartyCharacter.attemptBoss` 固定 `log = true`，是「查即扣」。** LK 的 `PapulatusBattle.js`
   在构造 eligible 列表时逐个成员调用它，之后才校验队长在场、人数、前置任务；整队最终进不去时，
   前面查过的成员**已经被扣掉一次**且不回滚。接这个脚本时要么拆出不记账的 `canAttemptBoss`、
   等整队确认后再统一登记，要么接受这个损耗。**当前无调用者，不构成活缺陷**，故本组只留 API 不改语义。

#### G7/G9 复查修正

两组提交完成后做了一轮交叉复查，**11 条成立**，其中 1 条推翻了本文档自己的结论（见上文 ⚠️）。

| # | 问题 | 处置 |
|---|---|---|
| 1 | **战神满连续期绕过技能等级**：`combo > 100` 分支无条件 `getEffect(10)`，只学 1 级连击无双的战神在第 101 连也拿满级 buff | 重构为「跨十位档」判定，档位取 `min(skillLevel, 10)`，初心者（2000）例外 |
| 2 | **GM 加成跳过增益阈值**：默认每次 +6，序列 `6,12,18,24,30…`，`switch` 只认恰好等于 10 的倍数，10/20 档整个跳过 | 同上，改判「本次是否跨进新的十位档」而非「是否恰好等于」 |
| 3 | **满连后每刀重登 buff**：`applyComboBuff` 服务端过期时间是 `Long.MAX_VALUE`，每刀一个 `giveBuff` 包 + 一次三锁 `registerEffect`，落在攻击热路径上 | 改为每 10 连续期一次，成本降一个数量级；客户端图标 99999ms 足够覆盖 |
| 4 | **「GM 免冷却」反而引入约 1.5 秒隐形锁**：`addCooldown(.., 0)` 仍写进 `coolDowns`，而 `skillIsCooling` 只看键在不在，到期条目要等每 1500ms 一轮的清理任务 | GM 分支只发 `skillCooldown(skillid, 0)` 包，不再调 `addCooldown` |
| 5 | **免冷却开关只覆盖 `SpecialMoveHandler`**：攻击技能的冷却由 `CloseRange`/`Magic`/`RangedAttack` 三个 handler 各自登记 | **本次只把配置描述收窄到实际覆盖范围**（不再宣称「所有技能」）。三个伤害 handler 是 **G8** 的文件，扩大覆盖面留给 G8 一并处理，避免与该组撞车 |
| 6 | **STANCE 热更新后效果与表现不一致**：`statups` 在技能加载时固化进 `SkillFactory` 缓存，而 `isExtraStance()` 每次施放读实时配置 → 0→100 时「有特效无防击退」，反向则「有防击退无特效」 | `isExtraStance()` 改为检查 `statups` 里有没有 `STANCE`，与 `isWkCharge()` 同一套路，两边同源 |
| 7 | **新增 4 个 BOSS 类型写不进库**：`bosslog_daily/weekly.bosstype` 是 `ENUM('ZAKUM','HORNTAIL','PINKBEAN','SCARGA','PAPULATUS')`（[V1.0.3](../gms-server/src/main/resources/db/migration/V1.0.3__create_bosslog.sql)）。新名字严格模式下 INSERT 报错、非严格模式写成空串，而 `insertPlayerEntry` 吞掉 `SQLException` 后 `attemptBoss` 仍返回 `true` —— **比不加更糟，因为不报错** | 新增 `V1000.0.14`，两张表 `bosstype` 改 `VARCHAR(32)` |
| 8 | **错过 12 小时窗口则整周不重置**：周三停服、周五启动时 `deltaTime > 12h`，周榜跳过，之后每日任务也都不满足，上周记录卡到下周四 | 去掉窗口。`DELETE` 已按 `attempttime <= 最近一个已过去的周四` 限定，幂等安全，每次直接执行 |
| 9 | **配置缺失时 `getServerInt` 返回 `0`**（[GameConfig.java:322](../gms-server/src/main/java/org/gms/config/GameConfig.java#L322)，`getServerDouble` 同理返回 `0D`）。迁移没跑时：`aran_combo_last_time`=0 → 连击每刀清零彻底失效；`battleship_hp_*`=0 → **战舰 0 耐久一召即碎**；`mob_damage_mob_max_damage_rate`（G6）=0 → 心灵控制伤害全被钳成 0 | 这三处补「非正数退回迁移默认值」。0 属合法取值的键（三个 stance、`aran_combo_gm_bonus`）不动 |
| 10 | **`PacketCreator` 里 Corsair 误分类还剩两处**：`givePirateBuff` / `giveForeignPirateBuff` 的 `buffid == Corsair.HEROS_WILL` 与本次修复口径相反 | 一并删除 |
| 11 | **`getPartInfo()` 把报名时限标成「时间限制」**：传入的是 `registrationMinutes`（报名窗口，所有枚举都是 5 分钟），不是 BOSS 战时限，接入 NPC 后会误导玩家 | 文案改为「报名时限」/「Registration window」 |

顺带补了 `SpecialMoveHandler` 里一条漏网的硬编码英文时空门提示 → `StatEffect.message4`。

> **第 9 条是全套移植的系统性风险，不止这几个键。** `db/lkport/` 下 14 份迁移**至今一次都没在
> 任何环境执行过**（本机无 MySQL）。凡是「0 会造成灾难」的新配置键，都应在读取处补默认值兜底，
> 后续批次沿用这条。

#### G8 — 反外挂 / 误封 ✅ 已完成

7 个文件。**本组以 reject 为主**——BeiDou 的反外挂系统比 LK（2022 年 HeavenMS 原版）成熟一个代际：
`AutobanFactory` 数据库配置驱动（`AutobanConfigDO`、每类可单独禁用、`ignoredChrIds` 白名单、i18n 名称），
`AutobanManager.addPoint` 到阈值即调 `chr.autoBan()`。

##### 最大的一条 reject：LK 的即时封禁 + 封 IP + 封 MAC

LK 新增 `AutobanManager.ban(String)`：封号 + 写 `ipbans` 表 + `banMacs()` + 60 秒后断线，
由 `damage > maxWithCrit * 30` 单个包触发。**IP/MAC 部分不搬**，理由：

1. **IP 不等于身份。** CGNAT、校园网、宿舍、网吧、公司出口，一个公网 IP 后面常是几百上千真人。
   封一个作弊者等于把整栋楼锁在门外且他们无从得知原因；而作弊者切热点/VPN/重拨十秒换一个。
   **代价全在无辜者，成本几乎不在目标。**
2. **MAC 是客户端上报的。** v83 登录包携带 MAC 列表，是攻击者完全可控的数据；能改伤害包的人改 MAC
   是顺手的事。而共用电脑、网吧同批机器、装了虚拟网卡的正常玩家反而被封。
3. **触发判据本身不可靠。** 判据分母 `maxWithCrit` 来自服务端估算式，本移植**已两次确认它偏低**
   （G6 的 `mob_damage_mob_max_damage_rate`、本组的 `summon_max_damage_rate`）。
   从「估算可能不准」跳到「永久封掉一整栋楼」，风险比例不对。
4. **LK 实现本身有缺陷**：`ip.matches("/[0-9]{1,3}\\..*")` 依赖 `InetSocketAddress.toString()` 的前导斜杠
   （BeiDou 取址方式不同，大概率永不匹配）；`Connection`/`PreparedStatement` 无 try-with-resources，
   异常路径泄漏连接。

**保留了 LK 的 30 倍阈值**，但改走 BeiDou 现有的账号封禁链路（可逆、有 GM 广播、有日志、有
`isGM`/`isBanned` 前置），并做成可调：`damage_hack_severe_ratio`(30) + `damage_hack_severe_points`(15)。
默认 15 = `DAMAGE_HACK` 阈值，即单次触发就封；想要「三振出局」调成 5，想纯观察调成 1。
为此给 `AutobanManager.addPoint` / `AutobanFactory.addPoint` 加了 `weight` 重载。

> BeiDou 本身有 IP 封禁能力（`ServerFilter` 会校验），那是**人工决策**的工具——
> 不该由一条启发式规则自动扣扳机。

##### 第二条 reject：FAST_ATTACK 检测

LK 把上游注释掉的「共用 spam 槽位 8 + 固定 300ms 阈值」放回 `CloseRange` / `Magic`。
BeiDou 有 [`detectionAttackInterval`](../gms-server/src/main/java/org/gms/net/server/channel/handlers/AbstractDealDamageHandler.java#L1339)：
**per-skill 滑动窗口 + 变异系数分析**，带持续施法技能跳过集（暴风箭雨等）、网络抖动透明跳过、
稳定高速计分 / 突发仅告警的分级，配独立的 `ATTACK_INTERVAL` 积分类型。
LK 那版**连暴风箭雨都会误报**。整段 rejected，连带 `public static int rangeFastAttackInterval` 那两个
可变公有静态字段（BeiDou 走 `GameConfig`）。

##### 第三条 reject：`MONSTER_VAC` 吸怪检测

`checkForVac(Point)` 的逻辑是「最近 3 次怪物死亡坐标完全相同就告警」。
固定刷新点的怪、不移动的怪、反复击杀 BOSS，坐标本来就一样 —— **误报率极高**。
只 `alert` 不计分，代价是刷 GM 屏而非封号，但 BeiDou 已有更成熟的手段；
且调用点在 `MapleMap.java`（跨组钩子文件）。

##### 写了什么

| 项 | 处置 | 说明 |
|---|---|---|
| `Bandit.STEAL` 加 `!monster.isBoss()` | **真 BUG，ported** | BeiDou [:371](../gms-server/src/main/java/org/gms/net/server/channel/handlers/AbstractDealDamageHandler.java#L371) 无任何 BOSS 保护，全仓库也没别处兜——可以从扎昆、闪光兽身上偷道具 |
| `Shadower.ASSASSINATE` 距离容差 | ported | 并入 +40000 组，减少 `DISTANCE_HACK` 误报 |
| `Hero.BRANDISH` 组距离容差 | ported（**改动 LK 数值**） | 40000 → **120000**。LK 给 200000，用户决定取 3 倍而非 5 倍——放宽容差会相应削弱位移检测 |
| 伤害检测三档阈值 | ported（配置化） | LK 把告警放到 5 倍并**注释掉计分那段**，净效果是伤害外挂永不计分，不采纳。配置化后想要 LK 口径改值即可 |
| GM 豁免 | ported | `addPoint` 本就跳过 GM，只有 `alert` 会对 GM 触发，GM 用 `@maxstats` 测伤害会刷屏。加在调用点而非改 `alert()` 本身，以免顺手静音其他告警类型 |
| `Marksman.SNIPE` 固定伤害 | ported（配置化） | 默认 **195000 = 原值**（LK 直接三倍），`hitDmgMax` 由它 +5000 推出保持联动 |
| 召唤兽伤害上限 ×1.5 | ported | 与 G6 同源同值 |
| 战神连击技能改「消耗」 | ported | `setCombo(0)` → `setCombo(combo - 30/-100/-200)`，剩余连击继续累积。**是对战神的实质增强**，与 G9 的满连续期配合更明显 |
| autoban 日志补 `characterId`/`accountId` | ported | 角色可以改名，事后追查只有名字对不上 |
| `setLastAttack` | **already-fixed** | 批次 5 已加 |

##### 本组产物

| 文件 | 改动 |
|---|---|
| `AbstractDealDamageHandler.java` | 两处距离容差、STEAL 的 BOSS 保护、伤害三档配置化 + GM 豁免、SNIPE 配置化、`configuredRatio` 兜底helper |
| `AutobanManager.java` / `AutobanFactory.java` | `addPoint` 的 `weight` 重载、日志补 id |
| `RangedAttackHandler.java` | 连击消耗而非清零 |
| `SummonDamageHandler.java` | 伤害上限系数 |
| `V1000.0.15__insert_game_config_anticheat.sql` | 6 个键 + zh/en 各 6 条 `lang_resources` |

无新增指令、无 i18n 变动。所有新键的读取处都按上一轮复查的教训做了「非正数回落默认值」——
这些键**为 0 会让判定退化成「任何伤害都超标」，那就是全服误封**。

> 顺带结清 G9 复查留下的一条：`use_gm_no_skill_cooldown` 是否扩大到三个伤害 handler。
> 结论**不扩大** —— 这三处登记的是攻击技能自身的冷却，属技能机制而非防作弊，
> 让 GM 绕过它会使 GM 测出来的手感完全不代表玩家。配置描述已在上一轮收窄到实际范围，就此定案。

#### G10 — 等级上限 ✅ 已完成

##### 关键：上限在**两处**硬编码，LK 只改了一个

| 位置 | 代码 | 何时生效 |
|---|---|---|
| [`GameConstants.getJobMaxLevel`](../gms-server/src/main/java/org/gms/constants/game/GameConstants.java#L488) | `(job.getId()/1000 == 1) ? 120 : 200` | 仅当 `use_enforce_job_level_range` **打开** |
| [`Character.getMaxClassLevel`](../gms-server/src/main/java/org/gms/client/Character.java#L4930) | `isCygnus() ? 120 : 200` | **默认路径** |

`use_enforce_job_level_range` 默认 `false`（[V1.7.0:68](../gms-server/src/main/resources/db/migration/V1.7.0__create_game_config.sql#L68)），
`getMaxLevel()` 直接返回 `getMaxClassLevel()`。**只照搬 LK 改的那处，配置在默认设置下一行都不会生效。**
两处已统一到 `GameConstants.getMaxLevel()` / `getCygnusMaxLevel()`。

配置：`max_level_cap` = **200**（原值）、`cygnus_max_level_cap` = **155**（原版 120，运营决定）。

> ⚠️ v83 客户端是按骑士团 120 上限设计的，超过之后经验表、称号、部分 UI 的表现未经验证，
> 上服前应在测试环境确认。

##### `WORLD_NAMES[0]` → 配置化

LK 把 `"Scania"` 直接改成 `"枫之大陆"`。这个字符串**随服务器列表发给客户端显示**
（`ServerlistRequestHandler`、`PacketCreator:5540`），硬编码中文违反规则 2，而且它是运营品牌信息。

新增 `GameConstants.getWorldName(int)`：优先读 `world.N.world_name` 配置，回落到 `WORLD_NAMES` 原值；
6 个显示/日志调用点换过去（`Server.java:701` 用的是 `.length`，不动）。默认值填 **`枫之大陆MapleLand`**。

> 走 `game_config` 的 `world` 段而不是 i18n —— 大区名是**这个大区的名字**，
> 不该随玩家语言变化。

##### `@goto` 目标表新增 13 项

逐个核过 wz 存在性，并改用 `MapId` 常量（LK 用的是裸数字）：

| | 条目 |
|---|---|
| `GOTO_TOWNS` | `barber`、`shanghai`(上海外滩)、`shaolin`(嵩山镇) |
| `GOTO_AREAS`（GM） | `zakum2`、`gs2`、`balrogboss`、`scarga`、`101`、`orbispq`、`mpqa`、`mpqz`、`cjg`(藏经阁七层)、`wugong` |
| **不加**（地图缺失） | `krex` 541020700、`ulu` 541020500、`ulu2` 541020200 —— `wz/` 与 `wz-zh-CN/` 里都没有，加了只会传送失败。`krex` 与 G7 的克雷塞尔缺图是同一件事 |

中文版特有的四张（`shanghai`/`shaolin`/`cjg`/`wugong`）只有 `wz-zh-CN` 有 String 条目，
**刷怪与任务脚本尚未移植（批次 7），现在传送过去基本是空地图**，代码里已注明。

##### `temple` 270000100 → 270000000 —— **rejected，LK 改错了**

查 `String.wz`：`270000100` = Temple of Time / 神殿入口（入口），
`270000000` = Three Doors / 三个门（内层房间）。`@goto temple` 该去入口，BeiDou 现值正确。

#### G11 — 自动喂药重复消耗 ✅ 已完成（**几乎整组 already-fixed**）

| LK 改动 | 处置 |
|---|---|
| `PetAutoPotHandler` 的 `setAutopotHpAlert(hp + 0.05f)` → `+0.1f` | **rejected（不适用）**。该机制 Cosmic 整个换掉了，BeiDou 的 handler 只剩 8 行纯转发 |
| `PetAutopotProcessor` 两行 `System.out.println` 注释掉 | **already-fixed**，BeiDou 早已没有 |
| `ItemConstants.isShield` | **already-fixed**，G5 已加 |
| `ItemConstants.isHair` 35000 → 70000 | **already-fixed**，BeiDou 用 `itemId/10000 ∈ {3,4,6}`，等价且更整齐 |
| `ItemConstants.isPotion` += `2002xxx` + `2050004` | ported |

**「重复消耗」本身 BeiDou 修得更好**：`PetAutopotProcessor` 用 `useInv.lockInventory()`
把「吃满就不要吃了」的判断放进锁内，注释写明「避免已排队的数据跳过限制」——是根治；
LK 的 `+0.1f` 是靠加宽迟滞带缓解，治标。

##### 订正一处归属

§7 原写 `isPotion` 的「消费方是宠物自动喂药，属 G11」，**查实不成立**：

- **LK 自己的 `isPotion` 零调用者**（`grep -rn "isPotion(" src/` 无结果），在 LK 那边就是死代码。
- BeiDou 只有 `isPotion` → `isConsumable` → [`RechargeCommand`](../gms-server/src/main/java/org/gms/client/command/commands/gm2/RechargeCommand.java#L54) 一条链路，
  **与宠物自动喂药无关**。实际效果仅限 `@recharge` 能对这些道具补满堆叠。

2002xxx 是敏捷/迅速/魔法/勇士药水、2050004 是万能药，按名字确实是 potion，扩展语义上更正确。

##### 本组产物（G10 + G11）

| 文件 | 改动 |
|---|---|
| `GameConstants.java` | 等级上限两个 getter、`getWorldName`、`@goto` 新增 13 项 |
| `Character.java` | `getMaxClassLevel` 取同一套配置 |
| `MapId.java` | 新增 13 个地图常量 |
| `Client.java` / `IpListCommand.java` / `ServerlistRequestHandler.java` / `Storage.java` / `PacketCreator.java` / `CharacterService.java` | 换用 `getWorldName` |
| `ItemConstants.java` | `isPotion` 扩展 |
| `V1000.0.16__insert_game_config_level_cap_and_world_name.sql` | 3 个键 + zh/en 各 3 条 `lang_resources` |

#### G10/G11 复查修正

交叉复查提了 6 条（含重叠），去重后 **4 条成立**，其中一条正打在 G10 自己的主题上。

| # | 问题 | 处置 |
|---|---|---|
| 1 | **等级上限还有第三处硬编码。** [`getJobMaxLevel`](../gms-server/src/main/java/org/gms/constants/game/GameConstants.java#L495) 的 `case 3: return 120;` —— 骑士团在 v83 的终点职业**就是三转**（DAWNWARRIOR3 = 1111，`getJobBranch` 算出 `2 + 1 = 3`），根本走不到已经配置化的 `default` 分支（那里是四转，1112 玩家拿不到）。于是 `use_enforce_job_level_range` 一开，骑士团上限从 155 退回硬编码 120，两条路径必然矛盾 | `case 3` 改为 `(job.getId()/1000 == 1) ? getCygnusMaxLevel() : 120`。冒险家三转的 120 是**四转门槛**（语义正确，保留），骑士团三转的 120 是**等级上限**（必须走配置） |
| 2 | **`getMaxLevel()` 没和全局上限取小 → 无限刷属性。** `max_level_cap` 调到低于某个转职门槛（如 100）时，三转角色 `getMaxLevel()` 仍是 120，[经验闸门](../gms-server/src/main/java/org/gms/client/Character.java#L2983) `level < getMaxLevel()` 放行；而 `levelUp()` 用 `getMaxClassLevel()` 钳在 100。结果每次攒够经验都再走一遍 `levelUp` —— **等级不动，却又发一轮 AP/SP/HP/MP** | 改为 `Math.min(getMaxClassLevel(), getJobMaxLevel(job))`。这个洞是本次改动引入的：原先两边都是硬编码 200，取不取 min 无所谓 |
| 3 | **等级配置没有协议上界。** 角色等级在 `PacketCreator` 三处以 `writeByte` 发出，配到 256 客户端会绕回 0 | 抽出 `clampLevelCap`，上界钳 `MAX_LEVEL_PROTOCOL_CAP = 255`，迁移脚本注释与配置说明都标了范围 |
| 4 | **中文大区名在英文客户端变问号。** [`ByteBufOutPacket.writeString`](../gms-server/src/main/java/org/gms/net/packet/ByteBufOutPacket.java#L79) 按账号语言选字符集，en-US 是 **US-ASCII**，`枫之大陆MapleLand` 会编成 `????MapleLand`，频道名同理 | `getWorldName` 增加 `toClientEncodable`：丢掉当前字符集编不出的字符而不是让它变问号。中文客户端看到全名，英文客户端看到 **`MapleLand`**；全被丢光则回落 `WORLD_NAMES` 原名 |

顺带把本次 diff 摸到的两条硬编码日志迁到 i18n（规则 2）：
`Client.removePartyPlayer.warn1`、`Storage.loadOrCreateFromDB.error1`。

##### 记录但未做

**en-US 部署下四张中文特有地图的 `@goto` 显示空名。** `wz/String.wz/Map.img.xml`（英文基础层）
没有 701000000 / 702000000 / 702070400 / 701010322 的条目，`MapFactory.loadPlaceName` 回退空串，
`@goto` 列表会渲染成 `'shanghai' - #b#k`。中文部署（本仓库默认）不受影响。
补英文名要动 `wz/String.wz`，**按既定约定 img.xml 类改动统一留到 wz 批次**，届时一并处理。

### 批次 7 — 数据类

1. `sql/db_drops.sql`、`db_LichKingMod.sql` 里的 `drop_data` 与 `shopitems` 调整 → 转成 Flyway 迁移
2. 约 262 个含代码改动的脚本（Top 60 见附录 F），重点是兑换/活动/远征/PQ
3. 41 个 BeiDou 缺失的非点装 wz（附录 D）
4. 276 个 LK 改过而 BeiDou 已有同名文件的非点装 wz —— 逐个 diff 判断改动是否已被覆盖
5. wz 改动按 CLAUDE.md 的 wz 补丁工作流同步到 BeiDou-Client

> **批次 7 在独立 worktree（分支 `port/lk-batch7`，基线 2daa01f5d）与批次 6 并行开发。**
> 迁移编号分段：批次 6 用 `V1000.0.x`，批次 7 用 `V1000.1.x`，避免抢号；
> 批次 7 收尾（批次 6 合并后）把 lkport 迁移压缩为单文件（用户 2026-08-16 要求，仅 lkport，不动上游 `db/migration/`）。

#### 第 2 项脚本组 · 全量分层（2026-08-17）

对当时剩余的 207 个 `pending` 脚本做了**全量**（非抽样）分层。判据可复现：把每一对增删行里
的字符串字面量与行注释抹掉、再抹掉空白后比较，若两侧完全相同即判为「纯译文」；
对剩下的，再看结构差异行是否只落在 PQ 的人数/等级/时限阈值常量上。

| 层 | 数量 | 处置 |
|---|---|---|
| 纯译文 | 44 | ❌ rejected —— 按 §4.1 的约定不搬译文 |
| PQ 阈值调参 | 23 | ❌ rejected —— 详见下表 |
| 怪物嘉年华等级 | 4 | ❌ rejected —— 用户 2026-08-17 决定不做 |
| 暗黑龙王计时器 | 1 | ✅ ported —— 实为 bug，见下 |
| 调参 + 其他混合 | 13 | 仍 pending，只取非调参部分 |
| 真功能改动 | 122 | 仍 pending（结构差异 ≥5 行的 62 个是主体） |

**PQ 阈值那 23 个不是「不搬」，是「BeiDou 已有更好实现」。** LK 把 `minPlayers` 改 1、
`maxLevel` 由 255 改 200，都是写死；BeiDou 把这两个量做成了运营可热切的开关，
`scripts-zh-CN/event/*.js` 里统一带这段：

```js
const GameConfig = Java.type('org.gms.config.GameConfig');
minPlayers = GameConfig.getServerBoolean("use_enable_solo_expeditions") ? 1 : minPlayers;
if (GameConfig.getServerBoolean("use_enable_party_level_limit_lift")) {
    minLevel = 1, maxLevel = 999;
}
```

（配置项见 `V1.8.3`，`V1.8.5` 把 `use_enable_party_level_limit_lift` 默认值改为 false。）

其中 3 个 LK 改的是**中间值**，上述开关覆盖不到（开=1/999，关=原版），仍判 rejected
但理由是口味而非已实现——真要这个手感应新增 GameConfig 项，而不是改脚本常量：

| 脚本 | LK 改动 | BeiDou 现状 |
|---|---|---|
| `event/HorntailPQ.js` | minPlayers 6→**2** | 6（solo 开关只能到 1） |
| `event/LudiMazePQ.js` | maxLevel 70→**80** | 70 |
| `event/PiratePQ.js` | maxLevel 100→**200** | 100 |

> **顺带查出的 BeiDou 自身缺口（与 LK 移植无关）**：上面那段 GameConfig 门
> **只存在于 `scripts-zh-CN/`，英文基础层 `scripts/` 完全没有**。
> 也就是说服务器跑 `gms.service.language=en-US` 时，`use_enable_solo_expeditions` 与
> `use_enable_party_level_limit_lift` 两个开关**静默失效**，PQ 回落到写死的原版阈值。
> 已记录，未修——修它属于 BeiDou 自身的双层一致性问题，不在 LK 移植范围内。

##### 撞车类：LK 与 BeiDou 各自独立做过同一 NPC（12 个，全部 rejected）

这类不是「LK 改了 BeiDou 没改」，而是**两边分别写了同一个 ID 的脚本**。判据是拿
LK HEAD 与 **BeiDou 现版**做结构比对（抹掉字符串/注释/空白），而不是看 LK 自己的 diff。

**东方神舟（7 亿段）5 个**——LK 和 BeiDou 各自做了一套中国区：

| 脚本 | 结论 |
|---|---|
| `npc/9310004.js` | 蜈蚣入口守卫，同目标图 701010321。BeiDou 兼顾 4103/8512 两个版本的任务、支持资格证明道具 4031289、带重复进入开关；LK 只查 `isQuestStarted(8512)`，还带个零调用的 `generateSelectionMenu` |
| `npc/9310005.js` | 黑羊守卫，同目标图 701010322。BeiDou 走任务模式（任务 4109 + 完成后自动 reset）、显示收集进度、可指定落点；LK 直接扣 50 黑羊毛，等价于 BeiDou 的 `QuestMode=false` 分支 |
| `npc/9310007.js` | 出口脚本，与 BeiDou 完全等价（同出口图 701010320） |
| `npc/9310044.js` | 妖僧副本出口，与 BeiDou 完全等价（同出口图 702070400） |
| `npc/9310013.js` | Perion ↔ 上海摆渡。LK 用一个 NPC 放两张图、按 `getMapId()` 分支；**BeiDou 拆成两个 NPC 各管一向**——`9310000` 在 Perion 飞 701000000、`9310013` 在 701000100 飞回 Perion，往返齐全（已核对 wz 放置与两图均存在）。照搬要往 Perion 的 `Map.wz` 再塞一个 9310013，结果是 Perion 出现两个功能相同的飞行员 |

**LK 新增但 BeiDou 上游已有的 7 个**：`quest/3305`、`quest/3306`、`reactor/2619003–2619005`
与 BeiDou 版逐行同构、只差译文；`quest/2233`、`quest/2234` 的 LK 版是 13 行 stub，
BeiDou 是带 `isQuestActive` 守卫与多段对话的完整状态机（2233 的经验 2400 vs LK 3000 属数值口味）。

> **一处方法论修正**：早先给脚本排优先级时，对 **LK 新增文件**用的是「LK 自己的 diff 行数」，
> 而新增文件没有 before 态，整份文件都会被计成新增，于是 `3305/3306`（各 30 行）、
> `2233/2234`、`2619xxx` 被排进了待办前列。正确的比较对象是 **BeiDou 现有的同名文件**——
> 按这个标准，这 7 个全部是零收益。

##### PQ 通关奖池：两边取并集（2026-08-17 决定）

发放机制是 `EventInstanceManager.giveEventReward` 从池子里**均匀随机取一项**，
所以池子的构成就是每次通关的概率分布，多一个稀释项就少一分好东西。两边原本是这样：

| | BeiDou（HeavenMS 原版） | LK |
|---|---|---|
| KPQ 池 | 42 项，卷轴仅 7 项（17%），**全是 10% 成功率** | 29 项，卷轴 27 项（93%），含 10 张 60% |
| 其余非卷轴 | 药水/矿石/宝石原石/装备，且有 11 条是「一次给 80 个蓝药水」这类大宗消耗 | 全部清空 |
| OrbisPQ 池 | 94 项 | 29 项 |

LK 的做法是**砍掉稀释项、把池子做窄做贵**，属高倍服的经济设定；
BeiDou 的是原版分布。用户决定**取并集**：保留 BeiDou 原池与其数量，
追加 LK 独有的道具（新道具用 LK 的数量），重复项不动。

| PQ | BeiDou | + LK 独有 | 合并后 | 卷轴占比 | 60% 卷轴 |
|---|---|---|---|---|---|
| KerningPQ | 42 | 27 | 69 | 17% → **46%** | 0 → **10** |
| LudiPQ | 77 | 27 | 104 | 42% → **50%** | 25 → **29** |
| OrbisPQ | 94 | 15 | 109 | 34% → **42%** | 25 → **39** |
| MagatiaPQ_A / _Z | 23 | 23 | 46 | 52% → **72%** | 9 → **30** |
| BossRushPQ | 6 档中的 3 档 | 24 / 24 / 1 | 55 / 55 / 35 | — | — |

合并后 269 个去重道具**逐个核对存在于 `wz` 与 `String.wz`**（缺失 0），
每个池的 `itemSet`/`itemQty` 长度一致，两层内容逐字符相同，12 个脚本过 `node --check`。

**`reactor/2401000.js` 从这批里单独拎出来当 bug 修。** 它跟 PQ 限制无关，是召唤暗黑龙王
本体时**重置**副本计时器：

| | LK 基线 | LK HEAD | BeiDou 移植前 | 本次 |
|---|---|---|---|---|
| `event/HorntailBattle.js` `eventTime` | 120 分 | 180 分 | **180 分**（已移植） | 180 分 |
| `reactor/2401000.js` `restartEventTimer` | 60 分 | 240 分 | **60 分** | **180 分** |

移植前的状态是：进副本给 180 分钟，一召唤本体反被砍回 60 分钟——上一轮 BOSS 组移植
留下的半截。补成 180 与副本时长一致，**不照抄 LK 的 240**（LK 自己那边 180/240 也不自洽）。

#### 第 1 项 sql → Flyway ✅ 已完成（V1000.1.1–.6）

4 个 sql 文件的真实构成与「drop_data 与 shopitems 调整」的原始描述出入较大，逐段判定如下：

| 来源 | 处置 | 去向 / 依据 |
|---|---|---|
| `db_database.sql`（±73） | ❌ rejected | 纯 latin1→gbk 建表噪音，§8 GBK 终局 rejected |
| `db_drops.sql`（±1） | ❌ already-fixed | 仅把实验室怪 DELETE 上界 9300154→9300153；BeiDou V1.0.51 里该 DELETE 整段本来就被注释掉 |
| `db_LichKingMod.sql` 掉落/技能书/PKB/maker 段 | ✅ ported | V1000.1.3（祝福/混沌/点券/药丸）、V1000.1.4（技能书 BOSS 化）、V1000.1.5（中级宝石直接用矿石合成） |
| `db_LichKingMod_patch.sql` drop fixes/saga/新加坡段 | ✅ ported | V1000.1.2；`distinctive` 列由 V1000.1.1 先建（Java 读取归第 2 项） |
| reactor 调价 + 药水物价 | ✅ ported | V1000.1.6；APQ 调价限定 6702003–6702012，不波及 BeiDou V1.0.60 婚礼箱 |
| 4 张建表 | ⏭ 不在本项 | login_history/message_board 批次 2、4 已建；monsterBookReward 死表；royalAccounts 批次 8 |
| bosslog MODIFY bosstype | ❌ already-fixed | 批次 6 V1000.0.14 用 VARCHAR(32) 做过，方案更优 |

**挂起转后续任务的 4 条**（都有明确归属，不是漏项）：

| 挂起项 | 原因 | 归属 |
|---|---|---|
| fm 商店 9000069 整店重建 | BeiDou 基线里 9000069 是 pitch 计价商店，语义完全不同；要配 LK 自由市场 NPC 脚本才有意义 | 第 2 项脚本组 |
| 宝藏 PQ 反应堆 6742014 三条调价 | BeiDou reactordrops 无此反应堆（V1.0.65 清理过），UPDATE 无目标 | TreasurePQ 脚本决策时连底行一起补 |
| nxcoupons 1.5 倍经验/掉落券 | LK 把 `Server.couponRates` 改成 `Map<Integer, Float>` 并手工 ALTER rate 为 float；BeiDou 实体与列均为 int，直接插 1.5 会截断 | Java 尾巴（连 NxcouponsDO / Server.java 一起） |
| 中国怪掉落（9600008–9600026） | BeiDou V1.7.3 东方神舟每只 21–73 行，远比 LK 6–13 行完整，整段 rejected；唯一遗留：LK 清空 9600026（妖僧分身）掉落防刷，BeiDou 保留 60 行 | YaoSeng 脚本组复核分身是否应掉落 |

#### 第 2 项 Java 尾巴（22 行）✅ 已完成

| 组 | 处置 | 说明 |
|---|---|---|
| `MonsterDropEntry` + `MonsterInformationProvider` | ✅ ported | `isDistinctive` 字段、`retrieveDrop` 读列、多件掉落判定加 `\|\| isDistinctive`（PKB 的 2–4 个祝福/混沌靠它逐个滚） |
| `MapleMapFactory`（BeiDou `MapFactory`） | ✅ 半搬 | 7 亿段→`chinese` 采纳（zh-CN String.wz 已有该节点，原先落 `etc` 查不到名字）；`singapore`→`SG` **rejected**——BeiDou 两层 String.wz 均无 `SG` 节点，那是配 LK 自家 String.wz 的改法 |
| `@whatdropsfrom` | ✅ 半搬 | 吸收 `#v`/`#z` 物品图标富文本；按怪名搜索保留，不跟 LK 改成按怪 id（同批次 1 对 15 个指令 id 化的否决理由） |
| `@whodrops` | ❌ already-fixed | 批次 5 已重定向脚本中心「当前地图掉落_物品查询」，LK 的掉率显示/空结果处理均被覆盖 |
| **倍率券 float 化** | ✅ ported | LK 把 `Server.couponRates` 改 `Map<Integer, Float>`；BeiDou 全链 int → 一并改：`NxcouponsDO.rate`、`Server`、`Character`（expCoupon 三兄弟、`activeCouponRates`、4 个 getter）、`ExpLogger`（记录与落库列，照 V1.5.2 对 world_exp_rate 的同款先例）。V1000.1.7 改列 + 插 5211900/5360900 两张 1.5 倍券。**券要生效还需商城可购**（specialcashitems/commodity 归批次 8 商城组） |
| **gachapon 16 文件**（15 城市类 + `Leafre` java-new） | ✅ ported | 见下方「gachapon 工作包」 |

#### gachapon 工作包 ✅ 已完成

原本 deferred 的理由成立：**BeiDou 运行时走 `GachaponService` + DB 奖池**
（`Gachapon.process()` 全仓库零调用，`doGachapon()` 的硬编码路径已注释成死代码；
池子带有效期/公共池/权重，gms-ui 可管理），按文件搬 LK 的 15 个奖池类是打在死代码上。
三个提交按「Java 特性 / 奖池数据 / 新扭蛋机」拆开：

| 组 | 处置 | 说明 |
|---|---|---|
| `doGachapon(quantity)` + `gachapon.js` | ✅ ported | 连抽转成 `GachaponService.doGachapon(player, gachaponId, quantity, ticketItemId)`：逐抽校验券数与背包空位、抽不成不扣券、连抽汇总成一条对话而不刷聊天框。**券 ID 由脚本传入**，不像 LK 那样写死 5220000（否则远程扭蛋的 5451000 会被扣错）。脚本菜单加十连抽，地名从与 NPC ID 强耦合的硬编码数组换成客户端宏 `#m<mapid>#` |
| 15 个城市奖池类 → `V1000.1.8` | ✅ ported | LK 的 base→HEAD 增量转数据迁移，198 删 + 407 增。**对齐前提逐项核对过**：BeiDou 的 `server/gachapon/*.java` 与 LK 基线 HeavenMS 2022 完全一致（只差 Cosmic 删掉的 `4006000`），`V1.4.0` 的种子 = 城市数组 + Global 数组合并。三条主线：①12 个城镇的**传奇档原本全空**（只有 Global 兜底的 4 项），LK 给每城配了专属椅子与稀有装备；②公共奖品把消耗类稀有品换成中等强化宝石/水晶——与 `V1000.1.5`「中等宝石可直接从矿石合成」是同一套设计，扭蛋成为制作系统的原料来源；③城镇池按主题重排（卷轴补齐 1%/10%/60% 配对、昭和男女澡堂 85→176 / 45→173、林中之城收窄 65 项） |
| `Leafre.java` + 神木村扭蛋机 → `V1000.1.9` | ✅ ported | LK 按 mapId 取池，做法是把神木村的 `9200000` 换成 `9100100`；BeiDou 按 npcId 取池，照搬会抽出射手村的池子且平白删一个 NPC。改挂 **`9100111`**——`Npc.wz` 里有资源、`String.wz` 双层有名字、但没有任何地图放置，纯增量。`Map.wz/Map/Map2/240000000.img.xml` 新增 life 槽 23（LK 的 `fh=136` 在本仓库这份地图里是另一段，按 foothold 表重定位到同视觉位置的 `fh=10`） |
| `MapleGachapon`（BeiDou `Gachapon`） | ⚠ partial | 只采 `LEAFRE` 枚举项与「名字列表从枚举派生」。**否决**：改按 mapId 索引（npcId 更精确，一图多机不冲突）、`cnName` 硬编码中文（走 `I18nUtil`）、档位权重 90/8/2→120/8/2（运营口味，gms-ui 可调）、注释掉玩具城扭蛋机 |
| `gachaponInfo.js` / `GachaCommand` / `GachaListCommand` | ❌ rejected | LK 的改动全是硬编码汉化；BeiDou 三者都已走 i18n，且 `gachaponInfo.js` 查的是实时 DB 奖池，比 LK 的 Java 数组强 |
| `gachaponold.js` / `gachaponRemote.js` / `9270043.js` | — | LK 未改动这三个。顺带处理：`gachaponRemote.js` 双层删掉死变量 `curMapName`；`9270043.js` 双层补上漏扣的券（该 NPC 目前未放置在任何地图、也没有奖池，属潜在问题） |

**验证**：225 个新增道具逐个核对存在于 `wz` 与 `String.wz`；`V1000.1.8` 按种子模拟执行后，
12×3 个池与 LK HEAD **逐项相等**（唯一差异是 pool 9 玩具城普通档少 87 项，
属 BeiDou 种子既有缺口，动手前就存在）；`V1000.1.9` 反查公共奖品用的
「12 个同档池都有」交集，已验证在三档上与 LK 的 Global 池逐项相等（32/9/7）。

**遗留**：`Map.wz` 的改动需随 wz 批次同步到 BeiDou-Client（第 6 项）。

#### 公会创建费用配置化（`npc/2010007.js`）✅ 已完成

LK 的改动是把家族创建费用从写死的 `1500000` 换成
`Packages.config.YamlConfig.config.server.CREATE_GUILD_COST`。查下来 BeiDou 早已做完同一件事，
而且做得更彻底——**唯独漏了英文脚本层**：

| 位置 | 状态 |
|---|---|
| `MatchCheckerGuildCreation`（校验 + 实际扣钱）、`GuildOperationHandler`（校验） | 已走 `GameConfig.getServerInt("create_guild_cost")`，默认值由 `V1.7.0` 种子给出 |
| `Guild.getIncreaseGuildCost`（扩容费用） | 三个配置项 `expand_guild_base_cost` / `_tier_cost` / `_max_cost`，LK 那边仍是常量 |
| `scripts-zh-CN/npc/2010007.js` | 已读 `GameConfig` 显示 |
| `scripts/npc/2010007.js`（英文层） | ❌ 仍写死 `1500000` —— **本次补上** |

后果是运营在 gms-ui 改了 `create_guild_cost` 之后，`gms.service.language=en-US` 下这个 NPC
会报一个假价：对话说 1500000，实际按配置值扣。改动只有一处 `sendYesNo` 的文案取值，
按英文层惯例在用到的分支里就地 `const GameConfig = Java.type(...)`。

> 英文层 `selection == 2` 的族长判定（`getGuildRank() != 1`）与中文层（`> 2`，副族长也可）不一致，
> **不动**：这是 BeiDou 中文层自己的放宽，LK 侧同样是 `!= 1`，与本次移植无关。

#### reactor 组（`2119001–2119006`）❌ 全部 rejected

LK 把这 6 个反应堆从「按次扣血」改成「一击削弱区域 BOSS」。逐个比对 **LK HEAD vs BeiDou 现版**
（不是 LK 自己的 diff）后，6 个的逻辑 BeiDou 上游**一字不差地已经有了**：

| | LK 基线 | LK HEAD | BeiDou 现版 |
|---|---|---|---|
| `2119001–2119003` 死亡之森墓碑 | `rm.hitMonsterWithReactor(6090000, 14)` | `hit()` 加 `getState() !== 0` 守卫 + `rm.weakenAreaBoss(6090000, …)` | 同左，另有地图名与 MSEA 出处的文档注释 |
| `2119004–2119006` 雪女祭坛 | `hit()` 里 `hitMonsterWithReactor(6090001, 4)` + 随机 `setEventState` | 逻辑挪进 `act()` 调 `rm.weakenAreaBoss(6090001, …)` | 同左 |

反过来 BeiDou 版更干净：LK 把旧调用留成注释（`2119004–2119006` 连整个 `hit()` 都是注释掉不删），
且**把 AGPL 版权头整段替换成了自己的署名注释**——按 CLAUDE.md 第 6 条这段本来就不能照搬。
`2119001/2/3` 在 BeiDou 侧仅差文档注释里的「死亡之森 II/III/IV」，`2119004/5/6` 三份逐字节相同。

至此 reactor 类全部收口：`2401000` 已作 bug 修（计时器 60→180），
`2619003–2619005` 属「LK 新增但 BeiDou 上游已有」那 7 个，本组 6 个 rejected。

#### 剩余 pending 的重排序（2026-08-17）

前面的优先级是拿「LK 自己的 diff 行数」排的，对 LK 新增文件会虚高。改成
**LK HEAD vs BeiDou 现版**、抹掉字符串/注释/空白后的多重集对称差行数重排，
101 个 pending 的分布是：结构等价 2 个、差异 1–4 行 11 个、5–20 行 30 个、
20–50 行 33 个、50 行以上 25 个（`npc/9000036` 差异 210 行居首，
`2040016` 157、`1022101` 152、`2020000` 152）。脚本见 `rank.ps1` 的做法，
判据与「全量分层」那套一致，可复现。

##### 差异 1–4 行的一批（13 个，2 采纳 11 拒）

| 脚本 | 结构差异 | 处置 |
|---|---|---|
| `quest/29906`–`29909` | LK 多一句 `qm.sendOk("恭喜获得…")` | ✅ 采纳。骑士勋章原本是静默发放，玩家没有任何反馈。`29908` LK 用的是 `sendNext` 且放在 `gainItem` 之前——终结对话挂个点了没反应的「下一步」箭头，统一改 `sendOk` 并放到 `forceCompleteQuest()` 之后 |
| `npc/2081000` | LK 注释掉顶层菜单，`start()` 直接 `action(1,0,0)` 跳进购买流程 | ✅ 采纳其意图。BeiDou 的菜单第二项「为神木村做点什么」点进去只有一句 `Under development...`，是死路。**不照抄 LK 注释掉代码的做法**：直接删掉 `#L1#` 菜单项与对应的 `else` 分支，不留死代码。顺带补了 `scripts-zh-CN` 里 `sendGetNumber` 整句漏译（BeiDou 自身的汉化缺口） |
| `npc/1100003/4/7/8` | LK 在 `mode == -1` 的 `cm.dispose()` 后加 `return;` | ❌ 该分支带 `else`，加不加行为一致 |
| `npc/1100005/1100006` | 无 | ❌ 结构完全相同，纯译文 |
| `npc/2040024` | LK 去掉 `if/else` 的大括号 | ❌ 纯格式 |
| `npc/2102002` | LK 注释掉玩家拒绝时的告别对话；提了个 `ticketId` 变量 | ❌ 前者反而少了反馈；后者只用在提示文案里，`gainItem`/`canHold` 仍写字面量，无实质改进 |

勋章名 `1142066–1142069` 已核对在 `wz` 与 `wz-zh-CN` 两层 `String.wz/Eqp.img.xml` 里都有，
`#t<id>#` 能正常渲染；`qm.sendOk(...)` 紧跟 `qm.dispose()` 是 BeiDou quest 脚本的既有写法
（如 `quest/20020.js`、`20101.js`），不引入新模式。

##### 差异 5–13 行的一批（16 个，3 采纳 13 拒）

这一档的结构差异**绝大多数是 LK 去掉单语句 `if/else` 的大括号**，以及
`new Array(...)` 换成字面量数组——判据把空白抹了但抹不掉 `{`，所以计数虚高。
真有内容的只有 3 个，其中 2 个是 BeiDou 侧的 bug：

**① `portal/enterBackStreet.js` — 任务链会被锁死（采纳 LK 的改法）**

武公线的顺序是：`21744`（影子武士的预告，洞外 NPC 2090004 接）→ `21745`（如果想见到武公，
道场 NPC 2091005 起止，也在洞外）→ 进洞 → `21746`（武公的考试）→ `21747`（抓住影子武士）。
原条件 `isQuestActive(21747) || (isQuestActive(21744) && isQuestCompleted(21745))` 的洞在第 4 步：

| 步骤 | 状态 | 能否进洞 |
|---|---|---|
| 完成 21745 | 21744 进行中 + 21745 已完成 | ✅ |
| 进洞后在 2091007 交掉 21744 | `isQuestActive(21744)` 变 false | ❌ |
| 接 21746（起止 NPC **就是洞里的 2091007**，前置要求 21744 已完成） | 21747 尚未开始 | ❌ |
| 完成 21746 后接上 21747 | `isQuestActive(21747)` 为 true | ✅ |

也就是说交掉 21744 到接上 21747 这一段门是关的，一旦离开地图或掉线就再也进不去，
任务链废掉。`portal/outSpecialSchool.js` 是子图回 925040000 的返回口，不是独立入口，没有绕路。
LK 换成 `isQuestCompleted(21745)` 正好堵上——原条件成立时 21745 必然已完成，是真包含关系。

**② `npc/2041023.js` — 火毒大魔导士进不了元素塔纳托斯 PQ（采纳意图，改法与 LK 不同）**

「调换属性」和「异界钥匙」是按职业成对的，两把钥匙都从怪 `8160000`（地图 220060400，
在副本**外面**，无循环依赖）以同样 2% 掉落：

| 职业 | 调换属性 | 异界钥匙 | 钥匙道具 | 最终技能 |
|---|---|---|---|---|
| 火毒 (212) | `6225` | **`6226`** | `4031473` | `2121005` |
| 冰雷 (222) | `6315` | **`6316`** | `4031496` | `2221005` |

原条件 `isQuestCompleted(6316) && (isQuestStarted(6225) || isQuestStarted(6315))`
接受两条线的「调换属性」、却只认冰雷那把钥匙，火毒永远开不了这个 PQ。
**不照抄 LK**——LK 是把钥匙判定整个删掉，那样冰雷也不用拿钥匙了，等于删掉设计里的前置。
改成按分支各配各的钥匙：`(6225 进行中 && 6226 已完成) || (6315 进行中 && 6316 已完成)`。

**③ `event/Subway.js` — 发车倒计时（采纳一半）**

LK 在 `takeoff()` 里加了两样：站台广播汽笛 + `timerMapPlayers(rideTime/1000)` 倒计时。
倒计时采纳（地铁开走后正好一个 `rideTime` 回来，站台上的人因此知道下一班什么时候到）；
BeiDou 没有 `MapleMap.timerMapPlayers`，等价写法是 `map.broadcastMessage(PacketCreator.getClock(...))`，
与 `Coconut.java`、`TimerMapCommand` 一致，且 `getClock(Number)` 本就为旅行倍率的小数widened 过。
**汽笛不做**：`playSound("subway/whistle")` 指向 `Sound.wz/subway.img`，
BeiDou 的 `Sound.wz` 里没有，**LK 自己的 `wz/Sound.wz` 里也没有**——
它注释里写着音源取自 soundjay.com，只存在于他们的客户端，本仓库无从移植。

**其余 13 个全部 rejected**，其中 4 个是 LK 侧的退化，值得单独记一笔：

| 脚本 | 拒绝理由 |
|---|---|
| `npc/9120003` | LK 把 `cm.getMeso()` 写成 `cm.getMeso`（漏括号），拿函数对象和数字比，金币不足的判定永远不成立——引入 bug |
| `npc/9000021` | LK 在 `status == 0` 就 `sendOk` + `dispose` + `return`，后面 4 步永远走不到，等于把 BossRushPQ 的入口 NPC 废掉 |
| `npc/2007` | 把「跳过新手教程直达 Lith Harbor」的 `sendYesNo` + `warp(104000000)` 换成 LK 自家的群公告（技改/投票/验证），功能被删 |
| `portal/rienTutor4` | 强制绑邮箱才放行。批次 2 已决定账号安全只做登录 IP 记录，BeiDou 既无 `pi.getEmail()` 也无 `verifyEmail` 脚本；LK 版在无邮箱分支还漏了返回值 |

另外 `npc/9201134`、`npc/2082014` 属 BeiDou 侧更全（前者多 `giveEventReward` 与背包满守卫，
后者已是 GameConfig 版且多一个兜底 `else`）；`1032007`/`2012002`/`1052107` 都是 LK 删掉一步
玩家反馈；`1081001` 是 `if/else if` 链里多余的 `return`。

##### 差异 1–19 行的一批（27 个，1 采纳 26 拒）

排序基准又改了一次：把 `{` `}` 也纳入归一化——LK 大量去掉单语句 `if/else` 的大括号，
不抹掉的话这类噪声能顶到十几行，把真改动压在下面。重排后剩余 72 个的分布更贴近事实。

唯一采纳的是 **`npc/2010008` 家族徽章费用**，与 `2010007` 同一形状：
`GuildOperationHandler` 与 `scripts-zh-CN` 都已读 `change_emblem_cost`，只有英文层写死 `5000000`。

拒绝的 26 个里，值得单独记的几类：

| 类别 | 脚本 | 说明 |
|---|---|---|
| LK 删掉服务/校验 | `2081100`–`2081500` | 把「教我本职业技能」的菜单换成 `sendOk`+`dispose`，等于删掉四转技能书发放口。BeiDou 版本来就按 `getSkillLevel == 0` 防重复领 |
| | `PupeteerPassword`、`ThiefPassword`、`2091009` | 删掉 `sendGetText` 口令校验直接放行 |
| | `9201043` | 删掉 10 钥匙换门票的 `sendYesNo` 确认，直接扣道具 |
| LK 引入 bug | `9270026` | 一次性美瞳券。`(colors[i]/100) % 100` 在 gender=1（基数 21000）会得 `10+i`，扣错券；BeiDou 按性别取基数并用 `% 10`，正确 |
| | `quest/2322` | 把 `forceStartQuest()` 注释掉，改成在 `start()` 里直接 `forceCompleteQuest()` + `gainExp(11000)`，而 `end()` 里还会再发一次——接任务即完成且经验翻倍 |
| 已在 BeiDou 侧配置化 | `9000040`、`9000041`、`1032001` | LK 仍是 `YamlConfig` / `Packages.server.life.MaplePlayerNPC` 老包名 |
| 经济向调参 | `2020005` | 阿尔卡斯特单次购买上限 100 → 2000。`canHold` 只校验一格、又是先扣钱后发货，拉高上限会放大「背包放不下就丢钱」的既有风险 |
| | `2030008` | 新增「完成 100201 后，30 个 `4000082` 反复换 2 个火焰之眼」的可重复兑换。**不是修死路**——BeiDou 现有路径是一次性锻造 5 个，之后 NPC `2082014` 的商店按 6000 万金币卖（`V1.0.66__shopupdate`）。这条会把扎昆门票从 6000 万一张变成几乎白嫖，属运营决策，需要时再开 |
| 奖池是子集 | `1052015` | LK 两档都是 BeiDou 的真子集（lv2 少 `1022073`，lv1 少 `1302033`/`1002419`/`2040207`/`4031203`），按并集规则等于保持现状 |

##### `npc/9000038` 公示牌与实际奖池对不上（上一轮并集的遗留）

`9000038`（Agent Kitty）是 Boss Rush PQ 的**奖励公示牌**，六档 `itemSet_lvN`/`itemQty_lvN`
是 `event/BossRushPQ.js` 里 `setEventRewards()` 那六个 `evLevel` 池子的**第二份拷贝**。
上一轮并集只改了 event 侧，公示牌就开始说谎：

| 档位 | 公示 | 实际 |
|---|---|---|
| lv1 / lv2 / lv3 | 33 / 34 / 33 | 一致 |
| lv4 | 34 | **35** |
| lv5 | 31 | **55** |
| lv6 | 31 | **55** |

处理方式**不是**照搬 LK 的公示数组，而是**从实际奖池反向同步**——LK 那份同样是手抄的，
没有权威性。同步后两层六档与 `BossRushPQ.js` 逐项相等（含数量），并在两个文件里
各加了一段互指注释。要根治得让公示牌走 `em.getProperty()` 读取（像 PQ 组那样），
但那会给一个原本无依赖的 NPC 引入事件管理器依赖，超出本次移植范围。

**同时修掉上一轮并集脚本留下的缩进问题**：`BossRushPQ.js` 两层各 6 行 `itemQty`
被顶到了行首（正则里 `\r?\n[ \t]*` 把缩进捕获组吃掉了）。其余 5 个 PQ 的 `itemQty`
本来就在模块作用域、原本就顶格，未受影响——已逐个与并集前的版本比对确认。

### 批次 8 — 皇家系统 ❌ 整批不做（用户 2026-08-17 决定）

`server/ultils/RoyalAccount`（+69）、`RoyalCommand`（+114）、`royal_accounts` 表、
皇家点券兑换与月卡逻辑，以及 8807 个 `Character.wz` 点装/发型/脸型/坐骑。

**决定：整批跳过。** 连带把批次 7 里唯一依赖它的脚本 `npc/9000036` 判为 rejected。

#### `npc/9000036` 为什么只能整条判掉

LK 不是「改」了这个 NPC，是**整个换掉**：

| | BeiDou（= HeavenMS 原版） | LK |
|---|---|---|
| 身份 | 亨内西 **Agent E，饰品制作师** | **皇家点券兑换台** |
| 菜单 | 坠子 / 脸部 / 眼部 / 勋章腰带 / 戒指，各带材料配方与金币手续费 | 30点皇家点券 / 30天皇家会员 / 两个一小时点装 / 材料换点券 |

原饰品逻辑被 LK 复制到 `9000036_accessory.js` 留底，但 `NPCScriptManager` 按
`npc/<npcid>.js` 取文件，这个名字**永远不会被加载**；LK 全仓库也没有任何
`openNpc(9000036, "9000036_accessory")` 调用（`git grep` 0 处）。它就是块死文件。
所以照搬 LK = BeiDou 玩家失去饰品制作 NPC。

LK 那份的五个菜单项依赖四样 BeiDou 没有的东西：

| 依赖 | 现状 |
|---|---|
| `cm.gainRoyalPoint(n)` / `cm.gainRoyalTime(days)` | LK 加在 `AbstractPlayerInteraction` 上；BeiDou 全 Java 目录 **零处** royal |
| `@redeem` 指令（兑换成功提示语引导玩家去用） | 同属本批 |
| 材料 `3100000` / `3100001` | 即本批次已全部注释掉的组队/BOSS凭证，`Item.wz/Install/0310.img.xml` 整个缺失 |
| 材料 `3101000` / `3101001` | 两层 `Item.wz` 都没有 |

只有 `5211900` / `5360900`（两个一小时点装）现成。只搬这两档、其余注释掉的话，
等于拿一个能用的饰品制作 NPC 换一个五选一里四个是注释的空壳，净亏——故整条 rejected。

> 若将来重启皇家系统：**不要照 LK 那样删掉饰品制作**。应像神木村扭蛋机那样，
> 找一个 `Npc.wz` 里有资源但无地图放置的 ID 把饰品制作挪过去，两个 NPC 都留着。

已扫过剩余 pending 脚本确认**只有 `9000036` 一个**真依赖皇家 API
（`npc/1012117` 命中的「皇家」只是一句对话文案，不碰 API，按发型池另行判定）。

#### 「整个换掉 NPC」这一类：`npc/1022101` 同判 rejected，原文封存

`1022101` 与 `9000036` 是同一个模式，且代价更大。BeiDou 的 `1022101` 是
**Rooney，快乐村（`209000000`）传送 NPC**，LK 换成了枫叶兑换商。

- **Rooney 是快乐村唯一的入口，且被放置在 23 张地图**（几乎每个主城）。
  其余碰 `209000000` 的 NPC（`9220005`、`2002000`）都在快乐村**里面**，是出口/返回；
  `9105005` 是雪人乐园，不相干。照搬 = 圣诞活动区整个失联，一次波及 23 张图。
- **四档兑换货币三档不存在**：`3100000`/`3100001` 数据缺（`Item.wz/Install/0310.img.xml`
  整个没有）但 `String.wz` 有名字；`3101001` 数据与名字皆缺；只有 `4001126`（枫叶）齐全。
  奖池另有椅子 `3010121`/`3010135` 数据与名字皆缺。

> **查证时的一处自我更正**：初查只扫了 `Item.wz`，把 `1102166`/`1112413`/`1072427`
> 也报成缺失。这三个是**装备**，在 `Character.wz` 里，实际都在。判据已改成按 ID 段分流。

**唯一自洽、值得将来单独捞的一块**是第三档「枫叶换职业武器」：30 件武器在
`Character.wz` 里一件不缺，货币 `4001126` 也有。做法应是**挂新 NPC**
（找 `Npc.wz` 有资源但无地图放置的 ID，纯增量加 `Map.wz` 放置，同神木村扭蛋机 `9100111`），
而不是拿快乐村的门去换——这需要动 `Map.wz`，归第 6 项。

两份 LK 原文（连同 LK 那份从未被加载的 `9000036_accessory.js`）已封存到
**`docs/lkport-parked/`**，附判定依据与复活路径。该目录不在运行时路径上，
`NPCScriptManager` 只从 `gms-server/scripts{,-zh-CN}/npc/<npcid>.js` 取文件。

##### 排序判据的第三次修正：抹掉 BeiDou 自己做过的写法现代化

`npc/1022000` 一度排在差异 90 行，展开一看全是 BeiDou 侧的语法现代化。往归一化里
又加了四条**语义等价**的变换，重排后剩余 41 个的头部从 172 行降到 59 行：

| 变换 | 由来 |
|---|---|
| 整行删掉 `const X = Java.type("...")` | BeiDou 用它引类，LK 直接写 `Packages.a.b.X` |
| `Packages.a.b.C` → `C` | 同上 |
| `let` / `const` → `var` | BeiDou 改过声明方式 |
| `===` / `!==` → `==` / `!=` | 同上 |
| `new Array(a,b,c)` → `[a,b,c]`（配对扫描括号） | LK 用构造器，BeiDou 用字面量 |

另加一条「拼接后全等」判定，把「代码完全相同、只是 LK 写单行 `if(x)stmt;` 而
BeiDou 拆两行加大括号」这类彻底分出来。

##### `npc/1022003` — 又一处英文基础层落后于中文层

LK 把雷电的精炼菜单从写死道具名改成 `#i##z#` 宏。查下来 **BeiDou 的 `scripts-zh-CN`
早已是宏形式，而且比 LK 更好——保留了等级提示**（LK 把 `- 战士 Lv. 15` 那截丢了）。
落后的又是 `scripts/` 英文层：还是硬编码道具名，没图标、也会和实际道具名漂移。

改英文层 4 个数组共 44 项为 `#i<id>##t<id>#` + 保留其原有等级后缀。**逐项与
`String.wz` 核对**，41 项精确匹配，8 项对不上的查证后恰恰都支持这次改动：

| 对不上的项 | 实情 |
|---|---|
| 矿石 7 项 | 英文层写的是简称 `Bronze`，`String.wz` 是产物全名 `Bronze Plate`；中文层用 `#t#` 渲染的就是全名 |
| `helmets[11]` | 英文层写的 `Mithrill Football Helmet` 是**拼写错误**（双 L），用宏自动修掉 |

LK 其余改动不采纳：BeiDou 的 `prompt` 有单复数处理，`matSet` 用字面量数组。

##### 判定改看真 diff（用户 2026-08-17 要求）

之前汇报只给结论不给材料，看不出脚本在干嘛。改用 `realdiff.ps1`：剥掉两边版权头后
`git diff --no-index` 出**未归一化的真实 diff**。归一化那套只用来排序，判定一律看原文。

| 脚本 | 是什么 | 判定 |
|---|---|---|
| `npc/2091005` | 武陵道场守卫（进道场/领腰带/领勋章/重置点数） | ❌ 零逻辑改动。`importPackage` 是 Nashorn 死代码；`YamlConfig` 对应 BeiDou 已有的 `GameConfig`；`GameConstants.isDojoPartyArea` 对应 BeiDou 重构后的 `MapId.isPartyDojo`；**`getFinishedDojoTutorial()` 对应 BeiDou 已改名的 `isFinishedDojoTutorial()`——照搬会找不到方法**。若干 `dispose()` 后的 `return` 逐个核对位置，都在分支末尾，加不加一样。LK 这份还是半汉化，两处 Dojo 占用提示他自己没翻 |
| `npc/1052014` | 网吧 PQ 兑换机（投橡皮擦换 6 档奖励） | ⚠ 奖池按用户决定改用 LK 的（见下）。`givePrize()` 保留 BeiDou 版：**有数量为 0 的守卫**（LK 会调 `gainItem(id, -0)`），**发完奖有中奖提示**（LK 把整句删了，玩家点完兑换屏幕上什么都不显示） |

##### 网吧 PQ 奖池改用 LK 的（用户 2026-08-17 决定）——连带公示牌

与 PQ 通关奖池取并集的决定不同，这处用户选了**直接用 LK 的池子**。
LK 的两档是 BeiDou 的真子集，所以效果是「删掉 5 项稀释物」：

| 档位 | BeiDou | LK | 移除的 |
|---|---|---|---|
| lv1 | 30 项 | **26 项** | 枫叶旗 `1302033`、枫叶帽 `1002419`、眼部装饰智力卷轴 `2040207`、万圣节糖果 `4031203` |
| lv2 | 30 项 | **29 项** | 划痕眼镜 `1022073` |
| lv3–lv6 | — | — | 两边本就逐项相同 |

**关键是这对 NPC 与 `BossRushPQ`/`9000038` 是同一个陷阱**，动手前先查实了：

| 脚本 | 角色 |
|---|---|
| `npc/1052014` | Cafe PQ **Rewarder** —— 真发奖（`gainItem`） |
| `npc/1052015` | Billy，Cafe PQ **Reward Announcer** —— 只公示（`sendPrev`，不发奖） |

两者在同一张图（193000000 网吧），六个池子各存一份。只改发奖方，公示牌立刻说谎。
所以四个文件（两个 NPC × 两层）一起改，并在两边加了互指注释。

**验证**：改前先确认 BeiDou 两份一致、LK 两份一致；改后四份六档逐项相等（含数量），
每档 `itemSet`/`itemQty` 长度相等，4 个脚本过 `node --check`，裸 LF 为 0。

> 这也让先前把 `1052015` 判 `rejected` 的理由（「LK ⊂ BeiDou，取并集等于保持现状」）作废——
> 它本来就不该独立判定，得跟着 `1052014` 走。

##### `npc/9201097` — 采纳奖励预览，重写 LK 那份坏掉的实现

乌鸦令牌兑换商（需任务 8225 完成）。先厘清 BeiDou 的结构，它**不是**有重复项：

```js
var eQuestChoices = [4032007, 4032006, 4032009, 4032008,   // 选项 0-3
                     4032007, 4032006, 4032009, 4032008];  // 选项 4-7
// makeChoices 里 qnty[Math.floor(x / 4)] → 0-3 收 50 个，4-7 收 25 个
eQuestPrizes[0..3] = [...装备/卷轴/椅子...];   // 50 个令牌 → 随机装备
eQuestPrizes[4..7] = [[0, 3500000]];          // 25 个令牌 → 350 万金币
```

同 4 种令牌的**两条兑法**。LK 把 `[4..7]` 整段注释掉，等于删掉「换钱」这条路——**否决**。

**采纳**的是 LK 加的「先看奖励再兑换」预览（与 PQ 组已批准的通关奖励预览同一想法），
但 LK 那版三处坏，全部重写：

| LK 的写法 | 问题 |
|---|---|
| `for (var i = 0; i < listLength - 1; i++)`，其中 `listLength = length - 1` | 循环到 `length - 3`，**漏掉倒数第二项奖励** |
| `"#z" + eQuestPrizes[selection][i] + "#"` | 传的是整个 `[id, qty]` 数组，渲染成 `#z1002801,1#`，**宏失效** |
| `cm.sendSimple(sendStr); cm.dispose();` | 发完菜单立刻 dispose，**点了没反应** |

重写版在 `status == 1` 加一个二选一入口，`status == 2` 记下 `previewing`，
`status == 3` 分流到 `makeRewardList()`（正确处理 `itemId == 0` 表示金币的条目）。
两层状态机验过同构，语法与 CRLF 均通过。

**奖池不动**：LK 往法师档 `eQuestPrizes[3]`（Kage/Thorns/杖卷/棒卷）里加的
`2044701` 爪卷与 `2044501` 弓卷跑题，会稀释该档的法师向产出——并集规则是为
「LK 补充同类内容」准备的，不适用于往主题池里塞异类。

##### 又一批（3 拒 1 采纳）

| 脚本 | 是什么 | 判定 |
|---|---|---|
| `npc/2030006` | 三转问答试炼（冰峰雪域圣石） | ❌ LK 把 39 题的冒险岛常识题库换成 5 道自家服务器的题——经验倍率、**QQ 群号**、`1 + 1 =`、「遇到BUG应该怎么做？→ 及时向Lich报告！」。试炼连问 5 题正好用光他的题库（不崩，但每个玩家永远是同样 5 题）；他还删了生成 1st/2nd/3rd 序数的 `generateQuestionHeading()`，并留了个「第 N 个问题.。」的标点错 |
| `npc/1012117` | 亨内西美发店（随机发型/脸型） | ❌ LK 换成自定义大列表，**男发 41 款、女发 43 款在 BeiDou 的 `Character.wz` 里一款都没有**，脸型 41 款缺 31 款。属批次 8 的 `Character.wz` 点装资源，整批已跳过。脚本里 `pushIfItemExists()` 会挡住不存在的 ID 所以不会崩，但发型那项会**列不出任何款式** |
| `npc/9201083` | 新叶城的一句话闲聊 NPC | ❌ LK 改成高科技合成台（`2070018` + `4031917` + 1 亿金币 → `2070016`），**但他自己在 `start()` 里无条件 `sendOk` + `dispose`，把整个菜单注释掉了**，`action()` 那 40 行永远走不到——LK 那边这功能本身就是关着的 |

**`npc/9020001`（KPQ 关卡 NPC）⚠ partial —— 采纳「人数不对」的专门提示**

第 2/3/4 关要求恰好 3 名队员站在正确的绳子/平台/木桶上。BeiDou 原先只有二元判定，
人数不对时也只说「你们还没找对那 3 个」——玩家会一直换组合，是条死路。
LK 把返回值改成三态，人数不对时单独提示。采纳，并逐条验证了前提：

| 验证项 | 结果 |
|---|---|
| 各关组合是否都要求恰好 3 人 | 第 2/3/4 关的 4 / 10 / 20 个组合，`1` 的个数**全部为 3** |
| 与 BeiDou 单人跳关是否冲突 | 不冲突——`use_enable_stage_skip` 的判断在**数人头之前** early return |
| 两层是否对称 | `accept == 1` / `accept == -1` / `return -1` 在两层各 3 / 3 / 1 处 |

> 两层归一化后「不同构」是**既有差异**，非本次引入：英文层用
> `nthtext`/`nthobj`/`nthverb`/`nthpos` 模板变量，中文层是逐关硬编码名词。

**否决** LK 删掉 `use_enable_stage_skip` 单人跳关开关（他那版 KPQ 根本不能单人打），
以及 `importPackage(java.awt)` + 裸 `new Rectangle(...)` 这套 Nashorn 老写法
——BeiDou 已改成 `const Rectangle = Java.type('java.awt.Rectangle')`。

##### 五个 PQ（`EllinPQ`/`HenesysPQ`/`TreasurePQ`/`ElnathPQ`/`GuildQuest`）⚠ partial

先做了一次横扫，五个文件的 LK 改动**完全同构**，四类全是已判过的类别：

| 差异 | BeiDou | LK | 处置 |
|---|---|---|---|
| 通关发组队凭证 `3100001` | 无 | 五个都发 | ✅ 按既有做法补上**注释掉的调用 + 说明**，wz 随任务 #4 补齐后统一放开 |
| 大厅 API | `getMaxLobbies()` | `setLobbyRange()` | ❌ 后者是 LK fork 的 API，BeiDou 的 Java 不认 |
| 合格队伍返回值 | `Java.to(eligible, Java.type('...PartyCharacter[]'))` | 直接 `return eligible` | ❌ GraalVM 不会自动转数组，照搬会报类型错（Nashorn 时代才能这么写） |
| 人数/等级阈值 | 走 GameConfig 开关 | 写死（`maxLevel` 一律 200） | ❌ 已判类别，见上文「PQ 阈值那 23 个」 |

各文件另有的阈值改动：`EllinPQ` 人数 4→3 且 `maxLevel` 55→200；
`TreasurePQ` 人数 4→3 且 255→200；`HenesysPQ`/`ElnathPQ`/`GuildQuest` 均 255→200。

**凭证注释点全仓库统计**：本次 +10，累计 **24 处已注释、0 处仍在发**。

> 横扫同时复核了「GameConfig 门只在 `scripts-zh-CN/` 层」这个此前记录的 BeiDou 自身缺口：
> 五个文件**全部**是中文层有、英文层无，与先前结论一致。

##### 又一批六个（2 采纳 4 拒）

| 脚本 | 是什么 | 判定 |
|---|---|---|
| `event/Boats` | 魔法密林 ↔ 天空之城渡轮 | ⚠ 采纳**发船倒计时**（同 `Subway.js`：船开走后正好一个 `rideTime` 回来，码头上的人因此知道下一班何时到）。两层 `takeoff()` 结构本就不同——中文层被 BeiDou 重构过，`broadcastShip(false)` 挪到了 `stopentry()`——按各自落点加。**另注意 BeiDou 的 `Math.trunc()` 是在修 `em.schedule` 传小数毫秒的问题，LK 没有** |
| `npc/9201095` | 武器锻造/升级 NPC | ⚠ 采纳**菜单加道具图标**：两层原本都是 `"#t<id>#"` 只有名字，改成 `"#v<id>##t<id>#"`。同文件的材料提示本就用 `#i`，兄弟 NPC `9201097` 的菜单也用 `#v`。16 个 ID 逐个核对存在且两层名字齐全 |
| `quest/2293` | 摇滚精神的最后一首歌 | ❌ 实质差异只有音效路径：BeiDou `quest2288/6`（与它自己那段 TODO 自洽——10 段旋律在 `quest2288/0~9`），LK 改成 `quest2293/Die`。两边服务端 `Sound.wz` 都不含这两个 img，无法从仓库验证；但 `.../Die` 是 Mob 音效命名法。LK 还把那段解释 riff 随机播放机制的 TODO 整块删了 |
| `npc/9120013` | —— | ❌ BeiDou 多一个 `startFinalQuestIfNeeded()`，处理「8010 已完成但 8012 未开始」并自动衔接；LK 只判 `isQuestStarted(8012)`，覆盖不到那个状态 |
| `npc/9270047` | Scarga 远征 NPC | ❌ `exped.getPartInfo()` vs BeiDou 统一的 `em.getProperty("party")`（全仓库 8 个 NPC 都用后者，前者零使用）；`MapleExpeditionType`/`MaplePacketCreator` 是已改的类名。**LK 新增的「必须完成任务 4576（前往梦幻主题公园）才能加入/组建远征队」是新增限制而非修 bug**——该任务在 BeiDou 脚本里零引用，没有别处锁这条线，属运营决策 |

**`npc/9000020`（世界旅行社）❌ —— 三层关系值得单记**

LK 加了第三条航线（上海 `701000000` → 嵩山少林寺 `702000000`）。查下来：

| | 目的地 | 来历 |
|---|---|---|
| `scripts-zh-CN/npc/9000020.js` | **5**（上海外滩/嵩山镇/驳船码头城/吉隆大都市/古代神社） | **BeiDou 自己 2025 年的重写**（`Copyright (C) 2025 Magical-H`，「北斗航旅」），数据结构也不同（对象数组带 `area`/`portal`/`desc1`/`desc2`） |
| LK | 3 | 加了少林寺 |
| `scripts/npc/9000020.js` | 2 | 上游 HeavenMS 原版 |

即 **中文层 ⊃ LK ⊃ 英文层**，LK 那份被全面超过。

> **另记的 BeiDou 自身缺口**：英文层只有 2 个目的地。补齐要按中文层的结构整份重写
> 并翻译 10 段中文描述——那是创作不是移植，故不在本批次做，与
> 「GameConfig 门只在中文层」同列为 BeiDou 双层一致性待办。

> **必须一并移植的前置**：`ItemInformationProvider` 中为支持新发型/脸型扩大的 ID 段判断，
> 否则点装不显示。**批次 6 盘点时查证过，三条里已有两条不成立**：
>
> | ID 段 | LK 改法 | BeiDou 现状 |
> |---|---|---|
> | Face `20000–30000` ∪ `50000–60000` | 原 `20000–22000` | ✅ 已有 —— `ItemConstants.isFace` 判 `itemId/10000 ∈ {2,5}`，`ItemInformationProvider:227` 已改调它 |
> | Hair `30000–50000` ∪ `60000–70000` | 原 `30000–35000` | ✅ 已有 —— `ItemConstants.isHair` 判 `itemId/10000 ∈ {3,4,6}` |
> | Cape `1102000–1104000` | 原 `1102000–1103000` | ❌ **仍是 `1103000`**，这是唯一还要补的一条 |

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

> **2026-08-16 补充**：另一支 BeiDou 分支 `BeiDou-Server-ASM` 里有其中 **35 个**，
> 包括卡住克雷塞尔整条线的 `Map5/541020700`、`541020800`。ASM 也没有的 6 个是
> `Item.wz/Etc/0490`、**`Item.wz/Install/0310`（BOSS 凭证 3100000，仍须从 LK 取）**、
> `Map.wz/Obj/{glacierExplorer,trapSG}`、`Map.wz/Tile/grassySoil3`、`Npc.wz/9400794`。
> ASM 的完整评估与地图导入的依赖分析见 [asm-reference-assessment.md](asm-reference-assessment.md)
> ——结论是 **ASM 只做素材参考，不作为迁移基础**（语言分层冲突 + 会丢 Skill.wz 的 cooltime 数据）。

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

> **本表是批次 5 动手前的盘点，逐条查证后有多处不成立**（`CentipedeBattle` / `YaoSengBattle` BeiDou 已有更完整的实现，
> 克雷塞尔整条线卡在缺失的 wz 地图，`npc/1022101.js` 其实不在这 21 个里）。
> **最终去向以 §7 批次 5 为准**，下表只保留作为当时的判断记录。

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
