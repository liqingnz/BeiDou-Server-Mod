package org.gms.service;

import com.mybatisflex.core.query.QueryWrapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gms.client.Character;
import org.gms.dao.entity.MessageBoardDO;
import org.gms.dao.mapper.MessageBoardMapper;
import org.gms.util.I18nUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

import static org.gms.dao.entity.table.MessageBoardDOTableDef.MESSAGE_BOARD_D_O;

/**
 * 全服留言板。
 * <p>
 * 原实现在单例上挂了一个 {@code LinkedList} 做缓存，这里<b>不缓存</b>——每次开板直接查库。
 * 留言板是低频的 NPC 交互，一次 30 行的查询是毫秒级，而缓存换来的是三个必然的坑：
 * 单例上的裸 {@code LinkedList} 被多频道并发读写；冷启动装填顺序与内存态不一致；
 * 留言板为空时每次调用都白查一次库（{@code size() == 0} 恒真）。去掉缓存这三个一起消失。
 */
@Slf4j
@Service
@AllArgsConstructor
public class MessageBoardService {

    /**
     * 玩家单条留言的字数上限。校验的就是入库内容本身——名字与颜色码不入库，见 V1000.0.2 的注释。
     */
    private static final int CHARACTER_LIMIT = 40;

    /**
     * 留言板只保留最新的这么多条，超出的按时间淘汰。
     */
    private static final int MESSAGE_SIZE = 30;

    private final MessageBoardMapper messageBoardMapper;

    /**
     * 写一条留言，并把超出 {@link #MESSAGE_SIZE} 的旧留言删掉。
     *
     * @return 写入成功返回 true；内容超长或入库失败返回 false。<b>调用方要按返回值决定扣不扣钱</b>——
     * 原实现无论如何都返回 true，DB 抛异常时玩家照样被扣掉留言费。
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean addMessage(Character chr, String message) {
        if (message == null || message.isBlank() || message.length() > CHARACTER_LIMIT) {
            return false;
        }

        try {
            messageBoardMapper.insertSelective(MessageBoardDO.builder()
                    .characterId(chr.getId())
                    .characterName(chr.getName())
                    .message(message)
                    .isGm(chr.isGM())
                    .createTime(new Date())
                    .build());
            trimOldMessages();
            return true;
        } catch (Exception e) {
            log.error(I18nUtil.getLogMessage("MessageBoardService.addMessage.error1"), chr.getName(), chr.getId(), e);
            return false;
        }
    }

    /**
     * 渲染成 NPC 对话框里的文本，最新的在最上面。
     */
    public String getMessages() {
        List<MessageBoardDO> board = messageBoardMapper.selectListByQuery(QueryWrapper.create()
                .orderBy(MESSAGE_BOARD_D_O.ID.desc())
                .limit(MESSAGE_SIZE));

        StringBuilder sb = new StringBuilder(I18nUtil.getMessage("MessageBoard.message1")).append("\r\n");
        if (board.isEmpty()) {
            return sb.append(I18nUtil.getMessage("MessageBoard.message2")).append("\r\n").toString();
        }
        for (MessageBoardDO entry : board) {
            // 颜色码在这里才拼上，所以 GM 降级、玩家改名都不会改写已有留言的内容本身
            boolean gm = Boolean.TRUE.equals(entry.getIsGm());
            sb.append(gm ? "#e#b" : "#d")
                    .append(entry.getCharacterName())
                    .append(gm ? "#k#n: " : "#k: ")
                    .append(entry.getMessage())
                    .append("\r\n");
        }
        return sb.toString();
    }

    /**
     * 只留最新的 {@link #MESSAGE_SIZE} 条。
     * <p>
     * 排序一律按自增 id 而不是 create_time：{@code TIMESTAMP} 只到秒，同一秒内的多条留言
     * 分不出先后，而 id 单调递增，「查最新 N 条」与「删 id 小于第 N 条的」用同一个序才对得上。
     * <p>
     * 原实现是「循环 DELETE ... LIMIT 1」，每轮都在同一个变量上重新 prepare 且从不 close，
     * 多删几条就泄漏几个 {@code PreparedStatement}。这里查出第 30 条的 id，一条 DELETE 解决。
     */
    private void trimOldMessages() {
        List<MessageBoardDO> keep = messageBoardMapper.selectListByQuery(QueryWrapper.create()
                .select(MESSAGE_BOARD_D_O.ID)
                .orderBy(MESSAGE_BOARD_D_O.ID.desc())
                .limit(MESSAGE_SIZE));
        if (keep.size() < MESSAGE_SIZE) {
            return;
        }

        Integer oldestKeptId = keep.get(keep.size() - 1).getId();
        messageBoardMapper.deleteByQuery(QueryWrapper.create().where(MESSAGE_BOARD_D_O.ID.lt(oldestKeptId)));
    }
}
