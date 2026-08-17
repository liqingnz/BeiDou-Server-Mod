package org.gms.dao.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * 后台发放资源的常用物品收藏表 实体类。
 *
 * @author beidou
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("favorite_item")
public class FavoriteItemDO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 自增id
     */
    @Id(keyType = KeyType.Auto)
    private Integer id;

    /**
     * 对应发放资源类型：5=道具，6=装备
     */
    private Integer type;

    /**
     * 物品id
     */
    private Integer itemId;

    /**
     * 物品名称，添加时按当时的wz数据缓存，仅供展示
     */
    private String itemName;

    /**
     * 创建时间
     */
    private Date createTime;
}
