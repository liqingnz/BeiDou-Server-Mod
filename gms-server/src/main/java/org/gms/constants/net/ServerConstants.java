package org.gms.constants.net;

public class ServerConstants {

    //Server Version
    public static final short VERSION = 83;

    //Debug Variables
    public static int[] DEBUG_VALUES = new int[10];             // Field designed for packet testing purposes

    public static final String[] BLOCKED_NAMES = {"admin", "owner", "moderator", "intern", "donor", "administrator", "FREDRICK", "help", "helper", "alert", "notice", "maplestory", "fuck", "wizet", "fucking", "negro", "fuk", "fuc", "penis", "pussy", "asshole", "gay",
            "nigger", "homo", "suck", "cum", "shit", "shitty", "condom", "security", "official", "rape", "nigga", "sex", "tit", "boner", "orgy", "clit", "asshole", "fatass", "bitch", "support", "gamemaster", "cock", "gaay", "gm",
            "operate", "master", "sysop", "party", "GameMaster", "community", "message", "event", "test", "meso", "Scania", "yata", "AsiaSoft", "henesys",
            // 中文屏蔽词：冒充管理/系统的、脏字、以及会与大区名混淆的片段
            "管理", "艹", "操", "嬲", "活动", "贱", "点券", "妖王", "之大陆",
            "习近平", "毛泽东", "胡锦涛", "邓小平", "江泽民", "共产党"};

    /**
     * 角色名的字节数上限（按 GBK 计，取<b>开区间</b>：名字必须严格小于这个值）。
     * 中文客户端出包用 GBK，一个汉字两字节。
     * <p>
     * 取 13 即「最多 12 字节」，正好对齐 {@code characters.name} 的 VARCHAR(13)，
     * 也让 12 位 ASCII 名与 6 个汉字的名字都能通过 —— 与角色名正则的 {2,12} 上限一致。
     * <p>
     * 原实现取的是 12（即最多 11 字节），那会把第 12 位 ASCII 和正好六个汉字的名字一起挡掉，
     * 比正则本身还严。这里按运营决定放宽。
     */
    public static final int MAX_CHARACTER_NAME_BYTES = 13;

    public static final String BEI_DOU_VERSION = "1.12";
    public static final String BEI_DOU_BUILD_TIME = "2026-05-31 16:03:25";
}
