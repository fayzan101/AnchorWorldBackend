import { MessageService } from "../services/message.service";
import { MessageRepository } from "../repositories/message.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { ChatUnlockRepository } from "../repositories/chat-unlock.repository";
import { PointsService } from "../services/points.service";
import { PremiumService } from "../services/premium.service";
import { User } from "../entities/User.entity";

jest.mock("../utils/block.util", () => ({
  isEitherBlocked: jest.fn().mockResolvedValue(false),
}));

import { isEitherBlocked } from "../utils/block.util";

describe("MessageService", () => {
  const senderId = "user-a";
  const receiverId = "user-b";
  let messageRepository: jest.Mocked<MessageRepository>;
  let followRepository: jest.Mocked<FollowRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let chatUnlockRepository: jest.Mocked<ChatUnlockRepository>;
  let pointsService: jest.Mocked<PointsService>;
  let premiumService: jest.Mocked<PremiumService>;
  let service: MessageService;

  beforeEach(() => {
    jest.mocked(isEitherBlocked).mockResolvedValue(false);

    messageRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<MessageRepository>;

    followRepository = {
      checkMutualFollow: jest.fn(),
    } as unknown as jest.Mocked<FollowRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    chatUnlockRepository = {
      isUnlocked: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ChatUnlockRepository>;

    pointsService = {
      getBalance: jest.fn(),
      spendPoints: jest.fn(),
    } as unknown as jest.Mocked<PointsService>;

    premiumService = {
      ensurePlansActive: jest.fn().mockResolvedValue({
        id: senderId,
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

  it("rejects message when users are blocked", async () => {
    jest.mocked(isEitherBlocked).mockResolvedValue(true);

    await expect(
      service.sendMessage(senderId, receiverId, "hi")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Cannot message this user",
    });
  });

  it("rejects message when users are not connected", async () => {
    followRepository.checkMutualFollow.mockResolvedValue(false);

    await expect(
      service.sendMessage(senderId, receiverId, "hi")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Can only message users you are connected with",
    });
  });

  it("sends message when users are connected", async () => {
    followRepository.checkMutualFollow.mockResolvedValue(true);
    messageRepository.create.mockResolvedValue({
      id: "msg-1",
      sender_id: senderId,
      receiver_id: receiverId,
      content: "Hello",
      is_read: false,
      created_at: new Date(),
    } as never);
    userRepository.findById.mockResolvedValue({
      full_name: "Alice",
      profile_picture: null,
    } as never);

    const result = await service.sendMessage(senderId, receiverId, "Hello");

    expect(result.content).toBe("Hello");
    expect(messageRepository.create).toHaveBeenCalledWith(
      senderId,
      receiverId,
      "Hello",
      null
    );
    expect(chatUnlockRepository.isUnlocked).toHaveBeenCalledWith(
      senderId,
      receiverId
    );
  });

  it("sends without unlock check when sender has Basic", async () => {
    premiumService.effectivePlan.mockReturnValue("basic");
    followRepository.checkMutualFollow.mockResolvedValue(true);
    messageRepository.create.mockResolvedValue({
      id: "msg-2",
      sender_id: senderId,
      receiver_id: receiverId,
      content: "Hi",
      is_read: false,
      created_at: new Date(),
    } as never);
    userRepository.findById.mockResolvedValue({
      full_name: "Alice",
      profile_picture: null,
    } as never);

    await service.sendMessage(senderId, receiverId, "Hi");

    expect(chatUnlockRepository.isUnlocked).not.toHaveBeenCalled();
  });
});
