# 商城 `Etc.wz/Commodity.img` 的 SN 规则

> 调研日期 2026-08-20，基于 `port/lichking-mod` @ `cf4c73627`。
> 数据取自服务端实际加载的 `gms-server/wz-zh-CN/Etc.wz/Commodity.img.xml`（9,077 条）。

## 1. 一句话结论

SN **不是流水号，前 3 位是分类地址**。写错前 3 位 = 物品落到错误页签、或者哪个页签都不在（玩家看不见）。
后 5 位是该子页签内的自由序号，**允许跳号、允许留洞**。

## 2. 格式：`C SS NNNNN`（定长 8 位）

| 段 | 含义 | 来源 |
|---|---|---|
| 第 1 位 `C` | Category（一级页签） | `Etc.wz/Category.img` 的 `Category` |
| 第 2–3 位 `SS` | CategorySub（二级页签），左补零两位 | 同上的 `CategorySub` |
| 第 4–8 位 `NNNNN` | 子页签内序号，无语义 | 自由 |

代码里三处独立印证同一套切分：

- `CashShopService.getCommodityByCategory()` —— `prefix = id + String.format("%02d", subId)`，再 `String.valueOf(sn).startsWith(prefix)` 过滤
  （`gms-server/src/main/java/org/gms/service/CashShopService.java:57`）
- `CashShopService.getCommodityBySn()` —— 反向解析 `snStr.substring(0,1)` / `substring(1,3)` 拿回分类
  （同文件 `:99`）
- `World.addCashItemBought()` —— 热卖榜按 `snid / 10000000` 分桶
  （`gms-server/src/main/java/org/gms/net/server/world/World.java:1354`）

客户端用的是同一套算法，所以前 3 位必须命中 `Category.img` 里真实存在的组合。

## 3. 合法前缀全表（30 个）

| 前缀 | 页签 | 前缀 | 页签 | 前缀 | 页签 |
|---|---|---|---|---|---|
| `100` | 新品 New | `101` | 活动 Event | `200` | 帽子 Hat |
| `201` | 脸饰 Face | `202` | 眼饰 Eye | `203` | 套装 Overall |
| `204` | 上衣 Top | `205` | 裤裙 Bottom | `206` | 鞋子 Shoes |
| `207` | 手套 Glove | `208` | 武器 Weapon | `209` | 戒指 Ring |
| `210` | 高级会员 Premium | `211` | 披风 Cape | `300` | 卷轴 Scroll |
| `301` | 喇叭 Messenger | `302` | 天气 Weather | `500` | 美容院 Beauty Parlor |
| `501` | 商店 Store | `502` | 游戏 Game | `503` | 表情 Facial Expression |
| `504` | 结婚 Wedding | `505` | 特效 Effect | `506` | 角色 Character |
| `600` | 宠物 Pet | `601` | 宠物装备 Pet Equip. | `602` | 宠物消耗 Pet "Use" |
| `700` | 礼包 Package | `800` | 使用说明 | `801` | 赠送说明 |

`210`（高级会员）只存在于中文层：`wz-zh-CN` 比英文基础层 `wz` 多的 130 条里，有 128 条是 `210` 段。

## 4. 谁在消费 SN

| 角色 | 行为 |
|---|---|
| **客户端** | 读**自己的** `Data/Etc/Commodity.img` 画出整个商品列表。服务端不下发商品目录。 |
| **服务端** | 读 `wz-zh-CN/Etc.wz/Commodity.img.xml`（zh-CN 下整文件覆盖 `wz/`），只用于**校验购买**和查 SN→ItemId。 |
| **`modified_cash_item` 表** | 开商城时以 flag 位图下发覆盖项（`PacketCreator.openCashShop()` → `writeModifiedCashItem()`），改价/上下架/改数量走这里，**不用动 wz**。 |
| **热卖榜** | `openCashShop()` 里按 tab 1..8 各发 5 个 SN，来源是 `World.cashItemBought`。 |

推论：
- 客户端没有该 SN → 玩家看不见（服务端有也没用）
- 服务端没有该 SN → 点购买时 `Denied to sell cash item with SN`
- 两边 SN→ItemId 不一致 → 买到的东西和看到的不一样

## 5. SN 可以跳号，但节点名不行

最容易搞混的一点：**SN 跳号没问题，`<imgdir name="...">` 的节点名看起来必须连续。** 两者是独立的东西，
规则还相反。前者证据充分，后者见 §5.2 的保留意见。

### 5.1 SN 跳号（实测证据）

| 前缀 | 条数 | 序号范围 | 空洞数 |
|---|---|---|---|
| `600` 宠物 | 111 | 0..**1005** | **895** |
| `208` 武器 | 308 | 0..400 | 93 |
| `101` 活动 | 2401 | 0..2440 | 40 |
| `210` 高级会员 | 128 | **2**..129 | 0 |
| `503` 表情 | 24 | **2**..25 | 0 |

