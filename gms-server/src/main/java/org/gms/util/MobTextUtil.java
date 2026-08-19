package org.gms.util;

import org.gms.server.life.LifeFactory;
import org.gms.server.life.Monster;
import org.gms.server.life.MonsterInformationProvider;
import org.gms.server.life.MonsterStats;

/**
 * NPC 对话框里展示怪物用的富文本片段。
 *
 * <h2>立绘为什么不能照抄脚本里的那份</h2>
 * {@code BeiDouSpecial/当前地图掉落_当前地图.js}（{@code @mapdrops}）里的 {@code getMobImage}
 * 顶上写着「以下函数在某些特定的情况下可能会导致客户端闪退」。查下来那个「特定情况」是两类，
 * 全仓库实测数字如下（2380 个 Mob img）：
 * <ol>
 *   <li><b>link 怪（475 个，占 20%）。</b>它们自己的 img 里只有 {@code info}，
 *       连一个 {@code stand}/{@code fly} 节点都没有，动作帧全挂在 {@code info/link} 指向的怪身上。
 *       而 {@code MonsterStats.getMovetype()} 是 {@code LifeFactory} 沿 link 取回来的——
 *       描述的是 <b>link 目标</b>。照着它拼 {@code #fMob/<本怪id>.img/stand/0#}，
 *       客户端解引用一张不存在的画布，直接闪退。
 *       修法：路径里的 id 用 {@link LifeFactory#resolveVisualMonsterId(int)} 解析过的那个。</li>
 *   <li><b>超大立绘。</b>脚本的守卫写的是 {@code width > 160 && height > 250}，
 *       是<b>与</b>——实测 442 个超标的怪里，只超宽的有 300 个（最大 1310×642）、只超高的 12 个，
 *       这 312 个全从 {@code &&} 底下漏过去了。这里改成<b>或</b>。</li>
 * </ol>
 * {@code @mapdrops} 只渲染当前地图刷出来的那几种怪，撞上的概率低所以长期没炸；
 * 按掉落表查怪是全表扫，20% 的命中率下撞上是必然。
 */
public class MobTextUtil {
    /**
     * 超过任一边就换占位图：过大的立绘会让客户端渲染假死。
     * <p>
     * 阈值取自 {@code BeiDouSpecial/怪物手册.js}——那个脚本长期在生产里展示任意怪（含 BOSS），
     * 用的就是 311×311 的「或」判定，是本仓库里唯一有实跑背书的数字。
     * 先前照 {@code 当前地图掉落_当前地图.js} 取 160×250 太紧：686 只 BOSS 里有 310 只
     * （45%）会被打回占位图，等于 BOSS 基本看不到立绘；311 之下只剩 89 只（13%）。
     */
    private static final int MAX_IMG_WIDTH = 311;
    private static final int MAX_IMG_HEIGHT = 311;

    /** 取不到立绘时的问号占位图 */
    private static final String IMAGE_UNKNOWN = "#fUI/UIWindow.img/Maker/randomRecipe#";
    /** 立绘过大时的占位图 */
    private static final String IMAGE_TOO_LARGE = "#fMap/Obj/Tdungeon.img/mushCatle/npc/0/0#";

    private MobTextUtil() {
    }

    /**
     * 怪物立绘的富文本片段，形如 {@code #fMob/0100100.img/stand/0#}。
     * 取不到、或大到会拖垮客户端时返回占位图，任何情况下都不会返回一条指向空节点的路径。
     */
    public static String mobImage(int mobId) {
        Monster mob = LifeFactory.getMonster(mobId);
        return mob == null ? IMAGE_UNKNOWN : mobImage(mob);
    }

    /** 同 {@link #mobImage(int)}，调用方已经有 Monster 时用这个，省一次 LifeFactory 查找 */
    public static String mobImage(Monster mob) {
        // 不能拿 movetype 拼路径：它描述的是 link 目标那只怪，而路径里的 id 得是持有帧的那只。
        // 这里直接问 wz「哪只怪的哪个动作有一帧客户端能按路径取到」，两者一次性对齐
        Pair<Integer, String> frame = LifeFactory.resolveRenderableFrame(mob.getId());
        if (frame == null) {
            return IMAGE_UNKNOWN;
        }

        MonsterStats stats = mob.getStats();
        if (stats.getImgwidth() > MAX_IMG_WIDTH || stats.getImgheight() > MAX_IMG_HEIGHT) {
            return IMAGE_TOO_LARGE;
        }
        // 怪物 ID 最多 7 位，不足补 0
        return "#fMob/" + String.format("%07d", frame.getLeft()) + ".img/" + frame.getRight() + "/0#";
    }

    /**
     * 怪物名。优先用服务端 String.wz 里的名字，取不到才退回 {@code #o<id>#} 让客户端自己渲染。
     * <p>
     * 顺序与 {@code @mapdrops} 脚本一致：服务端有名字就用服务端的（两边 wz 可能不同步），
     * 没有再交给客户端。
     */
    public static String mobName(int mobId) {
        String name = MonsterInformationProvider.getInstance().getMobNameFromId(mobId);
        return (name == null || name.isEmpty() || "MISSINGNO".equals(name)) ? "#o" + mobId + "#" : name;
    }
}
