import { VideoCallService } from "../services/video-call.service";
import { VideoCallRepository } from "../repositories/video-call.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "../services/points.service";
import { AgoraService } from "../services/agora.service";
import { NotificationService } from "../services/notification.service";
import { AppError } from "../middleware/error.middleware";
import { VideoCall, VideoCallStatus } from "../entities/VideoCall.entity";
import { User } from "../entities/User.entity";
import { PointTypes } from "../constants/point-types";

jest.mock("../utils/block.util", () => ({
  isEitherBlocked: jest.fn().mockResolvedValue(false),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "call-uuid-123"),
}));

describe("VideoCallService", () => {
  const callerId = "caller-id";
  const calleeId = "callee-id";
  let videoCallRepository: jest.Mocked<VideoCallRepository>;
  let followRepository: jest.Mocked<FollowRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let pointsService: jest.Mocked<PointsService>;
  let agoraService: jest.Mocked<AgoraService>;
  let notificationService: jest.Mocked<NotificationService>;
  let service: VideoCallService;

  const mockCall = (overrides: Partial<VideoCall> = {}) =>
    ({
      id: "call-uuid-123",
      caller_id: callerId,
      callee_id: calleeId,
      status: VideoCallStatus.PENDING,
      duration_minutes: 5,
      points_spent: 500,
      channel_name: "call-uuid-123",
      started_at: null,
      ended_at: null,
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as VideoCall;

  beforeEach(() => {
    videoCallRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      countRequestsToday: jest.fn(),
      findHistory: jest.fn(),
    } as unknown as jest.Mocked<VideoCallRepository>;

    followRepository = {
      checkMutualFollow: jest.fn(),
    } as unknown as jest.Mocked<FollowRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    pointsService = {
      spendPoints: jest.fn(),
      awardPoints: jest.fn(),
      awardPointsOncePerReference: jest.fn(),
    } as unknown as jest.Mocked<PointsService>;

    agoraService = {
      generateRtcToken: jest.fn(),
    } as unknown as jest.Mocked<AgoraService>;

    notificationService = {
      notifyVideoIntroRequest: jest.fn().mockResolvedValue(true),
      notifyVideoCallAccepted: jest.fn().mockResolvedValue(true),
      notifyVideoCallRejected: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<NotificationService>;

    service = new VideoCallService(
      videoCallRepository,
      followRepository,
      userRepository,
      pointsService,
      agoraService,
      notificationService
    );
  });

  it("requests intro and spends points", async () => {
    userRepository.findById
      .mockResolvedValueOnce({ id: calleeId } as User)
      .mockResolvedValueOnce({ id: callerId, full_name: "Caller" } as User);
    followRepository.checkMutualFollow.mockResolvedValue(true);
    videoCallRepository.countRequestsToday.mockResolvedValue(0);
    videoCallRepository.create.mockResolvedValue(mockCall());
    videoCallRepository.findById.mockResolvedValue(mockCall());

    const result = await service.requestIntro(callerId, {
      callee_id: calleeId,
      duration_minutes: 5,
    });

    expect(result.points_spent).toBe(500);
    expect(pointsService.spendPoints).toHaveBeenCalledWith(
      callerId,
      500,
      PointTypes.VIDEO_INTRO_SPENT,
      "call-uuid-123",
      "Video intro request (5 min)"
    );
    expect(notificationService.notifyVideoIntroRequest).toHaveBeenCalledWith(
      calleeId,
      callerId,
      "Caller",
      "call-uuid-123"
    );
  });

  it("rejects request when not connected", async () => {
    userRepository.findById.mockResolvedValue({ id: calleeId } as User);
    followRepository.checkMutualFollow.mockResolvedValue(false);

    await expect(
      service.requestIntro(callerId, {
        callee_id: calleeId,
        duration_minutes: 5,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects intro and refunds caller", async () => {
    videoCallRepository.findById.mockResolvedValue(mockCall());
    videoCallRepository.updateStatus.mockResolvedValue(
      mockCall({ status: VideoCallStatus.REJECTED })
    );

    const result = await service.rejectIntro("call-uuid-123", calleeId);

    expect(result.status).toBe(VideoCallStatus.REJECTED);
    expect(pointsService.awardPoints).toHaveBeenCalledWith(
      callerId,
      500,
      PointTypes.VIDEO_INTRO_REFUND,
      "call-uuid-123",
      "Video intro refunded"
    );
    expect(notificationService.notifyVideoCallRejected).toHaveBeenCalledWith(
      callerId,
      "call-uuid-123"
    );
  });

  it("ends active call and awards completion points when long enough", async () => {
    const startedAt = new Date(Date.now() - 60_000);
    videoCallRepository.findById.mockResolvedValue(
      mockCall({ status: VideoCallStatus.ACTIVE, started_at: startedAt })
    );
    videoCallRepository.updateStatus.mockResolvedValue(
      mockCall({ status: VideoCallStatus.COMPLETED, ended_at: new Date() })
    );

    await service.endIntro("call-uuid-123", callerId);

    expect(pointsService.awardPointsOncePerReference).toHaveBeenCalledTimes(2);
  });

  it("returns agora token for participant", async () => {
    videoCallRepository.findById.mockResolvedValue(
      mockCall({ status: VideoCallStatus.ACTIVE })
    );
    agoraService.generateRtcToken.mockReturnValue({
      token: "agora-token",
      uid: 42,
      app_id: "app-id",
      expires_at: 999999,
    });

    const result = await service.getToken("call-uuid-123", callerId);

    expect(result.token).toBe("agora-token");
    expect(agoraService.generateRtcToken).toHaveBeenCalledWith(
      "call-uuid-123",
      callerId
    );
  });

  it("enforces daily request limit", async () => {
    userRepository.findById.mockResolvedValue({ id: calleeId } as User);
    followRepository.checkMutualFollow.mockResolvedValue(true);
    videoCallRepository.countRequestsToday.mockResolvedValue(2);

    await expect(
      service.requestIntro(callerId, {
        callee_id: calleeId,
        duration_minutes: 10,
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
