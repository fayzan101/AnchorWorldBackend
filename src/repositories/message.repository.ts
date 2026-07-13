import { AppDataSource } from '../config/database';
import { Message } from '../entities/Message.entity';

export class MessageRepository {
  private repository = AppDataSource.getRepository(Message);

  async create(senderId: string, receiverId: string, content: string): Promise<Message> {
    const message = this.repository.create({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    });
    return await this.repository.save(message);
  }

  async findById(id: string): Promise<Message | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['sender', 'receiver'],
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
      .where(
        '(message.sender_id = :user1Id AND message.receiver_id = :user2Id) OR (message.sender_id = :user2Id AND message.receiver_id = :user1Id)',
        { user1Id, user2Id }
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
      .where('sender_id = :senderId AND receiver_id = :receiverId AND is_read = :isRead', {
        senderId,
        receiverId,
        isRead: false,
      })
      .execute();
  }

  async getUnreadCount(receiverId: string, senderId?: string): Promise<number> {
    const query = this.repository
      .createQueryBuilder('message')
      .where('message.receiver_id = :receiverId AND message.is_read = :isRead', {
        receiverId,
        isRead: false,
      });

    if (senderId) {
      query.andWhere('message.sender_id = :senderId', { senderId });
    }

    return await query.getCount();
  }

  async getConversations(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as user_id,
        u.full_name,
        u.profile_picture,
        u.is_online,
        u.last_seen,
        m.content as last_message_content,
        m.created_at as last_message_time,
        m.is_read as last_message_is_read,
        m.sender_id as last_message_sender_id,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE receiver_id = ? 
            AND sender_id = user_id 
            AND is_read = false
        ) as unread_count
      FROM messages m
      INNER JOIN users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id 
        ELSE m.sender_id 
      END
      WHERE m.id IN (
        SELECT MAX(id)
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY 
          CASE 
            WHEN sender_id = ? THEN receiver_id 
            ELSE sender_id 
          END
      )
      ORDER BY m.created_at DESC
    `;

    return await this.repository.query(query, [
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