`600` 段那 895 个空洞是本仓库自己挖的：文件尾部追加了 6 条自定义宠物，SN 直接跳到
`60001000`–`60001005`（`OnSale=1`），跨过 Nexon 原有的 `0..104` 留了 900 号缓冲。
Nexon 自己的数据也不连续，`210` / `503` 甚至不从 0 开始。

### 5.2 节点名要连续，但这条结论还没完全坐实

**`<imgdir name="...">` 的节点名和 SN 是两回事**：节点名是独立索引，看上去**需要覆盖 `0..N-1`
不留空洞**——2026-08-20 实测中，删条目后不重编号会出问题。所以删完要把剩下的重新编号。

但这条结论有个未排除的干扰项，用之前先读 §12：**HaRepacker 导出 xml 时会自己重排节点名**，
所以那次实测到底测的是客户端还是 HaRepacker，没分辨清楚。

文件里的先后顺序应该不要紧：BeiDou 原件的名字集合是完整的 `0..N-1`，但排列并不严格递增
（尾部有几处倒序），客户端照样能正常读——说明它是按名字查而不是按文件顺序读。

> 本文档早期版本在这里写反了（说节点名可以留洞），已更正。

## 6. 硬约束

1. **必须 8 位，首位 1–8。**`SN >= 90000000` 会崩：
   `World.addCashItemBought()` 做 `cashItemBought.get(sn / 10000000)`，而 `cashItemBought`
   是 `new ArrayList<>(9)` 且只 `add` 了 9 个元素（`World.java:248`），索引 9 直接
   `IndexOutOfBoundsException`。现存 `92000000`–`92000020` 共 21 条全部 `OnSale=0` 才没触发，
   **不要在后台把它们上架**。
2. 前 3 位必须命中 §3 的表。
3. 全表唯一。
4. 客户端 / 服务端两边都要有，且 SN→ItemId 一致。
5. SN 不能为 0（`CashOperationHandler` 的愿望单分支显式拒绝 `sn == 0`）。
6. **节点名 `<imgdir name="N">` 应覆盖 `0..N-1` 不留空洞**，删条目后要重编号——但这条尚有保留意见，见 §5.2 与 §12。

## 7. 其它字段

| 字段 | 取值（zh-CN 层实际分布） | 说明 |
|---|---|---|
| `OnSale` | `0` × 6,991 / `1` × 2,086 | 是否上架 |
| `Gender` | `2` × 8,783（通用）/ `1` × 117 / `0` × 90 / `-1` × 5 | 购买性别限制 |
| `Class` | `0`–`4` | 角标（`CommodityFlag.CLASS` 注为「标签」） |
| `Priority` | `0`–`21+`，`9` 和 `7` 最多 | 排序权重；后台按降序排，每页 10 条 |
| `Period` | 天数，`0` 表示永久 | 加载时 `period == 0` 会被改写成 90（`CashShop.java:171`） |
| `PackageSN` | 仅礼包 | 成员 SN 列表在 `CashPackage.img`，共引用 974 个唯一 SN |

## 8. 实操建议

- **只改上架状态 / 价格 / 数量 / 有效期 → 不要动 wz。** 用 gms-ui 后台
  （`/cashShop/v1/onSale`），落到 `modified_cash_item` 表，开商城时覆盖下发。
  仓库里 6 张通用美容券就是这么做的：直接把已有 SN `50000229` 的 `ItemId`
  改指到 `5159000`，没有新增 SN（见 `docs/wz-client-sync-list.md`）。
  后台**只能改 wz 里已存在的 SN**，没有新增接口。
- **真要新增 SN**：照 `60001000` 的先例——选好目标页签的 3 位前缀，序号从
  `01000` 起（或该段现有最大值往上留几百）连续排，服务端改 `wz-zh-CN/`
  （zh-CN 下整文件覆盖，改 `wz/` 无效），客户端同步打进 `Data/Etc/Commodity.img`。
- **不要重排已有 SN**。会同时打断：`CashPackage.img` 的 974 个成员引用、
  `wishlists.sn`、`modified_cash_item.sn`、`GameConstants.CASH_DATA` 硬编码的
  5 个 SN（`50200004` / `50200069` / `50200117` / `50100008` / `50000047`），
  且必须重打客户端。

## 9. 数据盘点（zh-CN 层，2026-08-20）

> 快照取自当时的 `wz-zh-CN/Etc.wz/Commodity.img.xml`（9,077 条）。
> 之后该文件被重置成 BeiDou 原版（8,947 条），绝对数字会有出入，比例结论不变。

