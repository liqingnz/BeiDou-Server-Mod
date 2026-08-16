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
     * 角色名的最大字节数（按 GBK 计）。中文客户端出包用 GBK，一个汉字两字节。
     * <p>
     * 注意这道检查<b>同时收紧了纯 ASCII 名</b>：正则允许 12 位，但字节上限 11 会把第 12 位挡掉。
     * 这是照搬原实现的取值，要放宽把它调到 13 即可（{@code characters.name} 是 VARCHAR(13)）。
     */
    public static final int MAX_CHARACTER_NAME_BYTES = 12;

    public static final String BEI_DOU_VERSION = "1.12";
    public static final String BEI_DOU_BUILD_TIME = "2026-05-31 16:03:25";
}
