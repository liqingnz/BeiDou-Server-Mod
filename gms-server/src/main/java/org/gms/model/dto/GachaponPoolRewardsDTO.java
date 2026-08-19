package org.gms.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.gms.dao.entity.GachaponRewardDO;

import java.util.List;

/**
 * 一个扭蛋奖池及其全部奖励，供「查看奖励列表」这类展示用。
 * <p>
 * 展示端要的是「按稀有度分档」，而 BeiDou 的档就是奖池——所以这里带上算好的命中概率，
 * 免得每个展示端各自去拼 weight/prob 那套积分公式（那份公式只应有一处，见
 * {@code GachaponService.computeRealProbs}）。
 */
@Data
@AllArgsConstructor
public class GachaponPoolRewardsDTO {
    /** 奖池名，直接展示给玩家 */
    private String poolName;

    /**
     * 抽中本奖池的概率，单位 1/1000000（与 gms-ui 后台列表的「真实概率」同一口径）。
     * 化成百分数除以 10000。
     */
    private Integer realProb;

    /** 池内奖励。池内是等概率抽取，所以这里不再有单件的概率 */
    private List<GachaponRewardDO> rewards;
}
