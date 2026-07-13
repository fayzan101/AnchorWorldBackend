import { BlockRepository } from "../repositories/block.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import { toPublicUser } from "../utils/user-response.mapper";

export class BlockService {
  private blockRepository: BlockRepository;
  private userRepository: UserRepository;

  constructor(
    blockRepository?: BlockRepository,
    userRepository?: UserRepository
  ) {
    this.blockRepository = blockRepository ?? new BlockRepository();
    this.userRepository = userRepository ?? new UserRepository();
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError("You cannot block yourself", 400);
    }

    const target = await this.userRepository.findById(blockedId);
    if (!target) {
      throw new AppError("User not found", 404);
    }

    const existing = await this.blockRepository.findByPair(blockerId, blockedId);
    if (existing) {
      throw new AppError("User is already blocked", 409);
    }

    const block = await this.blockRepository.create(blockerId, blockedId);
    return {
      id: block.id,
      blocker_id: block.blocker_id,
      blocked_id: block.blocked_id,
      created_at: block.created_at,
    };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const deleted = await this.blockRepository.deleteByPair(
      blockerId,
      blockedId
    );
    if (!deleted) {
      throw new AppError("Block not found", 404);
    }
    return { blocked_id: blockedId, unblocked: true };
  }

  async listBlocked(blockerId: string, page = 1, limit = 20) {
    const { items, total } = await this.blockRepository.findBlockedByUser(
      blockerId,
      page,
      limit
    );

    return {
      items: items.map((block) => ({
        id: block.id,
        blocked_id: block.blocked_id,
        blocked_user: block.blocked
          ? toPublicUser(block.blocked, {})
          : { id: block.blocked_id },
        created_at: block.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.blockRepository.findBlockedPairIds(userId);
  }

  async isEitherBlocked(userId1: string, userId2: string): Promise<boolean> {
    return this.blockRepository.isEitherBlocked(userId1, userId2);
  }
}
