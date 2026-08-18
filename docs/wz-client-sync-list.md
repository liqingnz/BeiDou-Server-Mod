# 客户端同步清单 —— 分支 `port/asm-wz` 全部 wz 改动

> 生成于 2026-08-18，覆盖 `master..HEAD` 的全部 42 个改动文件（另有 1,456 个纯新增）。
> 详细账本与坑见 [wz-client-sync.md](wz-client-sync.md)，判据见
> [lichkingmod-port.md](lichkingmod-port.md) §13、§14。

## 映射

| 服务端 | 客户端 |
|---|---|
| `wz/String.wz/*` | `EN/String/` |
| `wz-zh-CN/String.wz/*`、`wz-zh-CN/Quest.wz/*`、`wz-zh-CN/Etc.wz/*` | `Data/String/`、`Data/Quest/`、`Data/Etc/` |
| `wz/Item.wz/*`、`wz/Map.wz/*`、`wz/UI.wz/*` | `Data/Item/`、`Data/Map/`、`Data/UI/` |

---

## A. 不用动（1,456 个纯新增 + 12 个整文件取自 ASM）

**A1. 1,456 个纯新增文件**（`9e9e9ad34`）：Map 421 / Mob 331 / Npc 308 / Item 308 /
Reactor 51 / Morph 29 / Sound 6 / UI 1 / wz-zh-CN Etc 1。来源就是 ASM，
与你在用的 `BeiDou-Client-ASM` 同源，客户端本就有。

**A2. 内容与 ASM 原件完全一致的 24 个**——客户端直接用 ASM 的 `.img`，
不必从本仓库重编：

```
wz-zh-CN/Quest.wz/Say.img.xml
wz-zh-CN/String.wz/{Consume,Etc,Map,Mob,Npc,PetDialog,Skill,ToolTipHelp}.img.xml
wz/Item.wz/Consume/{0200,0202,0203,0204,0205,0207,0210,0229,0243,0245}.img.xml
wz/Item.wz/Etc/{0400,0403,0416,0422,0426,0431}.img.xml
wz/Item.wz/Install/0399.img.xml
wz/UI.wz/UIWindow.img.xml
```

---

## B. 必须用本仓库的 xml 重编（18 个）

这些是「ASM 版 + 我补的条目」或纯手工编辑，ASM 原件里没有这些内容。

### B1. 中文层 —— 编出 `.img` 放进客户端 `Data/`

| 文件 | 相对 ASM 多了什么 |
|---|---|
| `wz-zh-CN/Quest.wz/QuestInfo.img.xml` | +任务 `29580`，−自制任务链 `30000`–`30005` |
| `wz-zh-CN/Quest.wz/Act.img.xml` | 同上 |
| `wz-zh-CN/Quest.wz/Check.img.xml` | 同上 |
| `wz-zh-CN/Etc.wz/Commodity.img.xml` | 6 个商城 SN 改指向通用美容券（见下表） |
| `wz-zh-CN/String.wz/Cash.img.xml` | +8 条：`5159000`–`5159005`、`5211900`、`5360900` |
| `wz-zh-CN/String.wz/Eqp.img.xml` | +9 条：`1392000`、`1602000`–`1602007` |
| `wz-zh-CN/String.wz/Ins.img.xml` | +6 条：`3100000`、`3100001`、`3101000`–`3101003` |

商城改指向的 6 个 SN（`Period` 90→0、`OnSale`→1、去掉 7630 的乱码 `Limit`）：

| SN | 原 ItemId | 改为 | Price |
|---|---|---|---|
| 7730 | `5150001` | `5159000` 通用美发店高级会员卡 | 5700 |
| 7630 | `5150010` | `5159001` 通用美发店普通会员卡 | 2100 |
| 7548 | `5150010` | `5159002` 通用整形手术高级会员卡 | 5100 |
| 7604 | `5152000` | `5159003` 通用整形手术普通会员卡 | 2100 |
| 7687 | `5150032` | `5159004` 通用染色高级会员卡 | 4500 |
| 7719 | `5150033` | `5159005` 通用染色普通会员卡 | 2100 |

### B2. 英文基础层 —— 编出 `.img` 放进客户端 `EN/String/`

| 文件 | 内容 |
|---|---|
| `wz/String.wz/Cash.img.xml` | LK 移植道具的英文名（8 条） |
| `wz/String.wz/Etc.img.xml` | +`4031942` "Wrench" |
| `wz/String.wz/Ins.img.xml` | +6 条凭证英文名（`3100000` "Boss Certificate" 等） |

> 这三个**不能**用 ASM 的——ASM 的 `wz/String.wz` 内容是中文。

### B3. 道具与地图 —— 编出 `.img` 放进客户端 `Data/`

| 文件 | 内容 | 客户端现状 |
|---|---|---|
| `wz/Item.wz/Install/0301.img.xml` | ASM 版 + 补回 `03010071`「神兽椅」 | 需重编 |
| `wz/Item.wz/Cash/0515.img.xml` | ASM 版 + 补回 `05159000`–`05159005` 六张通用美容券 | 需重编 |
| `wz/Item.wz/Cash/0521.img.xml` | BeiDou 原版 + `05211900` 1.5 倍经验卡（**未取 ASM**，ASM 反而少这条） | 需重编 |
| `wz/Item.wz/Cash/0536.img.xml` | 同上 + `05360900` 1.5 倍爆率卡 | 需重编 |
| `wz/Map.wz/Map/Map2/240000000.img.xml` | 神木村：新增 life 槽 `23`，NPC `9100111` 扭蛋机 | 需重编 |

### B4. 新建文件（客户端已另行取得，无需动作）

| 文件 | 说明 |
|---|---|
| `wz/Item.wz/Install/0310.img.xml` | 6 个凭证道具。用户已另行取得 `0310.img` 二进制 |

---

## C. 已知待办

| 项 | 说明 |
|---|---|
| `Item.wz/Etc/0403` 的 `04033001` | 三方里只有 LK 有，客户端用的是 ASM 版故也缺，待从 LK 取 |
| `Sound.wz/{Bgm03,Bgm15,Mob}.img` | ASM 原件 XML 不合法（`<sound name="X"` 未闭合），已回退为 BeiDou 原版，本次不同步 |
| `Map.wz` 各图的入口 portal | 已知 `211040600`（狮子王之城）、`541020000` 缺入口，按实测逐张补，不整树覆盖 |

---

## 打补丁时的坑

1. **`patch` 的 ADD 是合并/追加，不是覆盖**——目标 `.img` 里已有同名子树时会产生重复节点。
   打之前一律 `--dry-run` 看变更类型。B 组这些多数是 MODIFY，客户端已有同名 `.img`。
2. `Item.wz` 条目 id 补零到 **8 位**（`04031942`），`Reactor.wz` 文件名补零到 **7 位**
   （`0002000.img.xml`）。用原始 id 去搜会漏。
3. Quest 改动要**完整重启进程**才生效——`Quest` 类把 `questInfo`/`questAct`/`questReq`
   存成 `static final`，`/server/restartServer` 与 `@clearquestcache` 都不重新读盘。
