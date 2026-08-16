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
     * <p>
     * <b>异常故意不在这里 catch</b>，要让它穿出事务代理，Spring 才会回滚。在事务方法内部捕获再
     * {@code return false}，Spring 看到的是正常返回，insert 照样提交 —— 结果是 trim 失败时留言进了库、
     * 调用方却因为收到 false 不扣钱，白送一条。调用方
     * {@code AbstractPlayerInteraction.addMessageBoardEntry} 负责兜住异常并转成 false。
     *
     * @throws IllegalArgumentException 内容为空或超长
     */
    @Transactional(rollbackFor = Exception.class)
    public void addMessage(Character chr, String message) {
        String sanitized = sanitize(message);
        if (sanitized.isEmpty() || sanitized.length() > CHARACTER_LIMIT) {
            throw new IllegalArgumentException("message board entry rejected, length=" + sanitized.length());
        }

        messageBoardMapper.insertSelective(MessageBoardDO.builder()
                .characterId(chr.getId())
                .characterName(chr.getName())
                .message(sanitized)
                .isGm(chr.isGM())
                .createTime(new Date())
                .build());
        trimOldMessages();
    }

    /**
     * 留言原文会被直接拼进 NPC 富文本，必须先把控制字符清掉。
     * <p>
     * 不清的话，普通玩家输入 {@code #e#b} 加换行就能在留言板上伪造出一行 GM 样式的假留言，
     * {@code is_gm} 那点视觉区分形同虚设；{@code #L..#} 之类还会插进 NPC 的可选择链接。
     * 长度校验放在清洗<b>之后</b>，量的是真正入库的内容。
     */
    private static String sanitize(String message) {
        if (message == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(message.length());
        message.codePoints().forEach(cp -> {
            // 全限定名是必须的：本文件 import 的 Character 是 org.gms.client.Character
            // '#' 是 NPC 富文本的控制码前缀；ISOControl 覆盖 C0/C1（含换行回车）；
            // FORMAT 覆盖零宽空格 U+200B、BOM U+FEFF、RLO U+202E 这类不可见字符——
            // 它们伪造不了 GM 行，但能拼出「看着全空却收了 50 万」或视觉倒序的留言
            if (cp == '#' || java.lang.Character.isISOControl(cp)
                    || java.lang.Character.getType(cp) == java.lang.Character.FORMAT) {
                return;
            }
            sb.appendCodePoint(cp);
        });
        return sb.toString().trim();
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
