import { BlockService } from "../services/block.service";
import { BlockRepository } from "../repositories/block.repository";
import { UserRepository } from "../repositories/user.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { AppError } from "../middleware/error.middleware";
import { User } from "../entities/User.entity";
import { UserBlock } from "../entities/UserBlock.entity";
import { Follow } from "../entities/Follow.entity";

describe("BlockService", () => {
  const blockerId = "blocker-id";
  const blockedId = "blocked-id";
  let blockRepository: jest.Mocked<BlockRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let followRepository: jest.Mocked<FollowRepository>;
  let service: BlockService;

  beforeEach(() => {
    blockRepository = {
      findBlock: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
      isEitherBlocked: jest.fn(),
      getBlockedUserIds: jest.fn(),
      listBlockedUsers: jest.fn(),
    } as unknown as jest.Mocked<BlockRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    followRepository = {
      findByUsers: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<FollowRepository>;

    service = new BlockService(
      blockRepository,
      userRepository,
      followRepository
    );
  });

  it("blocks a user and removes mutual follows", async () => {
    userRepository.findById.mockResolvedValue({ id: blockedId } as User);
    blockRepository.findBlock.mockResolvedValue(null);
    blockRepository.blockUser.mockResolvedValue({
      id: "block-1",
      blocker_id: blockerId,
      blocked_id: blockedId,
      created_at: new Date(),
    } as UserBlock);
    followRepository.findByUsers
      .mockResolvedValueOnce({ id: "f1" } as Follow)
      .mockResolvedValueOnce({ id: "f2" } as Follow);

    const result = await service.blockUser(blockerId, blockedId);

    expect(result.blocked_user_id).toBe(blockedId);
    expect(followRepository.delete).toHaveBeenCalledTimes(2);
  });

  it("rejects blocking yourself", async () => {
    await expect(service.blockUser(blockerId, blockerId)).rejects.toBeInstanceOf(
      AppError
    );
  });

  it("returns blocked user ids from repository", async () => {
    blockRepository.getBlockedUserIds.mockResolvedValue(["a", "b"]);
    const ids = await service.getBlockedUserIds(blockerId);
    expect(ids).toEqual(["a", "b"]);
  });
});
