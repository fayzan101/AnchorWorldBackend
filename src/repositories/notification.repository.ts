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
        { user_id: id }, // notifications for the given user
        { user_id: IsNull() }, // notifications with no user (global)
      ],
      order: {
        created_at: "DESC", // optional: newest first
      },
    });
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
}
