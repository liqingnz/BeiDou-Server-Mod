package org.gms.service;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gms.client.*;
import org.gms.client.Character;
import org.gms.client.keybind.KeyBinding;
import org.gms.config.GameConfig;
import org.gms.constants.game.GameConstants;
import org.gms.constants.id.MapId;
import org.gms.constants.string.ExtendType;
import org.gms.dao.entity.*;
import org.gms.dao.mapper.*;
import org.gms.model.dto.CharacterListItemDTO;
import org.gms.model.dto.ChrListReqDTO;
import org.gms.model.dto.ChrOnlineListReqDTO;
import org.gms.model.dto.ChrOnlineListRtnDTO;
import org.gms.model.dto.UpdateCharacterDTO;
import org.gms.exception.BizException;
import org.gms.model.pojo.SkillEntry;
import org.gms.net.server.Server;
import org.gms.net.server.coordinator.session.SessionCoordinator;
import org.gms.net.server.guild.GuildCharacter;
import org.gms.net.server.world.Messenger;
import org.gms.net.server.world.Party;
import org.gms.net.server.world.PartyCharacter;
import org.gms.net.server.world.World;
import org.gms.server.Storage;
import org.gms.server.life.MobSkill;
import org.gms.server.life.MobSkillFactory;
import org.gms.server.life.MobSkillType;
import org.gms.server.maps.*;
import org.gms.util.*;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.*;

import static com.mybatisflex.core.query.QueryMethods.dateDiff;
import static com.mybatisflex.core.query.QueryMethods.now;
import static org.gms.dao.entity.table.AccountsDOTableDef.ACCOUNTS_D_O;
import static org.gms.dao.entity.table.AreaInfoDOTableDef.AREA_INFO_D_O;
import static org.gms.dao.entity.table.BbsRepliesDOTableDef.BBS_REPLIES_D_O;
import static org.gms.dao.entity.table.BbsThreadsDOTableDef.BBS_THREADS_D_O;
import static org.gms.dao.entity.table.BuddiesDOTableDef.BUDDIES_D_O;
import static org.gms.dao.entity.table.CharactersDOTableDef.CHARACTERS_D_O;
import static org.gms.dao.entity.table.CooldownsDOTableDef.COOLDOWNS_D_O;
import static org.gms.dao.entity.table.EventstatsDOTableDef.EVENTSTATS_D_O;
import static org.gms.dao.entity.table.ExtendValueDOTableDef.EXTEND_VALUE_D_O;
import static org.gms.dao.entity.table.FamelogDOTableDef.FAMELOG_D_O;
import static org.gms.dao.entity.table.FamilyCharacterDOTableDef.FAMILY_CHARACTER_D_O;
import static org.gms.dao.entity.table.FredstorageDOTableDef.FREDSTORAGE_D_O;
import static org.gms.dao.entity.table.KeymapDOTableDef.KEYMAP_D_O;
import static org.gms.dao.entity.table.MonsterbookDOTableDef.MONSTERBOOK_D_O;
import static org.gms.dao.entity.table.PlayerdiseasesDOTableDef.PLAYERDISEASES_D_O;
import static org.gms.dao.entity.table.SavedlocationsDOTableDef.SAVEDLOCATIONS_D_O;
import static org.gms.dao.entity.table.ServerQueueDOTableDef.SERVER_QUEUE_D_O;
import static org.gms.dao.entity.table.SkillmacrosDOTableDef.SKILLMACROS_D_O;
import static org.gms.dao.entity.table.SkillsDOTableDef.SKILLS_D_O;
import static org.gms.dao.entity.table.TrocklocationsDOTableDef.TROCKLOCATIONS_D_O;
import static org.gms.dao.entity.table.WishlistsDOTableDef.WISHLISTS_D_O;

@Service
@AllArgsConstructor
@Slf4j
public class CharacterService {
    private final ExtendValueMapper extendValueMapper;
    private final CharactersMapper charactersMapper;
    private final SkillsMapper skillsMapper;
    private final SkillmacrosMapper skillmacrosMapper;
    private final GuildsMapper guildsMapper;
    private final BuddiesMapper buddiesMapper;
    private final BbsThreadsMapper bbsThreadsMapper;
    private final BbsRepliesMapper bbsRepliesMapper;
    private final WishlistsMapper wishlistsMapper;
    private final CooldownsMapper cooldownsMapper;
    private final PlayerdiseasesMapper playerdiseasesMapper;
    private final AreaInfoMapper areaInfoMapper;
    private final MonsterbookMapper monsterbookMapper;
    private final FamilyCharacterMapper familyCharacterMapper;
    private final FamelogMapper famelogMapper;
    private final InventoryService inventoryService;
    private final QuestService questService;
    private final FredstorageMapper fredstorageMapper;
    private final MtsService mtsService;
    private final KeymapMapper keymapMapper;
    private final SavedlocationsMapper savedlocationsMapper;
    private final TrocklocationsMapper trocklocationsMapper;
    private final EventstatsMapper eventstatsMapper;
    private final ServerQueueMapper serverQueueMapper;
    private final NameChangeService nameChangeService;
    private final WorldTransferService worldTransferService;
    private final BosslogDailyMapper bosslogDailyMapper;
    private final BosslogWeeklyMapper bosslogWeeklyMapper;
    private final FamilyEntitlementMapper familyEntitlementMapper;
    private final InventorymerchantMapper inventorymerchantMapper;
    private final ApplicationContext applicationContext;
    private final AccountsMapper accountsMapper;
    private final QuickslotkeymappedMapper quickslotkeymappedMapper;
    private final StoragesMapper storagesMapper;
    private final InventoryitemsMapper inventoryitemsMapper;
    private final HwidaccountsMapper hwidaccountsMapper;
    private final IpbansMapper ipbansMapper;
    private final MacbansMapper macbansMapper;

