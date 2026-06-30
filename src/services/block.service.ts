import { BlockRepository } from "../repositories/block.repository";
import { UserRepository } from "../repositories/user.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { AppError } from "../middleware/error.middleware";

export class BlockService {
  private blockRepository: BlockRepository;
  private userRepository: UserRepository;
  private followRepository: FollowRepository;

  constructor(
    blockRepository?: BlockRepository,
    userRepository?: UserRepository,
    followRepository?: FollowRepository
  ) {
    this.blockRepository = blockRepository ?? new BlockRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.followRepository = followRepository ?? new FollowRepository();
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError("Cannot block yourself", 400);
    }

    const user = await this.userRepository.findById(blockedId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const existing = await this.blockRepository.findBlock(blockerId, blockedId);
    if (existing) {
      throw new AppError("User already blocked", 409);
    }

    const block = await this.blockRepository.blockUser(blockerId, blockedId);
    await this.removeMutualFollows(blockerId, blockedId);

    return {
      id: block.id,
      blocked_user_id: blockedId,
      created_at: block.created_at,
    };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const removed = await this.blockRepository.unblockUser(blockerId, blockedId);
    if (!removed) {
      throw new AppError("Block not found", 404);
    }
    return { message: "User unblocked successfully" };
  }

  async listBlockedUsers(blockerId: string, page = 1, limit = 20) {
    const { items, total } = await this.blockRepository.listBlockedUsers(
      blockerId,
      page,
      limit
    );

    return {
      items: items.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        profile_picture: user.profile_picture,
        bio: user.bio,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async isEitherBlocked(user1Id: string, user2Id: string): Promise<boolean> {
    return this.blockRepository.isEitherBlocked(user1Id, user2Id);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.blockRepository.getBlockedUserIds(userId);
  }

  private async removeMutualFollows(user1Id: string, user2Id: string) {
    const follow1 = await this.followRepository.findByUsers(user1Id, user2Id);
    const follow2 = await this.followRepository.findByUsers(user2Id, user1Id);

    if (follow1) {
      await this.followRepository.delete(follow1.id);
    }
    if (follow2) {
      await this.followRepository.delete(follow2.id);
    }
  }
}
