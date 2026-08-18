/**MapleLand 脚本

@mapdrops 的展示脚本：开头是全服掉落，接着是当前地图存活怪物的掉落。

怪物列表、逐个怪物下钻、以及三个展示辅助函数取自
BeiDouSpecial/当前地图掉落_当前地图.js（作者 Magical-H, https://github.com/Magical-H），
全服掉落那一段是新加的。

入口：org.gms.client.command.commands.gm0.MapDropsCommand（@mapdrops）*/

var MonsterInformationProvider;
var ItemInformationProvider;
var QuestInfo;

var MapObj;                 // 地图对象
var List_Mob_All;           // 当前地图所有存活怪物（已转成 JS 数组）
var List_Mob_Boss;          // BOSS 列表
var List_Mob;               // 普通怪物列表
var List_GlobalDrop;        // 当前大陆生效的全服掉落
var namelength = 0;

function start() {
    MonsterInformationProvider = Java.type('org.gms.server.life.MonsterInformationProvider');  //导入 怪物信息 类
    ItemInformationProvider = Java.type('org.gms.server.ItemInformationProvider');             //导入 物品信息 类
    QuestInfo = Java.type('org.gms.server.quest.Quest');                                       //导入 任务 类

    // 每次打开都重新取，不做「首次才初始化」的缓存：MapleLand/ 与 BeiDouSpecial/ 下的脚本
    // 引擎不会被 resetContext 清掉（它只按 npc/ 前缀拼缓存 key），把地图缓存住的话
    // 换了地图再查还是上一张图的数据。
    MapObj = cm.getMap();
    namelength = 0;
    //获取当前地图存活的怪物，由于未找到获取当前地图固定怪物列表方法，故用此方法代替
    List_Mob_All = toArray(MapObj.getAllMonsters());
    //将怪物种类去重并按照Boss和普通怪物区分开
    [List_Mob, List_Mob_Boss] = Object.values(List_Mob_All.reduce((acc, mob) => (acc.ids.has(mob.getId()) || (acc.ids.add(mob.getId()), mob.isBoss() ? acc.bosses : acc.mobs).push(mob), acc), { ids: new Set(), mobs: [], bosses: [] })).slice(-2);
    List_GlobalDrop = toArray(MonsterInformationProvider.getInstance().getRelevantGlobalDrops(MapObj.getId()));

    levelmain();
}

/**
 * 把 java.util.List 拷成真正的 JS 数组。
 * 直接对 Java List 用 reduce/map/filter 依赖 GraalJS 的 foreign-object-prototype，
 * 这里只用 size()/get() 这两个确定存在的方法，后面的数组操作就都是纯 JS 的了。
 * @param javaList
 * @returns {*[]}
 */
function toArray(javaList) {
    let arr = [];
    if (javaList == null) {
        return arr;
    }
    for (let i = 0; i < javaList.size(); i++) {
        arr.push(javaList.get(i));
    }
    return arr;
}

function leveldispose() {
    cm.dispose();
}

/**
 * 当部分cm.sendLevel方法没有指定下一个跳转方法时会自动跳入null，也就是这里。
 */
function levelnull() {
    cm.dispose();
}

/**
 * 第一层对话框：先全服掉落，再当前地图存活的怪物种类。
 */
function levelmain() {
    let Msg_Select = getGlobalDropText();
    Msg_Select += '#d' + '\r\n'.padStart(28, '——') + '#k';

    if (List_Mob.length + List_Mob_Boss.length == 0) {
        // 没有可点的怪物就没有选项，这时不能发选择框，否则玩家只能对着一个空列表点
        Msg_Select += '当前地图没有存活的怪物，请等待怪物刷新后再进行查询。';
        cm.sendOkLevel('dispose', Msg_Select);
        return;
    }

    Msg_Select += '当前地图#b#e存活#k#n怪物列表一览，点击可查看掉落列表：\r\n';
    if (List_Mob_Boss.length > 0) {
        Msg_Select += `#e#rBOSS#k#n：${List_Mob_Boss.length} 种\r\n`;
        Msg_Select += getSelecttext(List_Mob_Boss);
        if (List_Mob.length > 0) Msg_Select += '#d' + '\r\n'.padStart(28, '——') + '#k';
    }
    if (List_Mob.length > 0) {
        Msg_Select += `普通怪物：${List_Mob.length} 种\r\n`;
        Msg_Select += getSelecttext(List_Mob);
    }
    cm.sendNextSelectLevel('ShowDropList', Msg_Select);
}

