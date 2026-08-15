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
 * 全服留言板 实体类。
 *
 * @author Nap
 * @since 2026-08-15
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("message_board")
public class MessageBoardDO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 自增id
     */
    @Id(keyType = KeyType.Auto)
    private Integer id;

    /**
     * 留言角色id
     */
    private Integer characterId;

    /**
     * 留言角色名
     */
    private String characterName;

    /**
     * 留言内容，含颜色控制码
     */
    private String message;

    /**
     * 留言时间
     */
    private Date createTime;
}
