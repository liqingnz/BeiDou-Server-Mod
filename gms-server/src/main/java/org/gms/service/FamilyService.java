package org.gms.service;

import com.mybatisflex.core.query.QueryWrapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gms.client.Family;
import org.gms.client.FamilyEntry;
import org.gms.client.Job;
import org.gms.dao.entity.CharactersDO;
import org.gms.dao.entity.FamilyCharacterDO;
import org.gms.dao.entity.FamilyEntitlementDO;
import org.gms.dao.mapper.FamilyCharacterMapper;
import org.gms.dao.mapper.FamilyEntitlementMapper;
import org.gms.net.server.Server;
import org.gms.net.server.world.World;
import org.gms.util.I18nUtil;
import org.gms.util.Pair;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

import static org.gms.dao.entity.table.FamilyEntitlementDOTableDef.FAMILY_ENTITLEMENT_D_O;

@Slf4j
@Service
@AllArgsConstructor
public class FamilyService {
    private final FamilyCharacterMapper familyCharacterMapper;
    private final FamilyEntitlementMapper familyEntitlementMapper;
    private final CharacterService characterService;

    public void loadAllFamilies() {
        List<FamilyCharacterDO> familyCharacterDOList = familyCharacterMapper.selectAll();
        List<Pair<Integer, FamilyEntry>> unmatchedJuniors = new ArrayList<>(); // <<world, seniorid> familyEntry>
        for (FamilyCharacterDO familyCharacterDO : familyCharacterDOList) {
            CharactersDO charactersDO = characterService.findById(familyCharacterDO.getCid());
            if (charactersDO == null) {
                continue;
            }
            World world = Server.getInstance().getWorld(charactersDO.getWorld());
            if (world == null) {
                continue;
            }
            Family family = world.getFamily(familyCharacterDO.getFamilyid());
            if (family == null) {
                family = new Family(familyCharacterDO.getFamilyid(), charactersDO.getWorld());
                world.addFamily(familyCharacterDO.getFamilyid(), family);
            }
            FamilyEntry familyEntry = new FamilyEntry(family, charactersDO.getId(), charactersDO.getName(),
                    charactersDO.getLevel(), Job.getById(charactersDO.getJob()));
            familyEntry.setReputation(familyCharacterDO.getReputation());
            familyEntry.setTodaysRep(familyCharacterDO.getTodaysrep());
            familyEntry.setTotalReputation(familyCharacterDO.getTotalreputation());
            familyEntry.setRepsToSenior(familyCharacterDO.getReptosenior());
            family.addEntry(familyEntry);
            if (familyCharacterDO.getSeniorid() <= 0) {
                family.setLeader(familyEntry);
                family.setMessage(familyCharacterDO.getPrecepts(), false);
            }
            FamilyEntry senior = family.getEntryByID(familyCharacterDO.getSeniorid());
            if (senior != null) {
                familyEntry.setSenior(senior, false);
            } else if (familyCharacterDO.getSeniorid() > 0) {
                unmatchedJuniors.add(new Pair<>(familyCharacterDO.getSeniorid(), familyEntry));
            }
            List<FamilyEntitlementDO> familyEntitlementDOList = familyEntitlementMapper.selectListByQuery(QueryWrapper.create()
                    .select(FAMILY_ENTITLEMENT_D_O.ENTITLEMENTID)
                    .from(FAMILY_ENTITLEMENT_D_O)
                    .where(FAMILY_ENTITLEMENT_D_O.CHARID.eq(charactersDO.getId())));
            familyEntitlementDOList.forEach(familyEntitlementDO -> familyEntry.setEntitlementUsed(familyEntitlementDO.getEntitlementid()));
        }
        for (Pair<Integer, FamilyEntry> unmatchedJunior : unmatchedJuniors) {
            FamilyEntry senior = Server.getInstance()
                    .getWorld(unmatchedJunior.getRight().getFamily().getWorld())
                    .getFamily(unmatchedJunior.getRight().getFamily().getID())
                    .getEntryByID(unmatchedJunior.getLeft());
            if (senior != null) {
                unmatchedJunior.getRight().setSenior(senior, false);
            }
        }
        for (World world : Server.getInstance().getWorlds()) {
            for (Family family : world.getFamilies()) {
                // 族长是靠 seniorid <= 0 认出来的。历史脏数据（族长被删、下级 seniorid 悬空）会让
                // 整个家族没有族长，这里不判空就是一个 NPE 把所有大区的家族加载全打断
                FamilyEntry leader = family.getLeader();
                if (leader == null) {
                    log.warn(I18nUtil.getLogMessage("FamilyService.loadAllFamilies.warn1"), family.getID(), world.getId());
                    continue;
                }
                leader.doFullCount();
            }
        }
    }
}