    public CharactersDO findById(int id) {
        return charactersMapper.selectOneById(id);
    }

    public void update(CharactersDO condition) {
        charactersMapper.update(condition);
    }

    public Page<ChrOnlineListRtnDTO> getChrOnlineList(ChrOnlineListReqDTO request) {
        Collection<Character> chrList = Server.getInstance().getWorld(request.getWorld()).getPlayerStorage().getAllCharacters();
        return BasePageUtil.create(chrList, request)
                .filter(chr -> (Objects.isNull(request.getId()) || Objects.equals(chr.getId(), request.getId()))
                        && (RequireUtil.isEmpty(request.getName()) || chr.getName().contains(request.getName()))
                        && (Objects.isNull(request.getMap()) || Objects.equals(chr.getMap().getId(), request.getMap())))
                .page(chr -> ChrOnlineListRtnDTO.builder()
                        .id(chr.getId())
                        .name(chr.getName())
                        .map(chr.getMap().getId())
                        .job(chr.getJob().getId())
                        .jobName(chr.getJob().getName())
                        .level(chr.getLevel())
                        .gm(chr.gmLevel())
                        .build());
    }

    public void updateRate(ExtendValueDO data) {
        checkName(data);
        data.setExtendType(ExtendType.CHARACTER_EXTEND.getType());
        ExtendValueDO extendValueDO = ExtendUtil.getExtendValue(data.getExtendId(), data.getExtendType(), data.getExtendName());
        if (extendValueDO == null) {
            extendValueMapper.insertSelective(data);
        } else {
            data.setCreateTime(null);
            data.setUpdateTime(new Date(System.currentTimeMillis()));
            extendValueMapper.update(data);
        }

        Character character = getCharacter(data);
        character.resetPlayerRates();
        character.setWorldRates();
        character.setCouponRates();
    }

    public void resetRate(ExtendValueDO data) {
        checkName(data);
        extendValueMapper.deleteByQuery(QueryWrapper.create()
                .where(EXTEND_VALUE_D_O.EXTEND_ID.eq(data.getExtendId()))
                .and(EXTEND_VALUE_D_O.EXTEND_TYPE.eq(ExtendType.CHARACTER_EXTEND.getType()))
                .and(EXTEND_VALUE_D_O.EXTEND_NAME.eq(data.getExtendName())));
        Character character = getCharacter(data);
        character.resetPlayerRates();
        character.setWorldRates();
        character.setCouponRates();
    }

    public void resetRates(ExtendValueDO data) {
        check(data);
        extendValueMapper.deleteByQuery(QueryWrapper.create()
                .where(EXTEND_VALUE_D_O.EXTEND_ID.eq(data.getExtendId()))
                .and(EXTEND_VALUE_D_O.EXTEND_TYPE.eq(ExtendType.CHARACTER_EXTEND.getType()))
                .and(EXTEND_VALUE_D_O.EXTEND_NAME.in("expRate", "dropRate", "mesoRate")));
        Character character = getCharacter(data);
        character.resetPlayerRates();
        character.setWorldRates();
        character.setCouponRates();
    }

    public void resetMerchant() {
        charactersMapper.updateAllHasMerchant(0);
    }

    public List<List<CharactersDO>> getWorldsRankPlayers(int worldSize) {
        boolean wholeServerRanking = GameConfig.getServerBoolean("use_whole_server_ranking");
        List<List<CharactersDO>> worldsRankingList = new ArrayList<>();
        if (wholeServerRanking) {
            // 全服前50
            QueryWrapper queryWrapper = QueryWrapper.create()
                    .select(CHARACTERS_D_O.NAME, CHARACTERS_D_O.LEVEL, CHARACTERS_D_O.WORLD)
                    .from(CHARACTERS_D_O)
                    .leftJoin(ACCOUNTS_D_O).on(CHARACTERS_D_O.ACCOUNTID.eq(ACCOUNTS_D_O.ID))
                    .where(CHARACTERS_D_O.GM.lt(2))
                    .and(ACCOUNTS_D_O.BANNED.eq(0).or(ACCOUNTS_D_O.TEMPBAN.isNull()))
                    .and(CHARACTERS_D_O.WORLD.between(0, worldSize - 1))
                    .orderBy(CHARACTERS_D_O.WORLD.asc(), CHARACTERS_D_O.LEVEL.desc(), CHARACTERS_D_O.EXP.desc(), CHARACTERS_D_O.LAST_EXP_GAIN_TIME.asc())
                    .limit(50);
            List<CharactersDO> charactersDOList = charactersMapper.selectListByQuery(queryWrapper);
            worldsRankingList.add(charactersDOList);
        } else {
            for (int i = 0; i < worldSize; i++) {
                // 每个区前50
                List<CharactersDO> charactersDOList = getWorldRankPlayers(i);
                worldsRankingList.add(charactersDOList);
            }
        }
        return worldsRankingList;
    }

    public List<CharactersDO> getWorldRankPlayers(int worldId) {
        QueryWrapper queryWrapper = QueryWrapper.create()
                .select(CHARACTERS_D_O.NAME, CHARACTERS_D_O.LEVEL, CHARACTERS_D_O.WORLD)
                .from(CHARACTERS_D_O)
                .leftJoin(ACCOUNTS_D_O).on(CHARACTERS_D_O.ACCOUNTID.eq(ACCOUNTS_D_O.ID))
                .where(CHARACTERS_D_O.GM.lt(2))
                .and(ACCOUNTS_D_O.BANNED.eq(0).or(ACCOUNTS_D_O.TEMPBAN.isNull()))
                .and(CHARACTERS_D_O.WORLD.eq(worldId))
                .orderBy(CHARACTERS_D_O.LEVEL.desc(), CHARACTERS_D_O.EXP.desc(), CHARACTERS_D_O.LAST_EXP_GAIN_TIME.asc())
                .limit(50);
        return charactersMapper.selectListByQuery(queryWrapper);
    }

