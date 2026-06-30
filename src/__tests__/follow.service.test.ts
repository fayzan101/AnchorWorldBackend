import { FollowService } from "../services/follow.service";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { NotificationService } from "../services/notification.service";
import { PointsService } from "../services/points.service";
import { AppError } from "../middleware/error.middleware";
import { PointTypes, PointAmounts } from "../constants/point-types";
import { Follow } from "../entities/Follow.entity";
import { User } from "../entities/User.entity";
import { FollowStatus } from "../types";

jest.mock("../utils/block.util", () => ({
  isEitherBlocked: jest.fn().mockResolvedValue(false),
}));

import { isEitherBlocked } from "../utils/block.util";

describe("FollowService", () => {
  const followerId = "user-a";
  const followingId = "user-b";
  let followRepository: jest.Mocked<FollowRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let pointsService: jest.Mocked<PointsService>;
  let service: FollowService;

  const mockUser = (id: string, name: string) =>
    ({ id, full_name: name }) as User;

  const mockFollow = (overrides: Partial<Follow> = {}) =>
    ({
      id: "follow-1",
      follower_id: followerId,
      following_id: followingId,
      status: FollowStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as Follow;

  beforeEach(() => {
    jest.mocked(isEitherBlocked).mockResolvedValue(false);

    followRepository = {
      findByUsers: jest.fn(),
      create: jest.fn(),
      acceptFollow: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      getPendingRequests: jest.fn(),
      getMatches: jest.fn(),
      checkMutualFollow: jest.fn(),
    } as unknown as jest.Mocked<FollowRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    notificationService = {
      notifyConnectionRequest: jest.fn().mockResolvedValue(true),
      notifyConnectionMade: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<NotificationService>;

    pointsService = {
      awardPointsOncePerReference: jest.fn().mockResolvedValue({
        balance: 50,
        awarded: 50,
      }),
    } as unknown as jest.Mocked<PointsService>;

    service = new FollowService(
      followRepository,
      userRepository,
      notificationService,
      pointsService
    );
  });

  it("rejects follow when users are blocked", async () => {
    jest.mocked(isEitherBlocked).mockResolvedValue(true);

    await expect(
      service.sendFollowRequest(followerId, followingId)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("sends connection request and notifies recipient", async () => {
    userRepository.findById
      .mockResolvedValueOnce(mockUser(followingId, "Bob"))
      .mockResolvedValueOnce(mockUser(followerId, "Alice"));
    followRepository.findByUsers.mockResolvedValue(null);
    followRepository.create.mockResolvedValue(mockFollow());

    const result = await service.sendFollowRequest(followerId, followingId);

    expect(result.status).toBe("pending");
    expect(notificationService.notifyConnectionRequest).toHaveBeenCalledWith(
      followingId,
      "Alice",
      followerId
    );
    expect(pointsService.awardPointsOncePerReference).not.toHaveBeenCalled();
  });

  it("auto-connects and awards points when reverse request is pending", async () => {
    userRepository.findById
      .mockResolvedValueOnce(mockUser(followingId, "Bob"))
      .mockResolvedValueOnce(mockUser(followerId, "Alice"));
    followRepository.findByUsers
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        mockFollow({ follower_id: followingId, following_id: followerId })
      );
    followRepository.acceptFollow.mockResolvedValue(
      mockFollow({ status: FollowStatus.ACCEPTED })
    );
    followRepository.create.mockResolvedValue(
      mockFollow({ status: FollowStatus.ACCEPTED })
    );

    const result = await service.sendFollowRequest(followerId, followingId);

    expect(result.message).toBe("You are now connected!");
    expect(pointsService.awardPointsOncePerReference).toHaveBeenCalledTimes(2);
    expect(pointsService.awardPointsOncePerReference).toHaveBeenCalledWith(
      followerId,
      PointAmounts[PointTypes.CONNECTION_MADE],
      PointTypes.CONNECTION_MADE,
      followingId,
      "New connection made"
    );
    expect(notificationService.notifyConnectionMade).toHaveBeenCalled();
  });

  it("awards connection points when accepting a request", async () => {
    const pending = mockFollow({
      id: "follow-pending",
      follower_id: followingId,
      following_id: followerId,
    });
    followRepository.findById.mockResolvedValue(pending);
    followRepository.acceptFollow.mockResolvedValue(
      mockFollow({ status: FollowStatus.ACCEPTED })
    );
    followRepository.findByUsers.mockResolvedValue(null);
    followRepository.create.mockResolvedValue(
      mockFollow({
        status: FollowStatus.ACCEPTED,
        follower_id: followerId,
        following_id: followingId,
      })
    );
    userRepository.findById.mockResolvedValue(mockUser(followerId, "Alice"));

    const result = await service.acceptFollowRequest(
      "follow-pending",
      followerId
    );

    expect(result.message).toBe("You are now connected!");
    expect(pointsService.awardPointsOncePerReference).toHaveBeenCalledTimes(2);
    expect(notificationService.notifyConnectionMade).toHaveBeenCalled();
  });

  it("returns connections list from repository", async () => {
    followRepository.getMatches.mockResolvedValue([
      {
        id: followingId,
        full_name: "Bob",
        profile_picture: null,
        bio: "Hi",
        city: "Austin",
        is_online: true,
        last_seen: null,
      },
    ]);

    const connections = await service.getConnections(followerId);

    expect(connections).toHaveLength(1);
    expect(connections[0].full_name).toBe("Bob");
    expect(connections[0].city).toBe("Austin");
  });

  it("throws when accepting a request not addressed to the user", async () => {
    followRepository.findById.mockResolvedValue(
      mockFollow({ following_id: "someone-else" })
    );

    await expect(
      service.acceptFollowRequest("follow-1", followerId)
    ).rejects.toBeInstanceOf(AppError);
  });
});
