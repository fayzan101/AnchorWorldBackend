import { MessageService } from "../services/message.service";
import { MessageRepository } from "../repositories/message.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { ChatUnlockRepository } from "../repositories/chat-unlock.repository";
import { PointsService } from "../services/points.service";
import { PremiumService } from "../services/premium.service";
import { User } from "../entities/User.entity";
import { PointTypes } from "../constants/point-types";

jest.mock("../utils/block.util", () => ({
  isEitherBlocked: jest.fn().mockResolvedValue(false),
}));

describe("MessageService chat unlock", () => {
  const userId = "user-a";
  const peerId = "user-b";

  let messageRepository: jest.Mocked<MessageRepository>;
  let followRepository: jest.Mocked<FollowRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let chatUnlockRepository: jest.Mocked<ChatUnlockRepository>;
  let pointsService: jest.Mocked<PointsService>;
  let premiumService: jest.Mocked<PremiumService>;
  let service: MessageService;

  beforeEach(() => {
    messageRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<MessageRepository>;
    followRepository = {
      checkMutualFollow: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<FollowRepository>;
    userRepository = {
      findById: jest.fn().mockResolvedValue({ id: peerId, full_name: "Peer" } as User),
    } as unknown as jest.Mocked<UserRepository>;
    chatUnlockRepository = {
      isUnlocked: jest.fn().mockResolvedValue(false),
      findPair: jest.fn().mockResolvedValue(null),
      countUnlockedBy: jest.fn().mockResolvedValue(0),
      createUnlock: jest.fn().mockResolvedValue({ id: "unlock-1" }),
    } as unknown as jest.Mocked<ChatUnlockRepository>;
    pointsService = {
      getBalance: jest.fn().mockResolvedValue({ balance: 250, lifetime_earned: 250 }),
      spendPoints: jest.fn().mockResolvedValue({ balance: 230, spent: 20 }),
    } as unknown as jest.Mocked<PointsService>;
    premiumService = {
      ensurePlansActive: jest.fn().mockResolvedValue({
        id: userId,
        is_premium: false,
        is_basic: false,
      } as User),
      effectivePlan: jest.fn().mockReturnValue("free"),
    } as unknown as jest.Mocked<PremiumService>;

    service = new MessageService(
      messageRepository,
      followRepository,
      userRepository,
      chatUnlockRepository,
      pointsService,
      premiumService
    );
  });

  it("blocks send when free and not unlocked", async () => {
    await expect(service.sendMessage(userId, peerId, "hi")).rejects.toMatchObject({
      statusCode: 403,
      code: "CHAT_LOCKED",
    });
  });

  it("allows send when Basic/Premium", async () => {
    premiumService.effectivePlan.mockReturnValue("basic");
    messageRepository.create.mockResolvedValue({
      id: "m1",
      sender_id: userId,
      receiver_id: peerId,
      content: "hi",
      is_read: false,
      created_at: new Date(),
    } as never);
    userRepository.findById.mockImplementation(async (id: string) => {
      if (id === userId) {
        return { id: userId, full_name: "Me", profile_picture: null } as User;
      }
      return { id: peerId, full_name: "Peer", profile_picture: null } as User;
    });

    const msg = await service.sendMessage(userId, peerId, "hi");
    expect(msg.content).toBe("hi");
    expect(chatUnlockRepository.isUnlocked).not.toHaveBeenCalled();
  });

  it("unlocks chat by spending unlock cost points", async () => {
    pointsService.getBalance.mockResolvedValue({
      balance: 250,
      lifetime_earned: 250,
    });
    chatUnlockRepository.isUnlocked
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    chatUnlockRepository.countUnlockedBy.mockResolvedValue(1);

    const result = await service.unlockChat(userId, peerId);

    expect(pointsService.spendPoints).toHaveBeenCalledWith(
      userId,
      20,
      PointTypes.CHAT_UNLOCK_SPENT,
      expect.stringContaining("chat_unlock:"),
      "Chat unlock"
    );
    expect(chatUnlockRepository.createUnlock).toHaveBeenCalled();
    expect(result.unlocked).toBe(true);
    expect(result.points_spent).toBe(20);
  });

  it("rejects unlock when slot limit reached", async () => {
    chatUnlockRepository.countUnlockedBy.mockResolvedValue(2);

    await expect(service.unlockChat(userId, peerId)).rejects.toMatchObject({
      code: "CHAT_SLOT_LIMIT",
    });
  });
});
