import { AppDataSource } from "../config/database";
import { UserBlock } from "../entities/UserBlock.entity";

export class BlockRepository {
  private repo = () => AppDataSource.getRepository(UserBlock);

  async create(blockerId: string, blockedId: string): Promise<UserBlock> {
    const block = this.repo().create({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    return this.repo().save(block);
  }

  async findByPair(
    blockerId: string,
    blockedId: string
  ): Promise<UserBlock | null> {
    return this.repo().findOne({
      where: { blocker_id: blockerId, blocked_id: blockedId },
    });
  }

  async deleteByPair(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.repo().delete({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    return (result.affected ?? 0) > 0;
  }

  async findBlockedByUser(
    blockerId: string,
    page: number,
    limit: number
  ): Promise<{ items: UserBlock[]; total: number }> {
    const [items, total] = await this.repo().findAndCount({
      where: { blocker_id: blockerId },
      relations: ["blocked"],
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  /**
   * IDs the viewer blocked + IDs that blocked the viewer (bidirectional).
   */
  async findBlockedPairIds(userId: string): Promise<string[]> {
    const rows = await this.repo().find({
      where: [{ blocker_id: userId }, { blocked_id: userId }],
    });

    const ids = new Set<string>();
    for (const row of rows) {
      if (row.blocker_id === userId) {
        ids.add(row.blocked_id);
      } else {
        ids.add(row.blocker_id);
      }
    }
    return [...ids];
  }

  async isEitherBlocked(userId1: string, userId2: string): Promise<boolean> {
    const count = await this.repo()
      .createQueryBuilder("block")
      .where(
        "(block.blocker_id = :a AND block.blocked_id = :b) OR (block.blocker_id = :b AND block.blocked_id = :a)",
        { a: userId1, b: userId2 }
      )
      .getCount();
    return count > 0;
  }
}
