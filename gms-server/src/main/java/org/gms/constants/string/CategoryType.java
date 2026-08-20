package org.gms.constants.string;

import lombok.Getter;
import org.gms.util.I18nUtil;

@Getter
public enum CategoryType {
    // 后台商城管理专用的伪分类，不存在于Etc.wz/Category.img，表示不限分类
    ALL(-1, I18nUtil.getMessage("CategoryType.ALL")),
    MAIN(8, I18nUtil.getMessage("CategoryType.MAIN")),
    EVENT(1, I18nUtil.getMessage("CategoryType.EVENT")),
    EQUIP(2, I18nUtil.getMessage("CategoryType.EQUIP")),
    USE(3, I18nUtil.getMessage("CategoryType.USE")),
    SET(4, I18nUtil.getMessage("CategoryType.SET")),
    ETC(5, I18nUtil.getMessage("CategoryType.ETC")),
    PET(6, I18nUtil.getMessage("CategoryType.PET")),
    PACKAGE(7, I18nUtil.getMessage("CategoryType.PACKAGE")),
    ;

    private final int id;
    private final String name;

    CategoryType(final int id, final String name) {
        this.id = id;
        this.name = name;
    }

    public static CategoryType ofId(int id) {
        for (CategoryType type : values()) {
            if (type.id == id) {
                return type;
            }
        }
        return null;
    }

    public static String toName(int id) {
        CategoryType categoryType = ofId(id);
        return categoryType == null ? "" : categoryType.getName();
    }

    /**
     * 是否为「全部」伪分类
     */
    public static boolean isAll(Integer id) {
        return id != null && id == ALL.id;
    }

    /**
     * 一级分类是否属于后台可浏览的商品分类。
     * MAIN是「如何使用商城」这类说明条目而非商品，未登记的分类（如sn以9开头的一批）同样排除。
     */
    public static boolean isBrowsable(int id) {
        CategoryType categoryType = ofId(id);
        return categoryType != null && categoryType != MAIN && categoryType != ALL;
    }
}
