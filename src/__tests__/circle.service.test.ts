import { CircleService } from "../services/circle.service";
import { CircleRepository } from "../repositories/circle.repository";
import { PointsService } from "../services/points.service";
import { PostService } from "../services/post.service";
import { NotificationService } from "../services/notification.service";
import { Circle } from "../entities/Circle.entity";

jest.mock("../config/database", () => ({
  AppDataSource: {
    transaction: jest.fn((fn: (manager: unknown) => Promise<unknown>) => fn({})),
  },
}));

describe("CircleService", () => {
  const mockCircleRepository = {
    findAll: jest.fn(),
    findFeatured: jest.fn(),
    findById: jest.fn(),
    getJoinedCircleIds: jest.fn(),
    isMember: jest.fn(),
    joinCircle: jest.fn(),
    leaveCircle: jest.fn(),
    getMembers: jest.fn(),
    getUserCircles: jest.fn(),
  } as unknown as jest.Mocked<CircleRepository>;

  const mockPointsService = {
    awardPointsOncePerReference: jest.fn(),
  } as unknown as jest.Mocked<PointsService>;

  const mockPostService = {
    getCirclePosts: jest.fn(),
  } as unknown as jest.Mocked<PostService>;

  const mockNotificationService = {
    notifyCircleJoin: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<NotificationService>;

  const service = new CircleService(
    mockCircleRepository,
    mockPointsService,
    mockPostService,
    mockNotificationService
  );

  const sampleCircle: Circle = {
    id: "circle-1",
    name: "Fitness & Health",
    slug: "fitness-health",
    description: "Stay active together",
    icon_url: null,
    member_count: 10,
    is_featured: true,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists circles with join status", async () => {
    mockCircleRepository.findAll.mockResolvedValue([sampleCircle]);
    mockCircleRepository.getJoinedCircleIds.mockResolvedValue(
      new Set(["circle-1"])
    );

    const result = await service.listCircles("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].is_joined).toBe(true);
    expect(result[0].member_count).toBe(10);
  });

  it("awards points when joining a circle", async () => {
    mockCircleRepository.findById
      .mockResolvedValueOnce(sampleCircle)
      .mockResolvedValueOnce({ ...sampleCircle, member_count: 11 });
    mockCircleRepository.isMember.mockResolvedValue(false);
    mockCircleRepository.joinCircle.mockResolvedValue({} as never);
    mockPointsService.awardPointsOncePerReference.mockResolvedValue({
      balance: 40,
      awarded: 30,
    });

    const result = await service.joinCircle("circle-1", "user-1");

    expect(mockCircleRepository.joinCircle).toHaveBeenCalledWith(
      "circle-1",
      "user-1",
      expect.anything()
    );
    expect(mockPointsService.awardPointsOncePerReference).toHaveBeenCalledWith(
      "user-1",
      30,
      "circle_joined",
      "circle-1",
      "Joined Fitness & Health"
    );
    expect(result.points_awarded).toBe(30);
    expect(result.circle.is_joined).toBe(true);
    expect(mockNotificationService.notifyCircleJoin).toHaveBeenCalledWith(
      "user-1",
      "Fitness & Health",
      "circle-1"
    );
  });

  it("rejects joining when already a member", async () => {
    mockCircleRepository.findById.mockResolvedValue(sampleCircle);
    mockCircleRepository.isMember.mockResolvedValue(true);

    await expect(service.joinCircle("circle-1", "user-1")).rejects.toMatchObject({
      message: "Already a member of this circle",
      statusCode: 409,
    });
  });

  it("delegates circle posts to post service", async () => {
    mockPostService.getCirclePosts.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    });

    const result = await service.getCirclePosts("circle-1", "user-1");

    expect(mockPostService.getCirclePosts).toHaveBeenCalledWith(
      "circle-1",
      "user-1",
      1,
      20
    );
    expect(result.items).toEqual([]);
  });
});
