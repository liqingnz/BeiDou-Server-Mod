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
| `NPCConversationManager` | ⏸ 挪批次 7（`doGachapon(quantity)` 要连同 4 个 gacha 脚本一起取舍） |
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
| **G7** | 远征次数配额 | `expeditions/{Expedition, ExpeditionType, ExpeditionBossLog}`、`world/PartyCharacter` | — |
| **G8** | 反外挂 / 误封 | `autoban/{AutobanManager, AutobanFactory}`、`AbstractDealDamageHandler`、`CloseRange`/`Magic`/`Ranged`/`Summon` 四个伤害 handler | — |
| **G9** | 技能平衡 | `MapleStatEffect`、`AranComboHandler`、`SpecialMoveHandler`、`gm2/BuffMapCommand`、`gm2/EmpowerMeCommand`、`constants/skills/Corsair`、`AssignAPProcessor` | `aran_combo_last_time`、`battleship_hp_factor` |
| **G10** | 等级上限 | `constants/game/GameConstants` | `max_level_cap`、`cygnus_max_level_cap` |
| **G11** | 自动喂药重复消耗 | `PetAutoPotHandler`、`PetAutopotProcessor` | — |
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