| 指标 | 值 |
|---|---|
| 条目总数 | 9,077 |
| 唯一 ItemId | 2,903 |
| 唯一 (ItemId, Count, Period) | 3,416 |
| 在售条目 | 2,086 |
| 在售覆盖的唯一 ItemId | 1,968 |
| 一条都没上架的 ItemId | 935 |
| 跨 ≥2 个前缀段重复挂牌的 ItemId | 2,335 |
| 只存在于 `100`/`101` 段的 ItemId | 83 |

## 10. 去重整理工具

`tools/CommodityTidy.java`——JDK 21 源码直跑，不需要 Maven、不需要 MySQL：

```bash
java tools/CommodityTidy.java            # dry-run，只出报告
java tools/CommodityTidy.java --apply    # 落盘改写 xml
```

报告写到 `tools/out/`（已 gitignore）：整理报告 markdown、逐条明细 CSV（含 `oldNode → newNode`
重编号对照，可反查任一条目的去向）、清理存量脏数据的 SQL。

**做什么**：按 `(ItemId, Count, 生效 Period)` 去重，同组只留一条；幸存条目按文件顺序把节点名
重编成 `0..N-1`；`CashPackage.img` 里指向已删 SN 的成员引用重指到同组幸存条目。
**不做什么**：不动任何 `OnSale`、不动任何字段值——保留条目的内容体逐字节原样。

内建校验，任一条不过就抛异常中止、绝不落盘：

1. 空改写自检（不做变更时重写结果必须与原文件逐字节一致）
2. 礼包内容不变（逐个礼包比对重指前后的 `(ItemId, Count, 生效 Period)` 多重集）
3. 可购买集合不变（既不许新增上架，也不许把在售的那条删掉）
4. 节点名恰好覆盖 `0..N-1`，无空洞无重复

> **它会改两个文件**：`Commodity.img.xml` 和 `CashPackage.img.xml`，必须同步编译进客户端。
> 想只动一个文件的话，需要给去重加一条「礼包成员 SN 一律保留」的规则——代价是多留约 900 条
> （9,077 → 约 4,289 而不是 3,390），换 `CashPackage.img.xml` 零改动。这条规则**尚未实现**。

## 11. 物品数据完整性（2026-08-20 核查）

商城条目的 `ItemId` 未必在 wz 里有对应物品数据。当时的 9,077 条挂牌覆盖 2,903 个 ItemId，
其中 **143 个查不到物品数据**，分两类：

| 类别 | 数量 | 成因 | 影响 |
|---|---|---|---|
| 有 `String.wz` 名字、无实体数据 | 130（全是装备） | 中文客户端专属物品。服务端只带英文基础层 `wz/Character.wz`（5,116 条），没有 `wz-zh-CN/Character.wz`，而 `wz-zh-CN/String.wz/Eqp.img` 有 17,105 条 | 客户端自带 `Data/` 能渲染；服务端 `getEquipStats()` 返回 `null`（`getEquipById` 有 null 保护，不崩），代价是买到手属性全为 0。其中 125 条本来就在售 |
| 名字和数据都没有 | 13（全是礼包） | `9101662`、`9101977`–`9101988` 在 `Item.wz/Special/0910.img` 里没有条目。431 个礼包里 418 个都有 | 客户端拿不到图标和名称。这 13 条本来就是下架状态，**不要上架** |

> 排查用的物品存在性索引照抄 `ItemInformationProvider.getItemData()` 的三条查找路径：
> `Item.wz` 的四位分组文件、`Item.wz` 的单文件（宠物）、`Character.wz` 的装备文件名。
> 注意 `Item.wz` 下的文件多是**单行无缩进 XML**，按缩进解析会一条都读不到，必须用真正的 XML 解析器。

两个连带发现：

1. **礼包的服务端物品数据查找本来就全部落空**。`Item.wz/Special/0910.img` 里礼包条目名是
   **7 位**（`9101000`），而 `ItemInformationProvider.getItemData()` 用 `"0" + itemId` 拼出的
   **8 位**串（`09101000`）去 `getChildByPath`，永远查不到。不影响功能——礼包走
   `CashItemFactory.isPackage()` 分支展开成员，从不经过 `toItem()`；礼包的名字和图标
   完全由客户端渲染。
2. **`String.wz` 里没有任何 `91xxxxx` 条目**，礼包名只存在于 `Item.wz/Special/0910.img`
   的 `<string name="name">`（且是未翻译的韩文，如 `일반 패키지`）。

### 11.1 礼包的两个坑

**坑一：`getName()` 对全部 431 个礼包都返回 null。**
`ItemInformationProvider.getStringData()` 里 `itemId >= 5010000` 一律去查 `String.wz/Cash.img`，
而 `String.wz` 两层都**没有任何 `91xxxxx` 条目**——礼包名只存在于
`Item.wz/Special/0910.img` / `0911.img` 的 `<string name="name">`（如 `9102152` = "Mini Yeti Package"）。
所以 gms-ui 后台的商城列表对礼包一律显示空白物品名——全部 431 个都这样，包括原本就在售的那 29 个。
客户端不受影响，它直接读 `Item.wz`。

