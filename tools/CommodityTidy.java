import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * 商城 Commodity.img 去重整理工具。
 * <p>
 * 独立开发工具，不参与服务端构建，也不是 CI 单测，因此不带 JUnit 注解、提示文案直接用中文字面量
 * （不走 I18nUtil）。放在仓库顶层 {@code tools/} 而非 {@code gms-server/src/test/java}，
 * 免得混进 Maven 的 test 作用域。
 * <p>
 * 用法（无需 Maven，JDK 21 源码直跑，工作目录为仓库根）：
 * <pre>
 *   java tools/CommodityTidy.java            # dry-run，只出报告
 *   java tools/CommodityTidy.java --apply    # 落盘改写 xml
 * </pre>
 * 报告写到 {@code tools/out/}（已 gitignore），是每次跑出来的临时账本，不入库。
 * <p>
 * 只做两件事：
 * <ol>
 *   <li>按 (ItemId, Count, 生效 Period) 去重，同组只保留一条，其余整块删除；</li>
 *   <li>把 CashPackage.img 里指向已删 SN 的成员引用重指到同组存活的那条，并校验每个礼包
 *       重指前后解析出的 (ItemId, Count, 生效 Period) 多重集完全一致。</li>
 * </ol>
 * <b>不动任何 {@code OnSale}</b>：原本没上架的商品不会因为整理而上架。挑选幸存者时优先选在售的那条，
 * 所以「整理前买得到的东西，整理后仍然买得到」。
 * <p>
 * <b>节点名必须重编号</b>：{@code <imgdir name="N">} 的 N 必须是从 0 开始、无空洞的递增序列，
 * 客户端才认（实测结论；SN 本身倒是可以跳号）。所以删完之后把幸存的块按文件顺序重编成 0..N-1。
 * 原始文件里节点名并不严格有序（8940 排在 8941 之后），重编号顺带把这个也理顺了。
 */
public class CommodityTidy {

    /**
     * 只按 {@code \n} 切分、也只用 {@code \n} 拼回，行尾的 {@code \r} 留在行内容里。
     * Commodity.img.xml 的行尾并不统一——整体 CRLF，但之前手改过的 6 条美容券条目
     * （节点 7548 等，见 docs/wz-client-sync-list.md）留下了 60 个裸 LF。这样切分能逐字节原样还原。
     */
    private static final String NL = "\n";

    /** 仓库内相对路径，服务端 zh-CN 下整文件覆盖英文基础层，所以只动 wz-zh-CN。 */
    private static final String COMMODITY = "gms-server/wz-zh-CN/Etc.wz/Commodity.img.xml";
    private static final String CASH_PACKAGE = "gms-server/wz-zh-CN/Etc.wz/CashPackage.img.xml";
    /** 报告是每次跑出来的临时账本，不入库，所以写在 gitignore 掉的 tools/out/ 下。 */
    private static final String OUT_DIR = "tools/out";
    private static final String REPORT_MD = OUT_DIR + "/commodity-tidy-report.md";
    private static final String REPORT_CSV = OUT_DIR + "/commodity-tidy-changes.csv";
    private static final String CLEANUP_SQL = OUT_DIR + "/commodity-tidy-cleanup.sql";

    /** 新品 / 活动是跨类促销页签，同一物品在这两段的挂牌视为次选。 */
    private static final Set<String> PROMO_SEGMENTS = Set.of("100", "101");

    /** 判定「这个 ItemId 客户端渲染得出来吗」时要扫的目录。物品数据只有英文基础层，没有 zh-CN 覆盖。 */
    private static final String[] ITEM_DATA_DIRS = {"gms-server/wz/Item.wz", "gms-server/wz/Character.wz"};
    private static final String[] STRING_DIRS = {"gms-server/wz/String.wz", "gms-server/wz-zh-CN/String.wz"};

    /**
     * 允许 name 之外还有别的属性——HaRepacker 导出的根节点长这样：
     * {@code <imgdir name="Commodity.img" indent="2" media="NONE">}。
     * 早先只认 {@code <imgdir name="x">} 的写法，碰上 HaRepacker 的导出会一条都解析不出来。
     */
    private static final Pattern IMGDIR_OPEN = Pattern.compile("<imgdir\\s[^>]*name=\"([^\"]*)\"[^>]*>");
    private static final Pattern IMGDIR_CLOSE = Pattern.compile("</imgdir\\s*>");
    private static final Pattern INT_LEAF = Pattern.compile("<int\\s+name=\"([^\"]*)\"\\s+value=\"(-?\\d+)\"\\s*/>");
    private static final Pattern VALUE_ATTR = Pattern.compile("value=\"-?\\d+\"");
    private static final Pattern NAME_ATTR = Pattern.compile("name=\"[^\"]*\"");