    public CharactersDO findByName(String name) {
        List<CharactersDO> charactersDOS = charactersMapper.selectListByQuery(QueryWrapper.create().where(CHARACTERS_D_O.NAME.eq(name)));
        return charactersDOS.isEmpty() ? null : charactersDOS.getFirst();
    }

    public void removeSkill(SkillsDO skillsDO) {
        skillsMapper.deleteByQuery(QueryWrapper.create(skillsDO));
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteGuild(GuildsDO guildsDO) {
        charactersMapper.updateByQuery(CharactersDO.builder().guildid(0).guildrank(5).build(), QueryWrapper.create().where(CHARACTERS_D_O.GUILDID.eq(guildsDO.getGuildid())));
        guildsMapper.deleteById(guildsDO.getGuildid());
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteCharFromDB(Character player, int senderAccId) {
        int cid = player.getId();
        if (!Server.getInstance().haveCharacterEntry(senderAccId, cid)) {    // thanks zera (EpiphanyMS) for pointing a critical exploit with non-authed character deletion request
            throw new BizException(I18nUtil.getExceptionMessage("UNKNOWN_CHARACTER"));
        }
        deleteCharacterById(cid);
    }

    /**
     * 按角色ID删除角色及其全部关联数据（GM后台/账号级联删除入口，无登录态鉴权）。
     * 不依赖在线 Character 对象，guild 清理传 null character（仅 leave/disband，跳过 setGuildMemberOnline）。
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteCharacterById(int cid) {
        CharactersDO charactersDO = findById(cid);
        if (charactersDO == null) {
            return;
        }
        int world = charactersDO.getWorld();
        // 删除guild（传 null character：跳过 setGuildMemberOnline，仍执行 leaveGuild/disbandGuild）
        if (Optional.ofNullable(charactersDO.getGuildid()).orElse(0) > 0) {
            Server.getInstance().deleteGuildCharacter(new GuildCharacter(null, cid, 0, charactersDO.getName(),
                    (byte) -1, (byte) -1, 0, Optional.ofNullable(charactersDO.getGuildrank()).orElse(0),
                    Optional.ofNullable(charactersDO.getGuildid()).orElse(0), false,
                    Optional.ofNullable(charactersDO.getAllianceRank()).orElse(0)));
        }
        // 删除buddies
        QueryWrapper buddiesQueryWrapper = QueryWrapper.create().where(BUDDIES_D_O.CHARACTERID.eq(cid));
        List<BuddiesDO> buddiesDOS = buddiesMapper.selectListByQuery(buddiesQueryWrapper);
        buddiesDOS.forEach(buddiesDO -> {
            Character buddy = Server.getInstance().getWorld(world).getPlayerStorage().getCharacterById(buddiesDO.getBuddyid());
            if (buddy != null) {
                buddy.deleteBuddy(cid);
            }
        });
        buddiesMapper.deleteByQuery(buddiesQueryWrapper);
        // 删除bbs_threads bbs_replies
        QueryWrapper bbsThreadsQueryWrapper = QueryWrapper.create().where(BBS_THREADS_D_O.POSTERCID.eq(cid));
        List<BbsThreadsDO> bbsThreadsDOS = bbsThreadsMapper.selectListByQuery(bbsThreadsQueryWrapper);
        List<Long> threadIds = bbsThreadsDOS.stream().map(BbsThreadsDO::getThreadid).toList();
        if (!threadIds.isEmpty()) {
            bbsRepliesMapper.deleteByQuery(QueryWrapper.create().where(BBS_REPLIES_D_O.THREADID.in(threadIds)));
            bbsThreadsMapper.deleteByQuery(bbsThreadsQueryWrapper);
        }
        // 删除wishlists
        wishlistsMapper.deleteByQuery(QueryWrapper.create().where(WISHLISTS_D_O.CHARID.eq(cid)));
        // 删除cooldowns
        cooldownsMapper.deleteByQuery(QueryWrapper.create().where(COOLDOWNS_D_O.CHARID.eq(cid)));
        // 删除playerdiseases
        playerdiseasesMapper.deleteByQuery(QueryWrapper.create().where(PLAYERDISEASES_D_O.CHARID.eq(cid)));
        // 删除area_info
        areaInfoMapper.deleteByQuery(QueryWrapper.create().where(AREA_INFO_D_O.CHARID.eq(cid)));
        // 删除monsterbook
        monsterbookMapper.deleteByQuery(QueryWrapper.create().where(MONSTERBOOK_D_O.CHARID.eq(cid)));
        // 家族过继必须排在删 characters 之前：family_character.cid 上有
        // ON DELETE CASCADE（V1.0.49__some_alter.sql），characters 一删，这里就查不到被删者那行了
        reparentFamilyJuniors(cid);
        // 删除characters
        charactersMapper.deleteById(cid);
        // 删除family_character（cid 的外键是 ON DELETE CASCADE，上一步通常已经带走，这里兜底）
        familyCharacterMapper.deleteByQuery(QueryWrapper.create().where(FAMILY_CHARACTER_D_O.CID.eq(cid)));
        // 删除famelog
        famelogMapper.deleteByQuery(QueryWrapper.create().where(FAMELOG_D_O.CHARACTERID_TO.eq(cid).or(FAMELOG_D_O.CHARACTERID.eq(cid))));
        // 删除背包库存
        inventoryService.deleteInventoryByCharacterId(cid);
        // 删除任务进度
        questService.deleteQuestProgressByCharacter(cid);
        // 删除fredstorage
        fredstorageMapper.deleteByQuery(QueryWrapper.create().where(FREDSTORAGE_D_O.CID.eq(cid)));
        // 删除拍卖行
        mtsService.deleteMtsByCharacterId(cid);
        // 删除keymap
        keymapMapper.deleteByQuery(QueryWrapper.create().where(KEYMAP_D_O.CHARACTERID.eq(cid)));
        // 删除savedlocations
        savedlocationsMapper.deleteByQuery(QueryWrapper.create().where(SAVEDLOCATIONS_D_O.CHARACTERID.eq(cid)));
        // 删除trocklocations
        trocklocationsMapper.deleteByQuery(QueryWrapper.create().where(TROCKLOCATIONS_D_O.CHARACTERID.eq(cid)));
        // 删除技能
        skillsMapper.deleteByQuery(QueryWrapper.create().where(SKILLS_D_O.CHARACTERID.eq(cid)));
        skillmacrosMapper.deleteByQuery(QueryWrapper.create().where(SKILLMACROS_D_O.CHARACTERID.eq(cid)));
        // 删除eventstats
        eventstatsMapper.deleteByQuery(QueryWrapper.create().where(EVENTSTATS_D_O.CHARACTERID.eq(cid)));
        // 删除server_queue
        serverQueueMapper.deleteByQuery(QueryWrapper.create().where(SERVER_QUEUE_D_O.CHARACTERID.eq(cid)));
        // 删除bosslog
        bosslogDailyMapper.deleteByQuery(new QueryWrapper().eq("characterid", cid));
        bosslogWeeklyMapper.deleteByQuery(new QueryWrapper().eq("characterid", cid));
        // 删除family_entitlement
        familyEntitlementMapper.deleteByQuery(new QueryWrapper().eq("charid", cid));
        // 删除inventorymerchant
        inventorymerchantMapper.deleteByQuery(new QueryWrapper().eq("characterid", cid));
        // 删除character_extend系列（角色扩展值，复用统一扩展表）
        extendValueMapper.deleteByQuery(QueryWrapper.create()
                .where(EXTEND_VALUE_D_O.EXTEND_ID.eq(String.valueOf(cid)))
                .and(EXTEND_VALUE_D_O.EXTEND_TYPE.in(
                        ExtendType.CHARACTER_EXTEND.getType(),
                        ExtendType.CHARACTER_EXTEND_DAILY.getType(),
                        ExtendType.CHARACTER_EXTEND_WEEKLY.getType())));
        // 删除characterexplogs（经验日志，服务端由ExpLogger写入，无Mapper用原生JDBC）
        try (Connection con = DatabaseConnection.getConnection();
             PreparedStatement ps = con.prepareStatement("DELETE FROM characterexplogs WHERE charid = ?")) {
            ps.setInt(1, cid);
            ps.executeUpdate();
        } catch (SQLException e) {
            log.error("删除 characterexplogs 失败, cid={}", cid, e);
        }
        // 补充heaven没有删除的2张表
        nameChangeService.cancelPendingNameChange(cid, false);
        worldTransferService.cancelPendingWorldTransfer(cid, false);
    }

    /**
     * 家族树是<b>二叉</b>的：{@link org.gms.client.FamilyEntry} 里 {@code juniors} 定长 2。
     */
    private static final int FAMILY_JUNIOR_CAPACITY = 2;

    /**
     * 删角色前把他在家族里的下级重新挂接，保证家族树不断链。<b>必须在删 characters 之前调用</b>——
     * {@code family_character.cid} 上有 {@code ON DELETE CASCADE}，characters 一删这里就什么都查不到了。
     * <p>
     * 不处理的话，下级的 {@code seniorid} 会指向一个已经不存在的角色：
     * {@code FamilyService.loadAllFamilies} 找不到 senior 就把他们丢进 unmatchedJuniors 且永远匹配不上；
     * 更要命的是<b>被删的如果是族长</b>，整个家族再没有任何一行 {@code seniorid <= 0}，
     * {@code family.getLeader()} 返回 null，收尾那句 {@code getLeader().doFullCount()} 直接 NPE。
     * <p>
     * 挂接规则，两条硬约束都必须守住：
     * <ol>
     *   <li><b>一个家族最多一个根</b>。{@code loadAllFamilies} 对每个 {@code seniorid <= 0} 的行都调
     *       {@code setLeader}，多于一个就会「最后一行胜出」，族长不确定、家族静默分裂。
     *       所以删族长时只提拔一个下级当新族长，另一个挂到新族长名下。</li>
     *   <li><b>新上级的下级数不能超过 {@value #FAMILY_JUNIOR_CAPACITY}</b>。超了 {@code FamilyEntry.addJunior}
     *       会拒绝，而 {@code setSenior} 在拒绝前已经把 {@code this.senior} 赋好了 —— 子认父、父不认子，
     *       内存树静默不一致、人数统计也错。</li>
     * </ol>
     * <p>
     * <b>已知限制</b>：这里只做「就近挂接」，不做二叉树重排。名额不够时剩下的下级维持原样（{@code seniorid}
     * 悬空），行为与本方法引入前一致 —— {@code FamilyService} 那道判空能兜住，但那棵子树会脱离统计。
     * 这种情况会打 warn 并列出角色 id，需要人工处理。真要做完整重排是另一个课题。
     */
    private void reparentFamilyJuniors(int cid) {
        FamilyCharacterDO self = familyCharacterMapper.selectOneByQuery(
                QueryWrapper.create().where(FAMILY_CHARACTER_D_O.CID.eq(cid)));
        if (self == null) {
            return;     // 不在任何家族里
        }

        // 按 cid 升序取，保证同样的数据每次跑出同样的结果，不依赖 selectAll 的返回顺序
        List<FamilyCharacterDO> juniors = familyCharacterMapper.selectListByQuery(
                QueryWrapper.create().where(FAMILY_CHARACTER_D_O.SENIORID.eq(cid))
                        .orderBy(FAMILY_CHARACTER_D_O.CID.asc()));
        if (juniors.isEmpty()) {
            return;
        }

        int newSeniorId = Optional.ofNullable(self.getSeniorid()).orElse(0);
        List<Integer> placed = new ArrayList<>();
        if (newSeniorId <= 0) {
            // 被删的是族长：提拔第一个下级当新族长，其余挂到新族长名下。
            // precepts（家训）挂在族长那一行上，要跟着位置一起转移，否则家族公告凭空消失
            int newLeaderId = juniors.get(0).getCid();
            familyCharacterMapper.updateByQuery(
                    FamilyCharacterDO.builder().seniorid(0).reptosenior(0).precepts(self.getPrecepts()).build(),
                    QueryWrapper.create().where(FAMILY_CHARACTER_D_O.CID.eq(newLeaderId)));
            placed.add(newLeaderId);
            placeWithinCapacity(cid, newLeaderId, juniors.subList(1, juniors.size()), placed);
        } else {
            placeWithinCapacity(cid, newSeniorId, juniors, placed);
        }

        List<Integer> stranded = juniors.stream().map(FamilyCharacterDO::getCid)
                .filter(id -> !placed.contains(id)).toList();
        if (!stranded.isEmpty()) {
            log.warn(I18nUtil.getLogMessage("CharacterService.reparentFamilyJuniors.warn1"), cid, stranded);
        }
    }

    /**
     * 在 {@code newSeniorId} 的剩余名额内挂接下级，放不下的留给调用方记账。
     *
     * @param deletingCid 正在被删除的角色。<b>必须从名额统计里排除</b>：本方法跑在删 characters 之前，
     *                    非族长路径下被删者自己那行的 seniorid 恰好就是 {@code newSeniorId}，
     *                    不排除就会把他即将腾出的位置算成占用，每次删「有下级的普通成员」都少挂一个下级，
     *                    把「名额不够才悬空」这条已知限制放大成常态。
     */
    private void placeWithinCapacity(int deletingCid, int newSeniorId, List<FamilyCharacterDO> juniors, List<Integer> placed) {
        long used = familyCharacterMapper.selectCountByQuery(
                QueryWrapper.create().where(FAMILY_CHARACTER_D_O.SENIORID.eq(newSeniorId))
                        .and(FAMILY_CHARACTER_D_O.CID.ne(deletingCid)));
        int free = (int) (FAMILY_JUNIOR_CAPACITY - used);
        if (free <= 0) {
            return;
        }
        moveJuniorsTo(newSeniorId, juniors.subList(0, Math.min(free, juniors.size())), placed);
    }

    private void moveJuniorsTo(int newSeniorId, List<FamilyCharacterDO> juniors, List<Integer> placed) {
        if (juniors.isEmpty()) {
            return;
        }
        List<Integer> ids = juniors.stream().map(FamilyCharacterDO::getCid).toList();
        // reptosenior 一并清零：换了上级之后，攒给旧上级的声望不该带过去，
        // 这也是 FamilyEntry.setSenior 的语义（见 updateDBChangeFamily 里的 reptosenior = 0）
        familyCharacterMapper.updateByQuery(
                FamilyCharacterDO.builder().seniorid(newSeniorId).reptosenior(0).build(),
                QueryWrapper.create().where(FAMILY_CHARACTER_D_O.CID.in(ids)));
        placed.addAll(ids);
    }

    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_UNCOMMITTED)
    public void saveCharToDB(Character player, boolean notAutosave) {
        if (!player.isLoggedIn()) {
            return;
        }
        log.info(I18nUtil.getLogMessage(notAutosave ? "Character.saveCharToDB.info1" : "Character.saveCharToDB.info2"), player.getName());
        Server.getInstance().updateCharacterEntry(player);

        CharactersDO cdo = Character.toCharactersDO(player);
        charactersMapper.insertSelective(cdo);
    }

    public Character loadCharFromDB(int cid, Client client, boolean channelServer) {
        CharactersDO charactersDO = findById(cid);
        RequireUtil.requireNotNull(charactersDO, I18nUtil.getExceptionMessage("UNKNOWN_CHARACTER"));
        Character chr = Character.fromCharactersDO(charactersDO, client);
        if (!channelServer) {
            return chr;
        }
        MapManager mapManager = client.getChannelServer().getMapFactory();
        MapleMap mapleMap = mapManager.getMap(chr.getMapId());
        if (mapleMap == null) {
            mapleMap = mapManager.getMap(MapId.HENESYS);
        }
        chr.setMap(mapleMap);
        Portal portal = mapleMap.getPortal(chr.getInitialSpawnPoint());
        if (portal == null) {
            portal = mapleMap.getPortal(0);
            chr.setInitialSpawnPoint(0);
        }
        chr.setPosition(portal.getPosition());

        World world = Server.getInstance().getWorld(charactersDO.getWorld());
        int partyId = charactersDO.getParty();
        Party party = world.getParty(partyId);
        if (party != null) {
            PartyCharacter partyCharacter = party.getMemberById(cid);
            if (partyCharacter != null) {
                chr.setMPC(new PartyCharacter(chr));
                chr.setParty(party);
            }
        }

        int messengerId = charactersDO.getMessengerid();
        int messengerPosition = charactersDO.getMessengerposition();
        if (messengerId > 0 && messengerPosition < 4 && messengerPosition > -1) {
            Messenger messenger = world.getMessenger(messengerId);
            if (messenger != null) {
                chr.setMessenger(messenger);
                chr.setMessengerPosition(messengerPosition);
            }
        }
        chr.setLoggedIn(true);

        List<QuestStatus> questStatusList = questService.getQuestStatusByCharacter(cid);
        questStatusList.forEach(questStatus -> chr.getQuests().put(questStatus.getQuestID(), questStatus));

        List<SkillsDO> skillsDOList = skillsMapper.selectListByQuery(QueryWrapper.create().where(SKILLS_D_O.CHARACTERID.eq(cid)));
        skillsDOList.forEach(skillsDO -> {
            Skill skill = SkillFactory.getSkill(skillsDO.getSkillid());
            if (skill != null) {
                chr.getEditableSkills().put(skill, new SkillEntry(Optional.ofNullable(skillsDO.getSkilllevel()).map(Integer::byteValue).orElse((byte) 0),
                        skillsDO.getMasterlevel(), skillsDO.getExpiration()));
            }
        });

        QueryWrapper cdQueryWrapper = QueryWrapper.create().where(COOLDOWNS_D_O.CHARID.eq(cid));
        List<CooldownsDO> cooldownsDOList = cooldownsMapper.selectListByQuery(cdQueryWrapper);
        cooldownsDOList.forEach(cooldownsDO -> {
            if (cooldownsDO.getSkillid() != 5221999 && cooldownsDO.getLength() + cooldownsDO.getStarttime() < System.currentTimeMillis()) {
                return;
            }
            chr.giveCoolDowns(cooldownsDO.getSkillid(), cooldownsDO.getStarttime(), cooldownsDO.getLength());
        });
        cooldownsMapper.deleteByQuery(cdQueryWrapper);

        QueryWrapper pdWrapper = QueryWrapper.create().where(PLAYERDISEASES_D_O.CHARID.eq(cid));
        List<PlayerdiseasesDO> playerdiseasesDOList = playerdiseasesMapper.selectListByQuery(pdWrapper);
        Map<Disease, Pair<Long, MobSkill>> loadedDiseases = new LinkedHashMap<>();
        playerdiseasesDOList.forEach(playerdiseasesDO -> {
            Disease ordinal = Disease.ordinal(playerdiseasesDO.getDisease());
            if (Disease.NULL.equals(ordinal)) {
                return;
            }
            MobSkillType mobSkillType = MobSkillType.from(playerdiseasesDO.getMobskillid()).orElseThrow();
            MobSkill mobSkill = MobSkillFactory.getMobSkillOrThrow(mobSkillType, playerdiseasesDO.getMobskilllv());
            loadedDiseases.put(ordinal, new Pair<>(playerdiseasesDO.getLength(), mobSkill));
        });
        playerdiseasesMapper.deleteByQuery(pdWrapper);
        if (!loadedDiseases.isEmpty()) {
            Server.getInstance().getPlayerBuffStorage().addDiseasesToStorage(cid, loadedDiseases);
        }

        List<SkillmacrosDO> skillmacrosDOList = skillmacrosMapper.selectListByQuery(QueryWrapper.create().where(SKILLMACROS_D_O.CHARACTERID.eq(cid)));
        skillmacrosDOList.forEach(skillmacrosDO -> chr.getSkillMacros()[skillmacrosDO.getPosition()] = new SkillMacro(
                skillmacrosDO.getSkill1(), skillmacrosDO.getSkill2(), skillmacrosDO.getSkill3(), skillmacrosDO.getName(),
                skillmacrosDO.getShout(), skillmacrosDO.getPosition()
        ));

        List<KeymapDO> keymapDOList = keymapMapper.selectListByQuery(QueryWrapper.create().where(KEYMAP_D_O.CHARACTERID.eq(cid)));
        keymapDOList.forEach(keymapDO -> chr.getKeymap().put(keymapDO.getKey(), new KeyBinding(keymapDO.getType(), keymapDO.getAction())));

        List<SavedlocationsDO> savedlocationsDOList = savedlocationsMapper.selectListByQuery(QueryWrapper.create().where(SAVEDLOCATIONS_D_O.CHARACTERID.eq(cid)));
        savedlocationsDOList.forEach(savedlocationsDO -> chr.getSavedLocations()[SavedLocationType.valueOf(savedlocationsDO.getLocationtype()).ordinal()]
                = new SavedLocation(savedlocationsDO.getMap(), savedlocationsDO.getPortal()));

        List<FamelogDO> famelogDOList = famelogMapper.selectListByQuery(QueryWrapper.create()
                .where(FAMELOG_D_O.CHARACTERID.eq(cid)).and(dateDiff(now(), FAMELOG_D_O.WHEN).lt(30)));
        long lastFameTime = 0;
        List<Integer> lastMonthFameIds = new ArrayList<>(31);
        for (FamelogDO famelogDO : famelogDOList) {
            lastFameTime = Math.max(lastFameTime, famelogDO.getWhen().getTime());
            lastMonthFameIds.add(famelogDO.getCharacteridTo());
        }
        chr.setLastfametime(lastFameTime);
        chr.setLastmonthfameids(lastMonthFameIds);

        chr.getBuddylist().loadFromDb(cid);
        Storage accountStorage = world.getAccountStorage(charactersDO.getAccountid());
        if (accountStorage == null) {
            world.loadAccountStorage(charactersDO.getAccountid());
            accountStorage = world.getAccountStorage(charactersDO.getAccountid());
        }
        chr.setStorage(accountStorage);
        chr.reapplyLocalStats();
        chr.changeHpMp(charactersDO.getHp(), charactersDO.getMp(), true);
        return chr;
    }

    public List<TrocklocationsDO> getTrockLocationByCharacter(Integer cid) {
        return trocklocationsMapper.selectListByQuery(QueryWrapper.create().where(TROCKLOCATIONS_D_O.CHARACTERID.eq(cid)));
    }

    public List<AreaInfoDO> getAreaInfoByCharacter(Integer cid) {
        return areaInfoMapper.selectListByQuery(QueryWrapper.create().where(AREA_INFO_D_O.CHARID.eq(cid)));
    }

    public List<EventstatsDO> getEventStatsByCharacter(Integer cid) {
        return eventstatsMapper.selectListByQuery(QueryWrapper.create().where(EVENTSTATS_D_O.CHARACTERID.eq(cid)));
    }

    public List<WishlistsDO> getWishlistsByCharacter(Integer cid) {
        return wishlistsMapper.selectListByQuery(QueryWrapper.create().where(WISHLISTS_D_O.CHARID.eq(cid)));
    }

    public List<CharactersDO> getCharacterByAccountId(int accountId) {
        return charactersMapper.selectListByQuery(QueryWrapper.create().where(CHARACTERS_D_O.ACCOUNTID.eq(accountId)));
    }

    public List<CharacterListItemDTO> getCharacterListByAccountId(int accountId) {
        return getCharacterByAccountId(accountId).stream().map(this::toCharacterListItem).toList();
    }

    /**
     * 全量角色列表（含离线），供GM后台「角色列表」页分页查询。
     */
    public Page<CharacterListItemDTO> getCharacterList(ChrListReqDTO request) {
        QueryWrapper queryWrapper = QueryWrapper.create();
        if (request.getId() != null) {
            queryWrapper.where(CHARACTERS_D_O.ID.eq(request.getId()));
        }
        if (!RequireUtil.isEmpty(request.getName())) {
            queryWrapper.where(CHARACTERS_D_O.NAME.like(request.getName()));
        }
        if (request.getAccountId() != null) {
            queryWrapper.where(CHARACTERS_D_O.ACCOUNTID.eq(request.getAccountId()));
        }
        if (request.getWorld() != null) {
            queryWrapper.where(CHARACTERS_D_O.WORLD.eq(request.getWorld()));
        }
        queryWrapper.orderBy(CHARACTERS_D_O.ID.asc());

        int pageNo = request.getPageNo() == null ? 1 : request.getPageNo();
        int pageSize = request.getPageSize() == null ? 20 : request.getPageSize();
        Page<CharactersDO> page = charactersMapper.paginate(pageNo, pageSize, queryWrapper);

        Page<CharacterListItemDTO> result = new Page<>();
        result.setPageNumber(page.getPageNumber());
        result.setPageSize(page.getPageSize());
        result.setTotalRow(page.getTotalRow());
        result.setRecords(page.getRecords().stream().map(this::toCharacterListItem).toList());
        return result;
    }

    /**
     * GM后台编辑角色：仅改 characters 表中的安全字段，且要求角色离线。
     * <p>
     * 在线时内存中的 Character 才是权威副本，登出/自动存档时 saveCharToDB 会用内存数据
     * 覆盖这里写入的值，导致改动静默丢失，故直接拒绝——与 AccountService#updateAccountByGM 的策略一致。
     * 在线玩家的实时调整请走「玩家管理」页。
     */
    public void updateCharacterByGm(UpdateCharacterDTO submitData) {
        RequireUtil.requireNotNull(submitData.getId(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_EMPTY", "id"));
        CharactersDO chr = findById(submitData.getId());
        RequireUtil.requireNotNull(chr, I18nUtil.getExceptionMessage("UNKNOWN_CHARACTER"));
        RequireUtil.requireTrue(findOnlineCharacter(submitData.getId()) == null,
                I18nUtil.getExceptionMessage("CharacterService.isOnline"));
        checkUpdateCharacterParam(submitData);

        CharactersDO update = CharactersDO.builder()
                .id(chr.getId())
                .level(submitData.getLevel())
                .exp(submitData.getExp())
                .meso(submitData.getMeso())
                .fame(submitData.getFame())
                .job(submitData.getJob())
                .gm(submitData.getGm())
                .map(submitData.getMap())
                .ap(submitData.getAp())
                .build();
        // mybatis-flex 的 update(entity) 默认忽略 null 字段，未填的项不会被清空
        charactersMapper.update(update);

        log.info(I18nUtil.getLogMessage("CharacterService.updateByGm.info1", chr.getId(), chr.getName()));
    }

    private void checkUpdateCharacterParam(UpdateCharacterDTO submitData) {
        if (submitData.getLevel() != null && submitData.getLevel() < 1) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS", "level"));
        }
        requireNotNegative(submitData.getExp(), "exp");
        requireNotNegative(submitData.getMeso(), "meso");
        requireNotNegative(submitData.getAp(), "ap");
        requireNotNegative(submitData.getMap(), "map");
        if (submitData.getGm() != null && (submitData.getGm() < 0 || submitData.getGm() > 127)) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS", submitData.getGm()));
        }
        if (submitData.getJob() != null && Job.getById(submitData.getJob()) == null) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS", submitData.getJob()));
        }
    }

