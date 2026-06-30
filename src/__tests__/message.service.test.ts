import { MessageService } from "../services/message.service";
import { MessageRepository } from "../repositories/message.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";

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

    service = new MessageService();
    (service as unknown as { messageRepository: MessageRepository }).messageRepository =
      messageRepository;
    (service as unknown as { followRepository: FollowRepository }).followRepository =
      followRepository;
    (service as unknown as { userRepository: UserRepository }).userRepository =
      userRepository;
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
      "Hello"
    );
  });
});