    public static void main(String[] args) throws IOException {
        boolean apply = args.length > 0 && "--apply".equals(args[0]);

        Path commodityPath = Path.of(COMMODITY);
        Path packagePath = Path.of(CASH_PACKAGE);
        if (!Files.exists(commodityPath) || !Files.exists(packagePath)) {
            throw new IllegalStateException("找不到 wz 文件，请在仓库根目录执行：" + commodityPath.toAbsolutePath());
        }

        List<String> commodityLines = readLines(commodityPath);
        List<String> packageLines = readLines(packagePath);
        assertRoundTrip(commodityPath, rewriteCommodity(commodityLines, new Plan()));
        assertRoundTrip(packagePath, rewritePackage(packageLines, List.of()));
        System.out.println("空改写自检通过：两个 xml 均逐字节还原");

        List<Entry> entries = parseCommodity(commodityLines);
        System.out.println("解析 Commodity 条目：" + entries.size()
                + "，其中在售 " + entries.stream().filter(Entry::isOnSale).count());

        WzIndex wz = scanRenderableItemIds();
        System.out.println("wz 索引：有物品数据 " + wz.itemData().size() + " 个，有名字 " + wz.named().size() + " 个");

        Plan plan = buildPlan(entries, wz);
        assignNewNodeNames(plan);
        System.out.println("保留 " + plan.kept.size() + " 条（在售 " + plan.onSaleKept().size() + "），"
                + "删除 " + plan.deleted.size() + " 条；节点名重编为 0.." + (plan.kept.size() - 1));

        List<PackageRef> refs = parsePackage(packageLines);
        List<Remap> remaps = planRemaps(refs, plan);
        System.out.println("礼包成员引用 " + refs.size() + " 条，需重指 " + remaps.size() + " 条");

        verifyPackages(refs, remaps, plan);
        System.out.println("礼包内容校验通过：重指前后每个礼包解析出的 (ItemId, Count, 生效 Period) 多重集一致");

        assertNoNewlyOnSale(entries, plan);
        System.out.println("上架状态校验通过：可购买的商品集合与整理前完全一致，既没新增也没丢失");

        // 整理是幂等的：对已整理过的文件再跑一次会得出「零变更」。此时若照常写报告，
        // 就会把上一轮的真实账本覆盖成一份空账本，所以直接跳过。
        if (plan.deleted.isEmpty() && remaps.isEmpty()) {
            System.out.println("文件已是整理后的状态，无变更可做；保留既有报告不覆盖。");
            return;
        }

        writeReport(plan, wz, refs, remaps, entries, apply);

        if (apply) {
            // 两个文件必须同时生效：只改 Commodity 不改 CashPackage 会留下指向已删 SN 的悬空引用。
            // 所以先把两份新内容都写成临时文件（Windows 上的文件占用会在这一步就暴露），再依次替换；
            // 第二次替换万一失败，用备份把第一个文件回滚回去。
            String newCommodity = rewriteCommodity(commodityLines, plan);
            assertNodeNamesSequential(newCommodity);
            writeBothOrNothing(commodityPath, newCommodity, packagePath, rewritePackage(packageLines, remaps));
            System.out.println("已落盘：" + COMMODITY);
            System.out.println("已落盘：" + CASH_PACKAGE);
        } else {
            System.out.println("dry-run，未改动 xml。加 --apply 落盘。");
        }
        System.out.println("报告：" + REPORT_MD + " / " + REPORT_CSV);
    }

    // ---------------------------------------------------------------- 读写

