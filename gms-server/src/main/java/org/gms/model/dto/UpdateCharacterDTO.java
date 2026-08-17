package org.gms.model.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * GM后台编辑角色入参。
 * <p>
 * 仅开放不涉及关联表的安全字段：背包/装备（inventoryitems）、技能（skills）、
 * 好友、公会等均不在此列，改动它们需要连带维护多张表与内存状态。
 * <p>
 * sp 字段在 characters 表中是分职业存储的逗号串（非整数），不适合表单直接编辑，故未开放。
 * <p>
 * 字段为 null 表示不修改该项。
 *
 * @author beidou
 */
@Data
public class UpdateCharacterDTO implements Serializable {
    private Integer id;
    private Integer level;
    private Integer exp;
    private Integer meso;
    private Integer fame;
    private Integer job;
    private Integer gm;
    private Integer map;
    private Integer ap;
}
