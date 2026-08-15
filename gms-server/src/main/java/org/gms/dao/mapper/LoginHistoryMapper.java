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
     * 按 (account_id, ip) 唯一键去重插入：该 IP 已记录过则整行跳过，不更新时间。
     * <p>
     * MyBatis-Flex 的 BaseMapper 只提供 insertOrUpdate（UPDATE 语义），没有 IGNORE 语义，故手写。
     * 必须显式写列名——本表比 LichKingMod 原表多了自增主键，按列位置插入会错位。
     */
    @Insert("INSERT IGNORE INTO login_history(account_id, ip, first_login_time) "
            + "VALUES (#{accountId}, #{ip}, #{firstLoginTime})")
    void insertIgnore(LoginHistoryDO loginHistoryDO);
}
