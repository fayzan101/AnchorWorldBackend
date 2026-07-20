import { AppDataSource } from "../config/database";
import { ChatUnlock, normalizeChatPair } from "../entities/ChatUnlock.entity";

export class ChatUnlockRepository {
  private repository = AppDataSource.getRepository(ChatUnlock);

  async findPair(userId1: string, userId2: string): Promise<ChatUnlock | null> {
    const { user_a, user_b } = normalizeChatPair(userId1, userId2);
    return this.repository.findOne({ where: { user_a, user_b } });
  }

  async isUnlocked(userId1: string, userId2: string): Promise<boolean> {
    const row = await this.findPair(userId1, userId2);
    return Boolean(row);
  }

  /** Count distinct partners this user has unlocked (as initiator) or is in. */
  async countUnlockedBy(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder("u")
      .where("u.unlocked_by = :userId", { userId })
      .getCount();
  }

  async countPartnersForUser(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder("u")
      .where("u.user_a = :userId OR u.user_b = :userId", { userId })
      .getCount();
  }

  async createUnlock(opts: {
    userId1: string;
    userId2: string;
    unlockedBy: string;
    pointsSpent: number;
  }): Promise<ChatUnlock> {
    const { user_a, user_b } = normalizeChatPair(opts.userId1, opts.userId2);
    const existing = await this.findPair(opts.userId1, opts.userId2);
    if (existing) return existing;

    const row = this.repository.create({
      user_a,
      user_b,
      unlocked_by: opts.unlockedBy,
      points_spent: opts.pointsSpent,
    });
    return this.repository.save(row);
  }
}
