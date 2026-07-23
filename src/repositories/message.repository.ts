import { AppDataSource } from '../config/database';
import { Message, MessageType } from '../entities/Message.entity';
import { MessageHide } from '../entities/MessageHide.entity';

export class MessageRepository {
  private repository = AppDataSource.getRepository(Message);
  private hideRepository = AppDataSource.getRepository(MessageHide);

  async create(
    senderId: string,
    receiverId: string,
    content: string,
    replyToMessageId?: string | null,
    opts?: {
      messageType?: string;
      mediaUrl?: string | null;
      durationMs?: number | null;
    }
  ): Promise<Message> {
    const message = this.repository.create({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      reply_to_message_id: replyToMessageId ?? null,
      message_type: (opts?.messageType as MessageType) ?? MessageType.TEXT,
      media_url: opts?.mediaUrl ?? null,
      duration_ms: opts?.durationMs ?? null,
    });
    const saved = await this.repository.save(message);
    return (await this.findById(saved.id))!;
  }

  async updateContent(messageId: string, content: string): Promise<Message | null> {
    await this.repository.update(messageId, {
      content,
      edited_at: new Date(),
    });
    return await this.findById(messageId);
  }

  async findById(id: string): Promise<Message | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['sender', 'receiver', 'reply_to'],
    });
  }

  async getChatHistory(
    user1Id: string,
    user2Id: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .leftJoinAndSelect('message.reply_to', 'reply_to')
      .where(
        '(message.sender_id = :user1Id AND message.receiver_id = :user2Id) OR (message.sender_id = :user2Id AND message.receiver_id = :user1Id)',
        { user1Id, user2Id }
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM message_hides mh
          WHERE mh.message_id = message.id AND mh.user_id = :viewerId
        )`,
        { viewerId: user1Id }
      )
      .orderBy('message.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [messages, total] = await query.getManyAndCount();

    return { messages: messages.reverse(), total };
  }

  async markAsRead(messageId: string): Promise<Message | null> {
    await this.repository.update(messageId, {
      is_read: true,
      read_at: new Date(),
    });
    return await this.findById(messageId);
  }

  async markAllAsRead(senderId: string, receiverId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Message)
      .set({
        is_read: true,
        read_at: new Date(),
      })
      .where(
        'sender_id = :senderId AND receiver_id = :receiverId AND is_read = :isRead AND deleted_at IS NULL',
        {
          senderId,
          receiverId,
          isRead: false,
        }
      )
      .execute();
  }

  async getUnreadCount(receiverId: string, senderId?: string): Promise<number> {
    const query = this.repository
      .createQueryBuilder('message')
      .where(
        'message.receiver_id = :receiverId AND message.is_read = :isRead AND message.deleted_at IS NULL',
        {
          receiverId,
          isRead: false,
        }
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM message_hides mh
          WHERE mh.message_id = message.id AND mh.user_id = :receiverId
        )`
      );

    if (senderId) {
      query.andWhere('message.sender_id = :senderId', { senderId });
    }

    return await query.getCount();
  }

  async hideForUser(messageId: string, userId: string): Promise<void> {
    const existing = await this.hideRepository.findOne({
      where: { message_id: messageId, user_id: userId },
    });
    if (existing) return;
    await this.hideRepository.save(
      this.hideRepository.create({ message_id: messageId, user_id: userId })
    );
  }

  async softDeleteForEveryone(
    messageId: string,
    deletedByUserId: string
  ): Promise<Message | null> {
    await this.repository.update(messageId, {
      deleted_at: new Date(),
      deleted_by_user_id: deletedByUserId,
      content: '',
      media_url: null,
    });
    return await this.findById(messageId);
  }

  async getConversations(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        latest.peer_id as user_id,
        u.full_name,
        u.profile_picture,
        u.is_online,
        u.last_seen,
        CASE
          WHEN m.deleted_at IS NOT NULL THEN NULL
          WHEN m.message_type = 'voice' THEN 'Voice message'
          ELSE m.content
        END as last_message_content,
        m.created_at as last_message_time,
        m.is_read as last_message_is_read,
        m.sender_id as last_message_sender_id,
        m.deleted_at as last_message_deleted_at,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE receiver_id = ?
            AND sender_id = latest.peer_id 
            AND is_read = false
            AND deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM message_hides mh
              WHERE mh.message_id = messages.id AND mh.user_id = ?
            )
        ) as unread_count
      FROM (
        SELECT 
          CASE 
            WHEN sender_id = ? THEN receiver_id 
            ELSE sender_id 
          END as peer_id,
          MAX(created_at) as max_time
        FROM messages
        WHERE (sender_id = ? OR receiver_id = ?)
          AND NOT EXISTS (
            SELECT 1 FROM message_hides mh
            WHERE mh.message_id = messages.id AND mh.user_id = ?
          )
        GROUP BY peer_id
      ) latest
      INNER JOIN messages m ON m.id = (
        SELECT m2.id
        FROM messages m2
        WHERE m2.created_at = latest.max_time
          AND (
            (m2.sender_id = ? AND m2.receiver_id = latest.peer_id)
            OR (m2.receiver_id = ? AND m2.sender_id = latest.peer_id)
          )
          AND NOT EXISTS (
            SELECT 1 FROM message_hides mh
            WHERE mh.message_id = m2.id AND mh.user_id = ?
          )
        ORDER BY m2.created_at DESC, m2.id DESC
        LIMIT 1
      )
      INNER JOIN users u ON u.id = latest.peer_id
      ORDER BY m.created_at DESC
    `;

    return await this.repository.query(query, [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteConversation(user1Id: string, user2Id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where(
        '(sender_id = :user1Id AND receiver_id = :user2Id) OR (sender_id = :user2Id AND receiver_id = :user1Id)',
        { user1Id, user2Id }
      )
      .execute();
  }
}
