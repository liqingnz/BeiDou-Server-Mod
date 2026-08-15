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
（`World` 确实没有 `setQuestRate`，那个缺口也就不用补了。）

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

批次 4 挪进来的两项（都依赖 Godly 系统的 `EQUIP_STAT_RANDOMIZE_RANGE`，
跟着 `client/inventory/Equip` 一起决策）：

| LK | 说明 |
|---|---|
| `gm4/ProEquipCommand` | BeiDou 已有 gm4 `ProItemCommand`，但语义不同：BeiDou 把全属性**设为**定值，LK 是在原属性上**加**值且原本为 0 的属性保持 0（保留装备特性）。要连同 Godly 一起取舍 |
| `gm4/DropProEquipCommand` | 与上一个互为 90% 复制，唯一区别是 `spawnItemDrop` 而非 `addFromDrop`。**移植时合并成一个带 drop 开关的指令**，不要两个类 |

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
