import { AppDataSource } from "../config/database";
import { UserBlock } from "../entities/UserBlock.entity";
import { User } from "../entities/User.entity";

export class BlockRepository {
  private repo = () => AppDataSource.getRepository(UserBlock);

  async blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
    const block = this.repo().create({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    return this.repo().save(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.repo().delete({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    return (result.affected ?? 0) > 0;
  }

  async findBlock(
    blockerId: string,
    blockedId: string
  ): Promise<UserBlock | null> {
    return this.repo().findOne({
      where: { blocker_id: blockerId, blocked_id: blockedId },
    });
  }

  async isEitherBlocked(user1Id: string, user2Id: string): Promise<boolean> {
    const count = await this.repo()
      .createQueryBuilder("block")
      .where(
        "(block.blocker_id = :user1 AND block.blocked_id = :user2) OR (block.blocker_id = :user2 AND block.blocked_id = :user1)",
        { user1: user1Id, user2: user2Id }
      )
      .getCount();
    return count > 0;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocked = await this.repo().find({
      where: { blocker_id: userId },
      select: ["blocked_id"],
    });
    const blockedBy = await this.repo().find({
      where: { blocked_id: userId },
      select: ["blocker_id"],
    });

    return [
      ...new Set([
        ...blocked.map((row) => row.blocked_id),
        ...blockedBy.map((row) => row.blocker_id),
      ]),
    ];
  }

  async listBlockedUsers(
    blockerId: string,
    page = 1,
    limit = 20
  ): Promise<{ items: User[]; total: number }> {
    const qb = this.repo()
      .createQueryBuilder("block")
      .innerJoinAndSelect("block.blocked", "user")
      .where("block.blocker_id = :blockerId", { blockerId })
      .orderBy("block.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [blocks, total] = await qb.getManyAndCount();
    return {
      items: blocks.map((block) => block.blocked),
      total,
    };
  }
}
