import { IsNull } from "typeorm";
import { AppDataSource } from "../config/database";
import { Notification } from "../entities/Notification.entity";
export class NotificationRepository {
  private repository = AppDataSource.getRepository(Notification);

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const notification = this.repository.create(notificationData);
    return await this.repository.save(notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByUserId(id: string): Promise<Notification[]> {
    return await this.repository.find({
      where: [
        { user_id: id },
        { user_id: IsNull() },
      ],
      order: {
        created_at: "DESC",
      },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return await this.repository.count({
      where: [
        { user_id: userId, is_read: false },
        { user_id: IsNull(), is_read: false },
      ],
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.repository.findOne({
      where: [
        { id, user_id: userId },
        { id, user_id: IsNull() },
      ],
    });
    if (!notification) return null;
    if (!notification.is_read) {
      notification.is_read = true;
      return await this.repository.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where("(user_id = :userId OR user_id IS NULL) AND is_read = false", {
        userId,
      })
      .execute();
    return result.affected ?? 0;
  }

  async findAll(): Promise<Notification[]> {
    return await this.repository.find();
  }

  async update(id: string, notificationData: Partial<Notification>): Promise<Notification | null> {
    await this.repository.update(id, notificationData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteAllForUser(userId: string): Promise<number> {
    const result = await this.repository.delete({ user_id: userId });
    return result.affected ?? 0;
  }
}
