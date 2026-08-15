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
 * 账号登录IP历史表 实体类。
 *
 * @author Nap
 * @since 2026-08-15
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("login_history")
public class LoginHistoryDO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 自增id
     */
    @Id(keyType = KeyType.Auto)
    private Integer id;

    /**
     * 账号id，对应accounts.id
     */
    private Integer accountId;

    /**
     * 登录来源IP，长度按IPv6预留
     */
    private String ip;

    /**
     * 该账号最近一次从此IP登录成功的时间
     */
    private Date lastLoginTime;
}
