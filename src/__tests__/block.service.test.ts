import { BlockService } from "../services/block.service";
import { BlockRepository } from "../repositories/block.repository";
import { UserRepository } from "../repositories/user.repository";
import { UserBlock } from "../entities/UserBlock.entity";
import { User } from "../entities/User.entity";

describe("BlockService", () => {
  const blockerId = "user-a";
  const blockedId = "user-b";
  let blockRepository: jest.Mocked<BlockRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let service: BlockService;

  const mockUser = (id: string) =>
    ({
      id,
      full_name: "Test User",
      date_of_birth: new Date("1990-01-01"),
      gender: "male",
      bio: null,
      profile_picture: null,
      city: null,
      country: null,
      location_opt_in: false,
      humor_type: null,
      love_language: null,
      hobbies: [],
    }) as unknown as User;

  beforeEach(() => {
    blockRepository = {
      create: jest.fn(),
      findByPair: jest.fn(),
      deleteByPair: jest.fn(),
      findBlockedByUser: jest.fn(),
      findBlockedPairIds: jest.fn(),
      isEitherBlocked: jest.fn(),
    } as unknown as jest.Mocked<BlockRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    service = new BlockService(blockRepository, userRepository);
  });

  it("blocks a user", async () => {
    userRepository.findById.mockResolvedValue(mockUser(blockedId));
    blockRepository.findByPair.mockResolvedValue(null);
    blockRepository.create.mockResolvedValue({
      id: "block-1",
      blocker_id: blockerId,
      blocked_id: blockedId,
      created_at: new Date("2026-01-01"),
    } as UserBlock);

    const result = await service.blockUser(blockerId, blockedId);

    expect(result.blocked_id).toBe(blockedId);
    expect(blockRepository.create).toHaveBeenCalledWith(blockerId, blockedId);
  });

  it("rejects blocking yourself", async () => {
    await expect(service.blockUser(blockerId, blockerId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects blocking unknown user", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(service.blockUser(blockerId, blockedId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("rejects duplicate block", async () => {
    userRepository.findById.mockResolvedValue(mockUser(blockedId));
    blockRepository.findByPair.mockResolvedValue({
      id: "block-1",
    } as UserBlock);

    await expect(service.blockUser(blockerId, blockedId)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("unblocks a user", async () => {
    blockRepository.deleteByPair.mockResolvedValue(true);

    const result = await service.unblockUser(blockerId, blockedId);

    expect(result).toEqual({ blocked_id: blockedId, unblocked: true });
  });

  it("returns 404 when unblock target is not blocked", async () => {
    blockRepository.deleteByPair.mockResolvedValue(false);

    await expect(
      service.unblockUser(blockerId, blockedId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lists blocked users", async () => {
    blockRepository.findBlockedByUser.mockResolvedValue({
      items: [
        {
          id: "block-1",
          blocker_id: blockerId,
          blocked_id: blockedId,
          created_at: new Date("2026-01-01"),
          blocked: mockUser(blockedId),
        } as UserBlock,
      ],
      total: 1,
    });

    const result = await service.listBlocked(blockerId, 1, 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].blocked_id).toBe(blockedId);
    expect(result.pagination.total).toBe(1);
  });
});
