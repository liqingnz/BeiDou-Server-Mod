package org.gms.model.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * 添加常用物品入参。
 *
 * @author beidou
 */
@Data
public class FavoriteItemReqDTO implements Serializable {
    /**
     * 对应发放资源类型：5=道具，6=装备
     */
    private Integer type;
    private Integer itemId;
}
