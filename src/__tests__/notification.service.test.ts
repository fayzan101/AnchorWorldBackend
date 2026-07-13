import {
  NotificationService,
  NotificationType,
} from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { UserRepository } from "../repositories/user.repository";
import { User } from "../entities/User.entity";
import {
  emitPostCommented,
  emitPostLiked,
  emitVideoCallAccepted,
  emitVideoCallRequest,
} from "../services/socket-event.service";

jest.mock("../config/firebase", () => ({
  getMessaging: jest.fn(),
}));

jest.mock("../services/socket-event.service", () => ({
  emitPostLiked: jest.fn(),
  emitPostCommented: jest.fn(),
  emitVideoCallRequest: jest.fn(),
  emitVideoCallAccepted: jest.fn(),
}));

import { getMessaging } from "../config/firebase";

describe("NotificationService", () => {
  let userRepository: jest.Mocked<UserRepository>;
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let service: NotificationService;
  let sendMock: jest.Mock;

  const receiverId = "receiver-1";
  const actorId = "actor-1";

  beforeEach(() => {
    jest.clearAllMocks();

    sendMock = jest.fn().mockResolvedValue("message-id");
    jest.mocked(getMessaging).mockReturnValue({
      send: sendMock,
    } as never);

    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    notificationRepository = {
      create: jest.fn().mockResolvedValue({ id: "notif-1" }),
      findByUserId: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    userRepository.findById.mockResolvedValue({
      id: receiverId,
      fcm_token: "fcm-token",
      notifications_enabled: true,
    } as User);

    service = new NotificationService(userRepository, notificationRepository);
  });

  it("persists and pushes post liked notification with socket event", async () => {
    const result = await service.notifyPostLiked(
      receiverId,
      actorId,
      "Alex",
      "post-1"
    );

    expect(result).toBe(true);
    expect(emitPostLiked).toHaveBeenCalledWith(receiverId, {
      post_id: "post-1",
      user_id: actorId,
      user_name: "Alex",
    });
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: receiverId,
        type: NotificationType.POST_LIKED,
        data: expect.objectContaining({ postId: "post-1", userId: actorId }),
      })
    );
    expect(sendMock).toHaveBeenCalled();
  });

  it("skips post liked notification for self-like", async () => {
    const result = await service.notifyPostLiked(
      receiverId,
      receiverId,
      "Alex",
      "post-1"
    );

    expect(result).toBe(false);
    expect(emitPostLiked).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it("persists and pushes post commented notification with socket event", async () => {
    const result = await service.notifyPostCommented(
      receiverId,
      actorId,
      "Sam",
      "post-1",
      "comment-1"
    );

    expect(result).toBe(true);
    expect(emitPostCommented).toHaveBeenCalledWith(receiverId, {
      post_id: "post-1",
      comment_id: "comment-1",
      user_id: actorId,
    });
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.POST_COMMENTED,
      })
    );
  });

  it("uses connection_made type for notifyConnectionMade", async () => {
    await service.notifyConnectionMade(receiverId, "Jordan", actorId);

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CONNECTION_MADE,
        data: expect.objectContaining({ userId: actorId }),
      })
    );
  });

  it("sends high-priority video intro request notification", async () => {
    await service.notifyVideoIntroRequest(
      receiverId,
      actorId,
      "Taylor",
      "call-1"
    );

    expect(emitVideoCallRequest).toHaveBeenCalledWith(receiverId, {
      call_id: "call-1",
      caller_id: actorId,
      caller_name: "Taylor",
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apns: expect.objectContaining({
          headers: { "apns-priority": "10" },
        }),
      })
    );
  });

  it("emits video call accepted socket event", async () => {
    await service.notifyVideoCallAccepted(actorId, "call-1");

    expect(emitVideoCallAccepted).toHaveBeenCalledWith(actorId, {
      call_id: "call-1",
    });
  });

  it("notifies points milestone when balance is at least 500", async () => {
    const result = await service.notifyPointsMilestone(receiverId, 520);

    expect(result).toBe(true);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.POINTS_EARNED,
        data: expect.objectContaining({ balance: "520" }),
      })
    );
  });

  it("returns formatted notifications with data payload", async () => {
    notificationRepository.findByUserId.mockResolvedValue([
      {
        id: "notif-1",
        title: "Post Liked",
        body: "Alex liked your post",
        type: NotificationType.POST_LIKED,
        data: { screen: "Post", postId: "post-1" },
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      } as never,
    ]);

    const result = await service.getNotifications(receiverId);

    expect(result).toEqual([
      expect.objectContaining({
        id: "notif-1",
        type: NotificationType.POST_LIKED,
        data: { screen: "Post", postId: "post-1" },
      }),
    ]);
  });
});