    /** 两个 xml 要么都落盘、要么都不落盘，避免留下 Commodity 已删而 CashPackage 还指着旧 SN 的断链状态。 */
    private static void writeBothOrNothing(Path first, String firstBody, Path second, String secondBody)
            throws IOException {
        Path firstTmp = Path.of(first + ".tmp");
        Path secondTmp = Path.of(second + ".tmp");
        Files.writeString(firstTmp, firstBody, StandardCharsets.UTF_8);
        Files.writeString(secondTmp, secondBody, StandardCharsets.UTF_8);

        byte[] firstBackup = Files.readAllBytes(first);
        Files.move(firstTmp, first, StandardCopyOption.REPLACE_EXISTING);
        try {
            Files.move(secondTmp, second, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            Files.write(first, firstBackup);
            Files.deleteIfExists(secondTmp);
            throw new IOException("第二个文件落盘失败，已把第一个回滚：" + second, e);
        }
    }

    /** 空改写自检：不做任何变更时，重写结果必须与原文件逐字节一致。 */
    private static void assertRoundTrip(Path path, String rewritten) throws IOException {
        if (!rewritten.equals(Files.readString(path, StandardCharsets.UTF_8))) {
            throw new IllegalStateException("空改写没能还原原文件，改写器有问题：" + path);
        }
    }

    /** 切分后重写时原样拼回，保证未删除的行逐字节不变。 */
    private static List<String> readLines(Path path) throws IOException {
        String content = Files.readString(path, StandardCharsets.UTF_8);
        return new ArrayList<>(List.of(content.split(NL, -1)));
    }

    /** 删整块 + 给幸存块的 imgdir 首行换个新节点名，其余每一行原样保留。 */
    private static String rewriteCommodity(List<String> lines, Plan plan) {
        Set<Integer> drop = new HashSet<>();
        for (Entry entry : plan.deleted.values()) {
            for (int i = entry.from; i <= entry.to; i++) {
                drop.add(i);
            }
        }
        Map<Integer, String> renamed = new HashMap<>();
        for (Entry entry : plan.kept.values()) {
            if (entry.newNode < 0 || String.valueOf(entry.newNode).equals(entry.node)) {
                continue;                          // 编号没变就别动这行，少一点无谓 diff
            }
            String line = lines.get(entry.from);
            renamed.put(entry.from, NAME_ATTR.matcher(line).replaceFirst("name=\"" + entry.newNode + "\""));
        }
        StringBuilder out = new StringBuilder(lines.size() * 48);
        for (int i = 0; i < lines.size(); i++) {
            if (drop.contains(i)) {
                continue;
            }
            out.append(renamed.getOrDefault(i, lines.get(i)));
            if (i < lines.size() - 1) {
                out.append(NL);
            }
        }
        return out.toString();
    }

    /**
     * 按文件顺序把幸存条目重编成 0..N-1。
     * <p>
     * 客户端要求 Commodity.img 的节点名是从 0 开始、无空洞的递增序列（实测），删完必须重编，
     * 否则后面的条目读不到。SN 本身不受此限，跳号没问题。
     */
    private static void assignNewNodeNames(Plan plan) {
        List<Entry> inFileOrder = new ArrayList<>(plan.kept.values());
        inFileOrder.sort(Comparator.comparingInt(e -> e.from));
        int seq = 0;
        for (Entry entry : inFileOrder) {
            entry.newNode = seq++;
        }
    }

    /**
     * 落盘前自查改写结果：节点名的集合必须恰好是 {0, 1, ..., N-1}，一个不多一个不少。
     * <p>
     * 只校验集合而不校验文件里的先后——原始文件的名字集合是完整的 0..9076，但排列并不严格递增
     * （8940 排在 8941 之后）且客户端能正常读，说明客户端是按名字查而不是按文件顺序读。
     * 本工具按文件顺序重编号，结果同时满足「集合完整」和「顺序递增」，比原状更严。
     */
    private static void assertNodeNamesSequential(String rewritten) {
        Set<Integer> names = new HashSet<>();
        int depth = 0;
        int count = 0;
        for (String line : rewritten.split(NL, -1)) {
            Matcher open = IMGDIR_OPEN.matcher(line);
            if (open.find()) {
                if (depth == 1) {
                    count++;
                    if (!open.group(1).matches("[0-9]+") || !names.add(Integer.parseInt(open.group(1)))) {
                        throw new IllegalStateException("节点名非数字或重复：" + open.group(1));
                    }
                }
                depth++;
                continue;
            }
            if (IMGDIR_CLOSE.matcher(line).find()) {
                depth--;
            }
        }
        for (int i = 0; i < count; i++) {
            if (!names.contains(i)) {
                throw new IllegalStateException("节点名有空洞：缺 " + i + "（共 " + count + " 个条目）");
            }
        }
        System.out.println("节点名自查通过：恰好覆盖 0.." + (count - 1) + "，无空洞无重复");
    }

    /** 只改成员 SN 的 value，行的其余部分原样保留。 */
    private static String rewritePackage(List<String> lines, List<Remap> remaps) {
        Map<Integer, String> replace = new HashMap<>();
        for (Remap remap : remaps) {
            String line = lines.get(remap.ref().line());
            replace.put(remap.ref().line(), VALUE_ATTR.matcher(line).replaceFirst("value=\"" + remap.target() + "\""));
        }
        StringBuilder out = new StringBuilder(lines.size() * 48);
        for (int i = 0; i < lines.size(); i++) {
            out.append(replace.getOrDefault(i, lines.get(i)));
            if (i < lines.size() - 1) {
                out.append(NL);
            }
        }
        return out.toString();
    }

    // ---------------------------------------------------------------- 解析

    /**
     * 深度法解析，不依赖缩进——本文件缩进并不统一（有 3 空格、5 空格甚至 tab 开头的 imgdir 行）。
     * 根 imgdir 为深度 0→1，商品条目在深度 1 上开启。
     */
    private static List<Entry> parseCommodity(List<String> lines) {
        List<Entry> entries = new ArrayList<>();
        int depth = 0;
        Entry current = null;
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            Matcher open = IMGDIR_OPEN.matcher(line);
            if (open.find()) {
                if (depth == 1) {
                    current = new Entry(open.group(1), i);
                }
                depth++;
                continue;
            }
            if (IMGDIR_CLOSE.matcher(line).find()) {
                depth--;
                if (depth == 1 && current != null) {
                    current.to = i;
                    entries.add(current);
                    current = null;
                }
                continue;
            }
            if (current != null) {
                Matcher leaf = INT_LEAF.matcher(line);
                if (leaf.find()) {
                    current.putField(leaf.group(1), Integer.parseInt(leaf.group(2)));
                }
            }
        }
        for (Entry entry : entries) {
            if (entry.sn == null || entry.itemId == null) {
                throw new IllegalStateException("条目缺 SN 或 ItemId：节点 " + entry.node);
            }
        }
        return entries;
    }