/**
 * 格式化输出全服掉落。
 * <p>
 * 整段不换行、条目之间只隔一个空格，靠客户端自己折行——下面的怪物列表才是主体，
 * 得给它留出纵向空间。也因此这里不做成可点选项：选项值和怪物列表共用一套 selection，
 * 物品ID撞上怪物ID就会点出一只毫不相干的怪。
 * @returns {string}
 */
function getGlobalDropText() {
    if (List_GlobalDrop.length == 0) {
        return '#e#b全服掉落#k#n：无\r\n';
    }

    // 全服掉落在 MapleMap.dropGlobalItemsFromMonsterOnMap 里是拿 chance 直接跟随机数比的，
    // 不像怪物掉落那样乘 chRate，所以这里只有基础掉率，标注清楚免得玩家按倍率去算。
    let msg = '#e#b全服掉落#k#n（通用，#r不吃掉率#k）：';
    msg += List_GlobalDrop.map(de => {
        let itemName = ItemInformationProvider.getInstance().getName(de.itemId);
        let name = itemName == null ? `#o${de.itemId}#` : itemName;
        let entry = `#v${de.itemId}##b${name}#k ${formatChance(de.chance)}%`;
        entry += getQuantityText(de.Minimum, de.Maximum);
        entry += de.questid > 0 ? '#r[任务]#k' : '';
        return entry;
    }).join(' ');
    return msg + '\r\n';
}

/**
 * 掉落率的展示文本。toFixed 补的尾零在紧密排列时纯占宽度，用 parseFloat 抹掉：
 * 35000 -> 3.5，5 -> 0.0005。
 * @param chance
 * @returns {number}
 */
function formatChance(chance) {
    return parseFloat((chance / 10000).toFixed(4));
}

/**
 * 掉落数量的展示文本，固定 1 个的不显示。不用 \t，制表符在流式排布里会把间距顶乱。
 * @param min
 * @param max
 * @returns {string}
 */
function getQuantityText(min, max) {
    if (max > min) {
        return `×${min}~${max}`;
    }
    return max > 1 ? `×${max}` : '';
}

/**
 * 格式化输出当前地图存在的怪物列表选项。
 * @param moblist
 * @returns {string}
 */
function getSelecttext(moblist) {
    let size = moblist.reduce((max, obj) => Math.max(max, obj.getName().length), 0);  //取最长怪物名称长度
    namelength = namelength > size ? namelength : size;
    return moblist.map(obj => {
        let id = obj.getId();
        let select = '#fUI/UIWindow.img/UserList/Friend/icon04# ';
        let name = !obj.getName() || obj.getName() == 'MISSINGNO' ? `#o${id}#` : obj.getName();     //优先以服务器怪物名称为准，没有的话就显示客户端的
            name = select + name.padEnd(namelength, '\t');
        return `#L${id}#${getMobImage(obj)}\r\n#${(obj.isBoss() ? 'r' : 'b') + name}#k\t[ Lv.${getLevelImage(obj.getLevel())} ] #l`
    }).join('\r\n\r\n') + '\r\n\r\n';
}

/**
 * 格式化输出指定怪物的掉落物品列表
 * @param mobId
 */