    private void requireNotNegative(Integer value, String name) {
        if (value != null && value < 0) {
            throw new BizException(I18nUtil.getExceptionMessage("ILLEGAL_PARAMETERS", name));
        }
    }

    private CharacterListItemDTO toCharacterListItem(CharactersDO cdo) {
        int worldId = Optional.ofNullable(cdo.getWorld()).orElse(0);
        Job job = Job.getById(cdo.getJob());
        return CharacterListItemDTO.builder()
                .id(cdo.getId())
                .accountId(cdo.getAccountid())
                .name(cdo.getName())
                .job(cdo.getJob())
                .jobName(job == null ? "" : job.getName())
                .level(cdo.getLevel())
                .exp(cdo.getExp())
                .ap(cdo.getAp())
                .map(cdo.getMap())
                .world(worldId)
                .worldName(GameConstants.getWorldName(worldId))
                .gm(cdo.getGm())
                .meso(cdo.getMeso())
                .fame(cdo.getFame())
                .guildid(cdo.getGuildid())
                .createdate(cdo.getCreatedate())
                .lastLogoutTime(cdo.getLastLogoutTime())
                .online(findOnlineCharacter(cdo.getId()) != null)
                .build();
    }

    /**
     * 删除角色：在线先下线再删，离线直接删。
     */
    public void deleteCharacterWithOnlineCheck(int cid) {
        int accountId = prepareCharacterOffline(cid);
        RequireUtil.requireTrue(accountId != 0, I18nUtil.getExceptionMessage("UNKNOWN_CHARACTER"));
        // 通过代理调用，保证 @Transactional 事务生效
        applicationContext.getBean(CharacterService.class).deleteCharacterById(cid);
        safeDeleteCharacterEntry(accountId, cid);
    }

