package org.gms.dao.mapper;

import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.gms.dao.entity.LoginHistoryDO;

/**
 * 账号登录IP历史表 Mapper。
 *
 * @author Nap
 * @since 2026-08-15
 */
public interface LoginHistoryMapper extends BaseMapper<LoginHistoryDO> {
    /**
     * 按 (account_id, ip) 唯一键写入：该 IP 首次出现时插入，之后每次登录刷新时间。
     * <p>
     * LichKingMod 原版用 INSERT IGNORE，重复登录会被唯一键整行跳过、时间永不更新，
     * 字段名叫 lastLoginTime 但存的是首次时间。此处改为 ON DUPLICATE KEY UPDATE，
     * 让字段名副其实。
     * <p>
     * 必须显式写列名——本表比 LichKingMod 原表多了自增主键，按列位置插入会错位。
     */
    @Insert("INSERT INTO login_history(account_id, ip, last_login_time) "
            + "VALUES (#{accountId}, #{ip}, #{lastLoginTime}) "
            + "ON DUPLICATE KEY UPDATE last_login_time = #{lastLoginTime}")
    void upsertLastLogin(LoginHistoryDO loginHistoryDO);
}
