import { OnboardingService } from "../services/onboarding.service";
import { UserRepository } from "../repositories/user.repository";
import { HobbyRepository } from "../repositories/hobby.repository";
import { CircleRepository } from "../repositories/circle.repository";
import { CircleService } from "../services/circle.service";
import { PointsService } from "../services/points.service";
import { PostService } from "../services/post.service";
import { User } from "../entities/User.entity";
import { Hobby } from "../entities/Hobbies.entity";
import { PointTypes, PointAmounts } from "../constants/point-types";

describe("OnboardingService", () => {
  const userId = "user-123";
  let userRepository: jest.Mocked<UserRepository>;
  let hobbyRepository: jest.Mocked<HobbyRepository>;
  let circleRepository: jest.Mocked<CircleRepository>;
  let circleService: jest.Mocked<CircleService>;
  let pointsService: jest.Mocked<PointsService>;
  let postService: jest.Mocked<PostService>;
  let service: OnboardingService;

  const createBaseUser = () =>
    ({
      id: userId,
      bio: null,
      city: null,
      country: null,
      location_opt_in: false,
      humor_type: null,
      conversation_style: null,
      hobbies: [],
      profile_completed: false,
      onboarding_completed_at: null,
    }) as unknown as User;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    hobbyRepository = {
      findByIds: jest.fn(),
      findByName: jest.fn(),
    } as unknown as jest.Mocked<HobbyRepository>;

    circleRepository = {
      findFeatured: jest.fn(),
      getJoinedCircleIds: jest.fn(),
    } as unknown as jest.Mocked<CircleRepository>;

    circleService = {
      joinCircle: jest.fn(),
      getUserCircleSummaries: jest.fn(),
    } as unknown as jest.Mocked<CircleService>;

    pointsService = {
      awardPointsOnce: jest.fn(),
      getBalance: jest.fn(),
    } as unknown as jest.Mocked<PointsService>;

    postService = {
      countUserPosts: jest.fn(),
    } as unknown as jest.Mocked<PostService>;

    service = new OnboardingService(
      userRepository,
      hobbyRepository,
      circleRepository,
      circleService,
      pointsService,
      postService
    );
  });

  it("rejects deprecated dating fields", async () => {
    await expect(
      service.completeCommunityOnboarding(userId, {
        city: "Austin",
        interests: ["hobby-1"],
        suggested_circle_ids: ["c1", "c2"],
        seeking_relation: "date",
      } as never)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("requires at least one interest", async () => {
    await expect(
      service.completeCommunityOnboarding(userId, {
        city: "Austin",
        suggested_circle_ids: ["c1", "c2"],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("completes onboarding and awards points once", async () => {
    const baseUser = createBaseUser();
    const hobby = { id: "hobby-1", name: "Hiking" } as Hobby;
    const completedUser = {
      ...baseUser,
      city: "Austin",
      profile_completed: true,
      onboarding_completed_at: new Date(),
      hobbies: [hobby],
    } as unknown as User;

    userRepository.findById
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce(completedUser);
    userRepository.save.mockResolvedValue(completedUser);
    hobbyRepository.findByIds.mockResolvedValue([hobby]);
    circleService.joinCircle.mockResolvedValue({} as never);
    pointsService.awardPointsOnce.mockResolvedValue({
      awarded: PointAmounts[PointTypes.PROFILE_COMPLETE],
      skipped: false,
      balance: 100,
    });
    pointsService.getBalance.mockResolvedValue({ balance: 100, lifetime_earned: 100 });
    circleService.getUserCircleSummaries.mockResolvedValue([]);
    postService.countUserPosts.mockResolvedValue(0);

    const result = await service.completeCommunityOnboarding(userId, {
      city: "Austin",
      interests: ["hobby-1"],
      suggested_circle_ids: ["circle-1", "circle-2"],
      location_opt_in: true,
    });

    expect(userRepository.save).toHaveBeenCalled();
    expect(circleService.joinCircle).toHaveBeenCalledTimes(2);
    expect(pointsService.awardPointsOnce).toHaveBeenCalledWith(
      userId,
      PointAmounts[PointTypes.PROFILE_COMPLETE],
      PointTypes.PROFILE_COMPLETE,
      undefined,
      "Community onboarding completed"
    );
    expect(result.points_awarded).toBe(PointAmounts[PointTypes.PROFILE_COMPLETE]);
    expect(result.circles_joined).toBe(2);
  });

  it("returns onboarding status with suggested circles", async () => {
    userRepository.findById.mockResolvedValue(createBaseUser());
    circleRepository.findFeatured.mockResolvedValue([
      {
        id: "circle-1",
        name: "Fitness",
        slug: "fitness",
        description: null,
        icon_url: null,
        member_count: 10,
        is_featured: true,
      },
    ] as never);
    circleRepository.getJoinedCircleIds.mockResolvedValue(new Set());

    const status = await service.getStatus(userId);
    expect(status.completed).toBe(false);
    expect(status.suggested_circles).toHaveLength(1);
    expect(status.joined_circle_count).toBe(0);
  });
});