    /**
     * 安全清理角色登录缓存：账号未登录时其 entry 未初始化，直接调用 deleteCharacterEntry 会 NPE，此处兜底忽略。
     */
    public void safeDeleteCharacterEntry(int accountId, int cid) {
        try {
            Server.getInstance().deleteCharacterEntry(accountId, cid);
        } catch (NullPointerException e) {
            // 账号未登录，无登录缓存可清
        }
    }

    /**
     * 删除账号：级联删除账号下所有角色及其关联数据 + 账号级关联表 + 账号本身。
     * AccountService 作为基类不依赖业务 Service，故账号删除下放到此。
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteAccount(int id) {
        RequireUtil.requireNotNull(accountsMapper.selectOneById(id), I18nUtil.getExceptionMessage("AccountService.id.NotExist"));
        // 通过代理调用，保证角色级联删除的 @Transactional 加入本事务
        CharacterService self = applicationContext.getBean(CharacterService.class);
        // 1. 遍历账号下所有角色：在线先下线，再删除角色及其关联数据
        List<CharactersDO> charList = charactersMapper.selectIdAndWorldListByAccountId(id);
        for (CharactersDO chr : charList) {
            int cid = chr.getId();
            self.prepareCharacterOffline(cid);
            self.deleteCharacterById(cid);
            self.safeDeleteCharacterEntry(id, cid);
        }
        // 2. 删除账号级关联表
        quickslotkeymappedMapper.deleteByQuery(new QueryWrapper().eq("accountid", id));
        storagesMapper.deleteByQuery(new QueryWrapper().eq("accountid", id));
        inventoryitemsMapper.deleteByQuery(new QueryWrapper().eq("accountid", id));
        ipbansMapper.deleteByQuery(new QueryWrapper().eq("aid", id));
        macbansMapper.deleteByQuery(new QueryWrapper().eq("aid", id));
        hwidaccountsMapper.deleteByQuery(new QueryWrapper().eq("accountid", id));
        serverQueueMapper.deleteByQuery(new QueryWrapper().eq("accountid", id));
        extendValueMapper.deleteByQuery(QueryWrapper.create()
                .where(EXTEND_VALUE_D_O.EXTEND_ID.eq(String.valueOf(id)))
                .and(EXTEND_VALUE_D_O.EXTEND_TYPE.in(
                        ExtendType.ACCOUNT_EXTEND.getType(),
                        ExtendType.ACCOUNT_EXTEND_DAILY.getType(),
                        ExtendType.ACCOUNT_EXTEND_WEEKLY.getType())));
        // 3. 删除账号
        accountsMapper.deleteById(id);
    }

    /**
     * 在线角色先下线，返回角色所属 accountId（在线从内存取，离线从 DB 取；角色不存在返回 0）。
     * 供账号级联删除复用。
     */
    public int prepareCharacterOffline(int cid) {
        Character online = findOnlineCharacter(cid);
        if (online != null) {
            int accountId = online.getAccountId();
            // 在线：先下线
            online.getClient().forceDisconnect();
            // 这里必须用online.getClient()重新获取一遍
            if (online.getClient() != null) {
                online.getClient().closeSession();
            }
            return accountId;
        }
        CharactersDO cdo = findById(cid);
        return cdo == null ? 0 : cdo.getAccountid();
    }