function levelShowDropList(mobId) {
    const mob = List_Mob_All.find(mob => mob.getId() == mobId);		 //根据怪物ID获取已缓存的怪物对象
    const table = {
        '物品名称' : 0,
        '基础掉率' : 0,
        '你的掉率' : 0,
    }
    let msgtext = `当前查询的怪物ID [ ${mobId} ] 不存在。`;

    if (mob != null) {
        let player = cm.getPlayer();
        let dropall = toArray(MonsterInformationProvider.getInstance().retrieveDrop(mobId));   //根据怪物ID获取掉落物品列表
        let CountItems = dropall.length;                                                      //取掉落物品总数量
        let mobName = !mob.getName() || mob.getName() == 'MISSINGNO' ? `#o${mobId}#` : mob.getName();
        let stats = mob.getStats();
        let statsSize = Math.max(...[mob.getMaxHp(), stats.getPADamage(), stats.getMADamage()].map(v => v.toString().length));
        mobName = `[ #e#b${mobName}#k#n ] `;
        msgtext = `${getMobImage(mob)}\r\n${mobName}\r\n`;
        msgtext += `血量：${mob.getMaxHp().toString().padEnd(statsSize, ' ')}\t\t蓝量：${mob.getMaxMp()}\r\n`;
        msgtext += `物攻：${stats.getPADamage().toString().padEnd(statsSize, ' ')}\t\t物防：${stats.getPDDamage()}\r\n`;
        msgtext += `魔攻：${stats.getMADamage().toString().padEnd(statsSize, ' ')}\t\t魔防：${stats.getMDDamage()}\r\n`;
        if (CountItems <= 0) {
            msgtext += `\r\n\r\n没有掉落。`;
        } else {
            msgtext += `\r\n\r\n${'-'.repeat(28)}物品掉落列表一览${'-'.repeat(28)}\r\n\r\n`;
            // 遍历 table 对象的键，并设置其值为键名的长度
            Object.keys(table).forEach(key => {table[key] = Math.max(table[key], key.length)});
            let dropitemlist = {};
            dropall.filter(drop => drop.itemId > 0).forEach((drop) => {
                let itemName = ItemInformationProvider.getInstance().getName(drop.itemId);
                if (itemName != null) {
                    let itemChance = (drop.chance / 10000).toFixed(4);
                    // 更新 table 中对应的键值以记录最大长度
                    table['物品名称'] = Math.max(table['物品名称'], itemName.length);
                    table['基础掉率'] = Math.max(table['基础掉率'], itemChance.length / 2);
                    table['你的掉率'] = Math.max(table['你的掉率'], itemChance.length / 2);
                    dropitemlist[drop.itemId] = {name : itemName , chance : itemChance , questid : drop.questid};
                }
            });
            // 确保所有值都是偶数
            Object.keys(table).forEach(key => table[key] = Math.ceil(table[key] / 2) * 2);
            msgtext += '#b' + Object.entries(table).map(([key, val]) => `${key.padEnd(val, '\t')}`).join('\t') + '#k\r\n';
            msgtext += Object.entries(dropitemlist).map(([itemId, { name, chance, questid }]) => {
                    let msg = `#L${itemId}##v${itemId}#\r\n#b#e${name.padEnd(table['物品名称'] + countAllSymbols(name), '\t')}#k#n\t`;
                    msg += `${(chance + '%').padEnd(table['基础掉率'], '\t')}\t#d${(chance * player.getDropRate() * player.getFamilyDrop() + '%').padEnd(table['你的掉率'], '\t')}#k\r\n`;
                    msg += questid > 0 ? '#r[任务道具]#k ' + QuestInfo.getInstance(questid).getName() + '\r\n' : '';
                    msg += '#l';
                    return msg;
                }
            ).join('\r\n');
        }
    }
    cm.sendLastLevel('main', msgtext); //这里会出现上一项+确定的对话框，如果点击确定则会进入到levelnull的方法里，估计是源码里没做判断。
}

/**
 * 提取字符串里的符号数量
 * @param str
 * @returns {*|number}
 */
function countAllSymbols(str) {
    return Math.ceil(str.match(/[^一-鿿]/g)?.length / 2) || 0;
}

/**
 * 以下函数在某些特定的情况下可能会导致客户端闪退
 * @param mob
 * @returns {string}
 */
function getMobImage(mob) {
    let type = [null, 'stand', 'fly']
        type = type[mob.getStats().getMovetype() + 1];    //-1=未知类型，0=陆地类型，1=飞天类型
    if (type == null) {
        return `#fUI/UIWindow.img/Maker/randomRecipe#`;     //没有怪物图片时显示一个问号。
    } else if (mob.getStats().getImgwidth() > 160 && mob.getStats().getImgheight() > 250) { //如果图片超过指定范围会造成客户端假死，因此这里需要替换成别的图片或者干脆不要。
        return `#fMap/Obj/Tdungeon.img/mushCatle/npc/0/0#\r\n(形象过大，不能展示)`;
    } else {
        //当前怪物ID最多7位数，不足7位数则需要在前面补0
        return `#fMob/${mob.getId().toString().padStart(7, '0')}.img/${type}/0#`;
    }
}

function getLevelImage(level, type) {
    let UI = []
        UI.push('Basic/LevelNo/');
        UI.push('Basic/ItemNo/');
        UI.push('UIWindow/SkillEx/SpNum/');
        UI.push('UIWindow/VegaSpell/Count/');
        UI.push('UIWindow/ToolTip/Equip/GrowthEnabled/');
        type = !type ? 0 : type;
        type = type > UI.length ? UI.length : type;
        UI = UI[type];
    return [...level.toString()].map(str => `#fUI/${UI + str}#`);
}