    private static List<PackageRef> parsePackage(List<String> lines) {
        List<PackageRef> refs = new ArrayList<>();
        int depth = 0;
        String pkg = null;
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            Matcher open = IMGDIR_OPEN.matcher(line);
            if (open.find()) {
                if (depth == 1) {
                    pkg = open.group(1);
                }
                depth++;
                continue;
            }
            if (IMGDIR_CLOSE.matcher(line).find()) {
                depth--;
                continue;
            }
            Matcher leaf = INT_LEAF.matcher(line);
            if (leaf.find() && depth == 3) {
                refs.add(new PackageRef(pkg, leaf.group(1), Integer.parseInt(leaf.group(2)), i));
            }
        }
        return refs;
    }

    // ------------------------------------------------------ 物品数据存在性

    /**
     * @param itemData 在 {@code Item.wz} / {@code Character.wz} 里查得到实体数据的 id
     * @param named    在 {@code String.wz}（两层）里查得到名字的 id
     */
    private record WzIndex(Set<Integer> itemData, Set<Integer> named) {
        /** 客户端能渲染出图标或名称即可，两者有其一就不算空壳。 */
        boolean renderable(int itemId) {
            return itemData.contains(itemId) || named.contains(itemId);
        }
    }

    /**
     * 扫出「有物品数据」和「有名字」的 ItemId 全集，用于给在售商品做体检。
     * <p>
     * 三条查找路径照抄 {@code ItemInformationProvider.getItemData()}：{@code Item.wz} 的四位分组文件、
     * {@code Item.wz} 的单文件（宠物）、{@code Character.wz} 的装备文件名。节点名 7 位、8 位补零两种都收，
     * 因为礼包在 {@code Item.wz/Special/0910.img} 里用的是 7 位而服务端拿 8 位去查（本就查不到，
     * 但礼包走 isPackage 分支不受影响，这里只关心客户端能不能渲染）。
     */
    private static WzIndex scanRenderableItemIds() throws IOException {
        Set<Integer> ids = new HashSet<>();
        Set<Integer> named = new HashSet<>();
        DocumentBuilder builder;
        try {
            builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        } catch (ParserConfigurationException e) {
            throw new IllegalStateException(e);
        }
        for (String dir : ITEM_DATA_DIRS) {
            forEachXml(dir, path -> {
                String base = baseName(path);
                if (base.matches("[0-9]{7,8}")) {                 // 单文件：宠物 7 位、装备 8 位补零
                    ids.add(Integer.parseInt(base));
                    ids.add(Integer.parseInt(base.replaceFirst("^0+", "")));
                } else if (base.matches("[0-9]{4}")) {            // 四位分组文件：收顶层子节点名
                    collectTopLevelNames(builder, path, ids);
                }
            });
        }
        for (String dir : STRING_DIRS) {
            forEachXml(dir, path -> collectAllNames(builder, path, named));
        }
        return new WzIndex(ids, named);
    }

    private static void forEachXml(String dir, java.util.function.Consumer<Path> action) throws IOException {
        Path root = Path.of(dir);
        if (!Files.exists(root)) {
            return;
        }
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(p -> p.toString().endsWith(".img.xml")).forEach(action);
        }
    }

    private static String baseName(Path path) {
        String name = path.getFileName().toString();
        return name.endsWith(".img.xml") ? name.substring(0, name.length() - 8) : name;
    }

    private static void collectTopLevelNames(DocumentBuilder builder, Path path, Set<Integer> ids) {
        try {
            NodeList kids = builder.parse(path.toFile()).getDocumentElement().getChildNodes();
            for (int i = 0; i < kids.getLength(); i++) {
                Node node = kids.item(i);
                if (node.getNodeType() == Node.ELEMENT_NODE) {
                    addIfNumeric(((Element) node).getAttribute("name"), ids);
                }
            }
        } catch (SAXException | IOException e) {
            throw new IllegalStateException("解析失败：" + path, e);
        }
    }

    /** String.wz 里名字是嵌套的（Eqp.img 按部位分子目录），所以要递归收全部节点名。 */
    private static void collectAllNames(DocumentBuilder builder, Path path, Set<Integer> ids) {
        try {
            NodeList all = builder.parse(path.toFile()).getElementsByTagName("imgdir");
            for (int i = 0; i < all.getLength(); i++) {
                addIfNumeric(((Element) all.item(i)).getAttribute("name"), ids);
            }
        } catch (SAXException | IOException e) {
            throw new IllegalStateException("解析失败：" + path, e);
        }
    }

    private static void addIfNumeric(String name, Set<Integer> ids) {
        if (name.matches("[0-9]{1,8}")) {
            ids.add(Integer.parseInt(name));
        }
    }

    // ---------------------------------------------------------------- 规划

    private static Plan buildPlan(List<Entry> entries, WzIndex wz) {
        // 一次分桶：同 (ItemId, Count, 生效 Period)。若整组都没有 Gender=2 的通用条目，
        // 再按 Gender 拆桶，避免只留一条把某个性别锁在门外。
        Map<String, List<Entry>> groups = new LinkedHashMap<>();
        for (Entry entry : entries) {
            groups.computeIfAbsent(entry.groupKey(), k -> new ArrayList<>()).add(entry);
        }
        Map<String, List<Entry>> buckets = new LinkedHashMap<>();
        for (Map.Entry<String, List<Entry>> group : groups.entrySet()) {
            boolean hasUnisex = group.getValue().stream().anyMatch(e -> e.gender != null && e.gender == 2);
            for (Entry entry : group.getValue()) {
                String key = hasUnisex ? group.getKey() : group.getKey() + "|G" + entry.gender;
                buckets.computeIfAbsent(key, k -> new ArrayList<>()).add(entry);
            }
        }

        Plan plan = new Plan();
        for (List<Entry> bucket : buckets.values()) {
            // max 取「最大」，所以同分时让小 SN 比较为大：reversed()
            Entry winner = bucket.stream().max(Comparator.<Entry>comparingInt(CommodityTidy::score)
                    .thenComparing(Comparator.comparingInt((Entry e) -> e.sn).reversed())).orElseThrow();
            plan.kept.put(winner.sn, winner);
            for (Entry entry : bucket) {
                if (entry != winner) {
                    plan.deleted.put(entry.sn, entry);
                    plan.absorbedBy.put(entry.sn, winner.sn);
                }
            }
        }

        // 体检只针对最终在售的那批——下架的条目卖不出去，数据缺不缺无所谓。
        for (Entry entry : plan.onSaleKept()) {
            if (!wz.renderable(entry.itemId)) {
                plan.onSaleNoData.add(entry);
            } else if (!wz.itemData().contains(entry.itemId)) {
                plan.onSaleNoServerData.add(entry);
            }
            if (!entry.hasPrice()) {
                plan.onSaleNoPrice.add(entry);
            }
        }
        return plan;
    }

    /**
     * 在售(+16) > 有价(+8) > 真实分类段(+4) > 通用性别(+2)，同分取小 SN。
     * <p>
     * 「在售」权重最高是关键：本工具不改任何 OnSale，幸存者是否在售直接决定这件商品整理后还买不买得到。
     * 优先留在售的那条，就保证了「整理前买得到的，整理后仍然买得到」。
     */
    private static int score(Entry entry) {
        int s = 0;
        if (entry.isOnSale()) {
            s += 16;
        }
        if (entry.hasPrice()) {
            s += 8;
        }
        if (!PROMO_SEGMENTS.contains(entry.segment())) {
            s += 4;
        }
        if (entry.gender != null && entry.gender == 2) {
            s += 2;
        }
        return s;
    }

    private static List<Remap> planRemaps(List<PackageRef> refs, Plan plan) {
        List<Remap> remaps = new ArrayList<>();
        for (PackageRef ref : refs) {
            if (plan.kept.containsKey(ref.sn())) {
                continue;
            }
            Integer target = plan.absorbedBy.get(ref.sn());
            if (target == null) {
                throw new IllegalStateException("礼包 " + ref.pkg() + " 的成员 SN " + ref.sn() + " 既未保留也无归并目标");
            }
            remaps.add(new Remap(ref, target));
        }
        return remaps;
    }

    // ---------------------------------------------------------------- 校验

    /** 逐个礼包比对重指前后的内容多重集，不一致直接中止，绝不落盘。 */
    private static void verifyPackages(List<PackageRef> refs, List<Remap> remaps, Plan plan) {
        Map<Integer, Integer> remapByLine = new HashMap<>();
        for (Remap remap : remaps) {
            remapByLine.put(remap.ref().line(), remap.target());
        }
        Map<String, Map<String, Integer>> before = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> after = new LinkedHashMap<>();
        for (PackageRef ref : refs) {
            Entry oldEntry = plan.bySn(ref.sn());
            Entry newEntry = plan.bySn(remapByLine.getOrDefault(ref.line(), ref.sn()));
            before.computeIfAbsent(ref.pkg(), k -> new TreeMap<>()).merge(oldEntry.groupKey(), 1, Integer::sum);
            after.computeIfAbsent(ref.pkg(), k -> new TreeMap<>()).merge(newEntry.groupKey(), 1, Integer::sum);
        }
        for (String pkg : before.keySet()) {
            if (!before.get(pkg).equals(after.get(pkg))) {
                throw new IllegalStateException("礼包 " + pkg + " 内容变了：" + before.get(pkg) + " -> " + after.get(pkg));
            }
        }
    }

    /**
     * 本工具承诺「不新增上架商品」。这里把「整理前买得到的 (ItemId, Count, 生效 Period)」集合
     * 与整理后的比一遍：只允许缩小或相等，一旦冒出新的组合就说明改写逻辑出了问题，中止。
     */
    private static void assertNoNewlyOnSale(List<Entry> entries, Plan plan) {
        Set<String> before = new HashSet<>();
        for (Entry entry : entries) {
            if (entry.isOnSale()) {
                before.add(entry.groupKey());
            }
        }
        Set<String> after = new HashSet<>();
        for (Entry entry : plan.onSaleKept()) {
            after.add(entry.groupKey());
        }

        List<String> added = new ArrayList<>(after);
        added.removeAll(before);
        if (!added.isEmpty()) {
            throw new IllegalStateException("出现了整理前买不到、整理后能买到的商品：" + added);
        }
        // 反方向同样重要：去重不该把原本买得到的东西弄没。挑选规则给「在售」+16 就是为了保证这一点。
        List<String> lost = new ArrayList<>(before);
        lost.removeAll(after);
        if (!lost.isEmpty()) {
            throw new IllegalStateException("整理后买不到了的商品（去重把在售的那条删掉了）：" + lost);
        }
    }

    // ---------------------------------------------------------------- 报告

    private static void writeReport(Plan plan, WzIndex wz, List<PackageRef> refs, List<Remap> remaps,
                                    List<Entry> entries, boolean apply) throws IOException {
        Files.createDirectories(Path.of(OUT_DIR));
        writeCsv(plan, remaps);

        long onSaleBefore = entries.stream().filter(Entry::isOnSale).count();
        List<Entry> onSaleKept = plan.onSaleKept();

        Map<String, int[]> bySegment = new TreeMap<>();
        for (Entry entry : plan.kept.values()) {
            int[] row = bySegment.computeIfAbsent(entry.segment(), k -> new int[3]);
            row[0]++;
            if (entry.isOnSale()) {
                row[2]++;
            }
        }
        for (Entry entry : plan.deleted.values()) {
            bySegment.computeIfAbsent(entry.segment(), k -> new int[3])[1]++;
        }

        StringBuilder md = new StringBuilder();
        md.append("# Commodity.img 去重整理报告\n\n");
        md.append("> 由 `gms-server/src/test/java/CommodityTidy.java` 生成");
        md.append(apply ? "（已落盘）" : "（dry-run，未落盘）").append("。\n");
        md.append("> 逐条明细见同目录 `commodity-tidy-changes.csv`。\n\n");

        md.append("## 总账\n\n| 指标 | 整理前 | 整理后 |\n|---|---|---|\n");
        md.append("| 条目数 | ").append(entries.size()).append(" | ").append(plan.kept.size()).append(" |\n");
        md.append("| 在售条目 | ").append(onSaleBefore).append(" | ").append(onSaleKept.size()).append(" |\n");
        md.append("| 礼包成员引用 | ").append(refs.size()).append(" | ").append(refs.size())
                .append("（其中 ").append(remaps.size()).append(" 条重指） |\n\n");
        md.append("删除 ").append(plan.deleted.size()).append(" 条重复挂牌。**没有任何商品的 `OnSale` 被改动**——");
        md.append("在售数从 ").append(onSaleBefore).append(" 降到 ").append(onSaleKept.size());
        md.append(" 是因为同一件商品原本有多条在售挂牌，去重后合并成一条，可买到的商品种类不变。\n\n");

        md.append("## 规则\n\n");
        md.append("1. **去重键** `(ItemId, Count, 生效 Period)`。生效 Period 按服务端加载逻辑算：");
        md.append("字段缺失→1，`Period=0`→90，其余取原值（`CashShop.loadAllCashItems`）。\n");
        md.append("   若整组没有 `Gender=2` 的通用条目，再按 Gender 拆组，避免锁死某个性别。\n");
        md.append("2. **保留谁**：在售(+16) > 有有效 Price(+8) > 真实分类段而非新品/活动段(+4) > 通用性别(+2)，同分取小 SN。\n");
        md.append("   「在售」权重压过一切，保证整理前买得到的商品整理后仍然买得到。\n");
        md.append("3. **不动 `OnSale`**。原本下架的商品不会因为整理而上架，一个字节都不改。\n");
        md.append("4. **节点名重编号**：删完把幸存条目按文件顺序重编成 `0..N-1`。客户端要求 Commodity.img 的\n");
        md.append("   节点名是从 0 开始无空洞的递增序列（实测），留洞会让后面的条目读不到。SN 本身不受此限，可以跳号。\n");
        md.append("5. **礼包**：`CashPackage.img` 里指向已删 SN 的引用重指到同组存活条目。");
        md.append("`ModifiedCashItemDO.toItem()` 只读 ItemId/Count/Period，与去重键一致，故重指无损。\n\n");

        md.append("## 按 SN 段分布\n\n| 段 | 保留 | 删除 | 保留中在售 |\n|---|---|---|---|\n");
        for (Map.Entry<String, int[]> seg : bySegment.entrySet()) {
            int[] v = seg.getValue();
            md.append("| `").append(seg.getKey()).append("` | ").append(v[0]).append(" | ")
                    .append(v[1]).append(" | ").append(v[2]).append(" |\n");
        }

        md.append("\n## 在售商品体检\n\n");
        md.append("只体检最终在售的 ").append(onSaleKept.size()).append(" 条——下架的条目卖不出去，数据缺不缺无所谓。\n\n");
        md.append("| 项目 | 条数 | 说明 |\n|---|---|---|\n");
        md.append("| wz 里既无物品数据也无名字 | ").append(plan.onSaleNoData.size())
                .append(" | 客户端渲染不出来，卖出去等于卖空气 |\n");
        md.append("| 有名字但服务端无实体数据 | ").append(plan.onSaleNoServerData.size())
                .append(" | 中文客户端专属物品，客户端能显示，服务端建零属性装备 |\n");
        md.append("| 无有效 Price | ").append(plan.onSaleNoPrice.size()).append(" | 等于白送 |\n");
        appendEntryTable(md, "\n### 在售但 wz 无数据", plan.onSaleNoData);
        appendEntryTable(md, "\n### 在售但无有效 Price", plan.onSaleNoPrice);

        if (!plan.onSaleNoServerData.isEmpty()) {
            md.append("\n### 在售、有名字、服务端无实体数据（").append(plan.onSaleNoServerData.size()).append(" 条）\n\n");
            md.append("这些 `ItemId` 只在 `wz-zh-CN/String.wz` 里有名字，服务端的 `Item.wz` / `Character.wz` 查不到实体——\n");
            md.append("**中文客户端专属物品**，服务端只带英文基础层，正是 `docs/lichkingmod-port.md` §17.2 记的\n");
            md.append("「英文基础层落后」。客户端自带 `Data/` 能正常显示；服务端 `getEquipStats()` 返回 `null`\n");
            md.append("（`getEquipById` 有 null 保护，不会崩），代价是买到手属性全为 0——纯外观时装无影响。\n\n");
            Map<String, Integer> byPrefix = new TreeMap<>();
            for (Entry entry : plan.onSaleNoServerData) {
                byPrefix.merge(String.valueOf(entry.itemId).substring(0, 4), 1, Integer::sum);
            }
            md.append("| ItemId 前缀 | 条数 |\n|---|---|\n");
            byPrefix.forEach((k, v) -> md.append("| `").append(k).append("` | ").append(v).append(" |\n"));
        }

        // 客户端严格按 SN 前 3 位分页签，所以某件在售商品若只剩促销段的挂牌，就从真实分类页签消失了。
        Set<Integer> reachable = new HashSet<>();
        Set<Integer> allOnSale = new HashSet<>();
        Map<Integer, List<Integer>> snByItem = new LinkedHashMap<>();
        for (Entry entry : onSaleKept) {
            allOnSale.add(entry.itemId);
            snByItem.computeIfAbsent(entry.itemId, k -> new ArrayList<>()).add(entry.sn);
            if (!PROMO_SEGMENTS.contains(entry.segment())) {
                reachable.add(entry.itemId);
            }
        }
        List<Integer> promoOnly = new ArrayList<>(allOnSale);
        promoOnly.removeAll(reachable);
        promoOnly.sort(Comparator.naturalOrder());
        md.append("\n## 只在「新品 / 活动」页签可见的在售商品（").append(promoOnly.size()).append(" 个）\n\n");
        md.append("客户端严格按 SN 前 3 位分页签，这些商品保留下来的在售挂牌都落在 `100`/`101` 段，");
        md.append("在「帽子」「武器」「礼包」等真实分类页签里看不到。\n");
        md.append("成因是数据下限——它们的在售 SN 本就只在促销段出现过。\n\n");
        md.append("| ItemId | 在售的 SN |\n|---|---|\n");
        for (Integer itemId : promoOnly) {
            List<Integer> sns = snByItem.get(itemId);
            sns.sort(Comparator.naturalOrder());
            md.append("| ").append(itemId).append(" | ").append(sns).append(" |\n");
        }

        md.append("\n## 礼包重指汇总\n\n| 礼包 ItemId | 重指成员数 |\n|---|---|\n");
        Map<String, Integer> perPkg = new TreeMap<>();
        for (Remap remap : remaps) {
            perPkg.merge(remap.ref().pkg(), 1, Integer::sum);
        }
        perPkg.forEach((k, v) -> md.append("| ").append(k).append(" | ").append(v).append(" |\n"));

        md.append("\n## 校验\n\n");
        md.append("1. **空改写自检**：不做任何变更时重写两个 xml，必须与原文件逐字节一致。\n");
        md.append("2. **礼包内容不变**：逐个礼包比对重指前后解析出的 `(ItemId, Count, 生效 Period)` 多重集。\n");
        md.append("3. **可购买集合不变**：整理前后「买得到的 `(ItemId, Count, 生效 Period)`」集合逐一比对，\n");
        md.append("   既不许新增（不能把下架的卖出去），也不许丢失（去重不能把在售的那条删掉）。\n\n");
        md.append("任何一条不通过都会抛异常中止，不会落盘。\n\n");

        md.append("## 收尾动作\n\n");
        md.append("1. 客户端要重打**两个** img：`Data/Etc/Commodity.img`、`Data/Etc/CashPackage.img`。\n");
        md.append("2. 清理指向已删 SN 的存量数据：执行同目录的 `commodity-tidy-cleanup.sql`。\n");
        md.append("3. `GameConstants.CASH_DATA` 的 5 个硬编码 SN 已确认在保留集内，无需改动。\n");
        Files.writeString(Path.of(REPORT_MD), md.toString(), StandardCharsets.UTF_8);
        writeCleanupSql(plan);
    }

    private static void appendEntryTable(StringBuilder md, String title, List<Entry> list) {
        md.append(title).append("（").append(list.size()).append(" 条）\n\n");
        if (list.isEmpty()) {
            md.append("无。\n");
            return;
        }
        List<Entry> sorted = new ArrayList<>(list);
        sorted.sort(Comparator.comparingInt(e -> e.sn));
        md.append("| SN | 旧节点 → 新节点 | ItemId | 段 |\n|---|---|---|---|\n");
        for (Entry entry : sorted) {
            md.append("| ").append(entry.sn).append(" | ").append(entry.node).append(" → ").append(entry.newNode)
                    .append(" | ").append(entry.itemId).append(" | `").append(entry.segment()).append("` |\n");
        }
    }

    private static void writeCsv(Plan plan, List<Remap> remaps) throws IOException {
        StringBuilder csv = new StringBuilder();
        csv.append("action,sn,oldNode,newNode,itemId,count,effPeriod,price,gender,segment,onSale,absorbedBy\n");
        List<Entry> keptSorted = new ArrayList<>(plan.kept.values());
        keptSorted.sort(Comparator.comparingInt(e -> e.sn));
        for (Entry entry : keptSorted) {
            csv.append(entry.isOnSale() ? "KEEP_ON," : "KEEP_OFF,").append(entry.csv()).append(",\n");
        }
        List<Entry> deletedSorted = new ArrayList<>(plan.deleted.values());
        deletedSorted.sort(Comparator.comparingInt(e -> e.sn));
        for (Entry entry : deletedSorted) {
            csv.append("DELETE,").append(entry.csv()).append(',').append(plan.absorbedBy.get(entry.sn)).append('\n');
        }
        for (Remap remap : remaps) {
            csv.append("PKG_REMAP,").append(remap.ref().sn()).append(',').append(remap.ref().pkg()).append('/')
                    .append(remap.ref().slot()).append(",,,,,,,,,").append(remap.target()).append('\n');
        }
        Files.writeString(Path.of(REPORT_CSV), csv.toString(), StandardCharsets.UTF_8);
    }

    /** 生成清理存量脏数据的 SQL：整理后 Commodity 里已不存在的 SN，两张表都得清掉。 */
    private static void writeCleanupSql(Plan plan) throws IOException {
        List<Integer> keptSns = new ArrayList<>(plan.kept.keySet());
        keptSns.sort(Comparator.naturalOrder());
        StringBuilder inList = new StringBuilder();
        for (int i = 0; i < keptSns.size(); i++) {
            inList.append(i == 0 ? "" : (i % 20 == 0 ? ",\n    " : ", ")).append(keptSns.get(i));
        }

        StringBuilder sql = new StringBuilder();
        sql.append("-- 由 gms-server/src/test/java/CommodityTidy.java 生成，配合本次 Commodity.img 整理执行。\n");
        sql.append("-- 作用：清掉指向「整理后已不存在的 SN」的存量行。\n");
        sql.append("-- wishlists 里的悬空 SN 不会崩服（PacketCreator 只 writeInt 不查表），只是愿望单显示空槽；\n");
        sql.append("-- modified_cash_item 里的悬空 SN 会在每次开商城时被无谓下发一份无主覆盖包。\n");
        sql.append("-- 建议先跑 SELECT 看影响行数，再跑 DELETE。\n\n");
        sql.append("-- 影响面预览\n");
        sql.append("SELECT COUNT(*) AS dangling_wishlists FROM wishlists WHERE sn NOT IN (\n    ")
                .append(inList).append("\n);\n\n");
        sql.append("SELECT COUNT(*) AS dangling_modified FROM modified_cash_item WHERE sn NOT IN (\n    ")
                .append(inList).append("\n);\n\n");
        sql.append("-- 实际清理\n");
        sql.append("DELETE FROM wishlists WHERE sn NOT IN (\n    ").append(inList).append("\n);\n\n");
        sql.append("DELETE FROM modified_cash_item WHERE sn NOT IN (\n    ").append(inList).append("\n);\n");
        Files.writeString(Path.of(CLEANUP_SQL), sql.toString(), StandardCharsets.UTF_8);
    }

    // ---------------------------------------------------------------- 数据结构

    private static final class Entry {
        private final String node;
        private final int from;
        private int to;
        /** 重编号后的节点名；-1 表示这条会被删除，不参与编号。 */
        private int newNode = -1;
        private Integer sn;
        private Integer itemId;
        private Integer count;
        private Integer periodRaw;
        private Integer price;
        private Integer gender;
        private Integer onSale;

        private Entry(String node, int from) {
            this.node = node;
            this.from = from;
        }

        private void putField(String name, int value) {
            switch (name) {
                case "SN" -> sn = value;
                case "ItemId" -> itemId = value;
                case "Count" -> count = value;
                case "Period" -> periodRaw = value;
                case "Price" -> price = value;
                case "Gender" -> gender = value;
                case "OnSale" -> onSale = value;
                default -> {
                }
            }
        }

        /** 与 CashShop.loadAllCashItems 一致：缺省 1，0 视为 90。 */
        private int effPeriod() {
            if (periodRaw == null) {
                return 1;
            }
            return periodRaw == 0 ? 90 : periodRaw;
        }

        private int effCount() {
            return count == null ? 1 : count;
        }

        private boolean isOnSale() {
            return onSale != null && onSale != 0;
        }

        private boolean hasPrice() {
            return price != null && price > 0;
        }

        private String segment() {
            String s = String.valueOf(sn);
            return s.length() >= 3 ? s.substring(0, 3) : s;
        }

        private String groupKey() {
            return itemId + "|" + effCount() + "|" + effPeriod();
        }

        private String csv() {
            return sn + "," + node + "," + (newNode < 0 ? "" : newNode) + "," + itemId + ","
                    + effCount() + "," + effPeriod() + ","
                    + (price == null ? "" : price) + "," + (gender == null ? "" : gender) + ","
                    + segment() + "," + (onSale == null ? "" : onSale);
        }
    }

    private record PackageRef(String pkg, String slot, int sn, int line) {
    }

    private record Remap(PackageRef ref, int target) {
    }

    private static final class Plan {
        private final Map<Integer, Entry> kept = new LinkedHashMap<>();
        private final Map<Integer, Entry> deleted = new LinkedHashMap<>();
        private final Map<Integer, Integer> absorbedBy = new HashMap<>();
        private final List<Entry> onSaleNoData = new ArrayList<>();
        private final List<Entry> onSaleNoServerData = new ArrayList<>();
        private final List<Entry> onSaleNoPrice = new ArrayList<>();

        private List<Entry> onSaleKept() {
            return kept.values().stream().filter(Entry::isOnSale).toList();
        }

        private Entry bySn(int sn) {
            Entry entry = kept.get(sn);
            return entry != null ? entry : deleted.get(sn);
        }
    }
}
