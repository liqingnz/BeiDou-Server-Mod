package org.gms.model.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 角色列表查询入参（GM后台全量角色列表用，含离线角色）。
 * 区别于 {@link ChrOnlineListReqDTO}：后者只查内存中的在线玩家，本类直接查 characters 表。
 *
 * @author beidou
 */
@Getter
@Setter
public class ChrListReqDTO extends BasePageDTO {
    private Integer id;
    private String name;
    private Integer accountId;
    private Integer world;
}