    private Character findOnlineCharacter(int cid) {
        for (World world : Server.getInstance().getWorlds()) {
            Character chr = world.getPlayerStorage().getCharacterById(cid);
            if (chr != null) {
                return chr;
            }
        }
        return null;
    }

    private void checkName(ExtendValueDO data) {
        check(data);
        // 非法请求篡改其他字段
        if ("expRate".equals(data.getExtendName()) || "dropRate".equals(data.getExtendName()) || "mesoRate".equals(data.getExtendName())) {
            return;
        }
        throw BizException.illegalArgument();
    }

    private void check(ExtendValueDO data) {
        RequireUtil.requireNotEmpty(data.getExtendId(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_EMPTY", "extendId"));
        RequireUtil.requireNotEmpty(data.getExtendType(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_EMPTY", "extendType"));
        RequireUtil.requireNotEmpty(data.getExtendName(), I18nUtil.getExceptionMessage("PARAMETER_SHOULD_NOT_EMPTY", "extendName"));
    }

    private Character getCharacter(ExtendValueDO data) {
        for (World world : Server.getInstance().getWorlds()) {
            for (Character character : world.getPlayerStorage().getAllCharacters()) {
                if (ExtendType.isAccount(data.getExtendType()) && Objects.equals(String.valueOf(character.getAccountId()), data.getExtendId())) {
                    return character;
                }

                if (ExtendType.isCharacter(data.getExtendType()) && Objects.equals(String.valueOf(character.getId()), data.getExtendId())) {
                    return character;
                }
            }
        }
        throw BizException.illegalArgument(I18nUtil.getExceptionMessage("CharacterService.getCharacter.exception1"));
    }
}