**坑二：Nexon 只留了 29 个礼包在售**，其余 400 多个是下线的旧活动礼包。
任何「把没上架的都打开」的批量操作都会把它们全放出来，而后台又显示不出名字，事后很难逐个筛回去。
`CommodityTidy` 因此完全不动 `OnSale`。

### 11.2 `911xxxx` 不是礼包

`9110000`–`9114000` 是**背包/仓库格子扩充券**（Add Storage / Equip / Use / Set-up / ETC Slots），
挂在 `502`（游戏）段。它们前缀像礼包，但：

- `ItemId.isCashPackage()` 判据是 `itemId / 10000 == 910`，`911xxxx` 得 911，**不算礼包**
- `CashPackage.img` 里也没有它们的定义
- `ItemConstants.getInventoryType()` 对它们返回 `UNDEFINED`（`9110000 / 1000000 = 9`，不在 1..5）

它们由 `CashOperationHandler` 的**专用操作码**处理，不走普通购买流程：
`action == 0x06`（扩背包，`type = (itemId - 9110000) / 1000`）和 `action == 0x07`（扩仓库），
直接调 `chr.gainSlots()` / `chr.getStorage().gainSlots()` 加格子，从不生成物品实体。
功能完整，可以正常上架。

## 12. 未解决：去重后客户端崩溃（2026-08-20）

用 `tools/CommodityTidy.java` 把 9,077 条去重到 3,390 条、节点名重编为 `0..3389`，
用 HaRepacker 从 xml 整份编译出 `Commodity.img` 装进客户端后**客户端崩溃**。当时把
`Commodity.img.xml` 重置回 BeiDou 原版收尾，原因未定位。留档供下次接手。

### 已排除

- **增量 patch 的 ADD 合并语义**——不是。用的是 HaRepacker 整份重编，不走 `xml-img-patcher patch`。
- **行尾**——不是。纯 LF 的原件导出在客户端能用，说明 CRLF/LF 混用不影响。
- **内容被改坏**——不是。核对过：3,390 条保留条目的内容体与原件逐字节一致，
  `SN`/`ItemId`/`Count`/`Period`/`Price`/`Gender`/`OnSale` 一个字节没动，没有任何 SN 段被清空。
- **礼包成员断链**——工具内部校验过（悬空引用 0、内容多重集不变），但注意它**同时改了
  `CashPackage.img.xml`**（1,363 条成员 SN 重指）。**两个 img 必须同步编译**；只编 Commodity
  会让 864 个成员 SN 指向已删条目，服务端 `getPackage()` 走 `getItem(sn).toItem()` 没有 null
  检查，买礼包直接 NPE。这一条当时没确认是否同步编译过，**是首要嫌疑**。

### 未排除，下次从这里查

1. **HaRepacker 往返本身没做过对照实验。** 把**未经任何修改**的原件用 HaRepacker 编译成 img
   装进客户端跑一遍——这是整个排查的地基。如果连它都崩，问题在编译环节，跟去重无关。
2. **HaRepacker 导出 xml 时会自己重排节点名。** 观察到一份它导出的 `Commodity_all.img`：
   9,076 条、节点名完整覆盖 `0..9075`、但文件里的第一条叫 `580`——说明节点名由它重新分配，
   与文件顺序无关。**所以 §5.2 那次「节点必须从 0 递增」的实测，测的可能是 HaRepacker 而不是客户端**，
   我在 xml 里做的重编号也可能是多余甚至冲突的。
3. **HaRepacker 导出的根节点带额外属性**：`<imgdir name="Commodity.img" indent="2" media="NONE">`。
   工具最初的正则只认 `<imgdir name="x">`，碰上这种格式会**一条都解析不出来**（已修）。
   其它自制脚本要注意同一个坑。
4. **条目数大幅减少本身是否可接受**，没验证过。二分方法：先做一个「一条不删、只重编号」的版本
   （与原件只差几行），能用就说明问题出在删除／条目数；再做「只删 10 条」逐步加量找阈值。
5. **崩溃现象没有记录**——是启动就崩、进商城才崩、还是点某个页签才崩。下次先记这个，能大幅缩小范围。

### 备选路线

如果最终确认「删节点」这条路走不通，等效目标可以改走 `modified_cash_item` 表：
重复挂牌不删除、只下架，靠服务端开商城时下发 `OnSale=0` 覆盖包。代价是 xml 里仍躺着
5,000 多条死条目，好处是**完全不用改客户端**。见 §4 与 §8。
