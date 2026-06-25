import { PostService } from "../services/post.service";
import { PostRepository } from "../repositories/post.repository";
import { PostLikeRepository } from "../repositories/post-like.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import { CircleRepository } from "../repositories/circle.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "../services/points.service";
import { Post, PostMediaType } from "../entities/Post.entity";
import { User } from "../entities/User.entity";

jest.mock("../config/database", () => ({
  AppDataSource: {
    transaction: jest.fn((fn: (manager: unknown) => Promise<unknown>) => fn({})),
  },
}));

describe("PostService", () => {
  const mockPostRepository = {
    findFeed: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    incrementLikeCount: jest.fn(),
    decrementLikeCount: jest.fn(),
    incrementCommentCount: jest.fn(),
    decrementCommentCount: jest.fn(),
    countByUser: jest.fn(),
  } as unknown as jest.Mocked<PostRepository>;

  const mockPostLikeRepository = {
    findByPostAndUser: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    getLikedPostIds: jest.fn(),
  } as unknown as jest.Mocked<PostLikeRepository>;

  const mockPostCommentRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByPost: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<PostCommentRepository>;

  const mockCircleRepository = {
    isMember: jest.fn(),
    getJoinedCircleIds: jest.fn(),
  } as unknown as jest.Mocked<CircleRepository>;

  const mockFollowRepository = {
    getFollowingIds: jest.fn(),
  } as unknown as jest.Mocked<FollowRepository>;

  const mockUserRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;

  const mockPointsService = {
    awardPointsOnce: jest.fn(),
    awardPointsWithinDailyEventCap: jest.fn(),
    awardPointsWithinDailyPointsCap: jest.fn(),
  } as unknown as jest.Mocked<PointsService>;

  const service = new PostService(
    mockPostRepository,
    mockPostLikeRepository,
    mockPostCommentRepository,
    mockCircleRepository,
    mockFollowRepository,
    mockUserRepository,
    mockPointsService
  );

  const viewer: User = {
    id: "user-1",
    email: "test@example.com",
    full_name: "Tester",
    location_opt_in: true,
    city: "Lahore",
    country: "Pakistan",
  } as User;

  const samplePost: Post = {
    id: "post-1",
    user_id: "user-1",
    content: "This is a sample community post",
    media_url: null,
    media_type: PostMediaType.NONE,
    circle_id: "circle-1",
    city: "Lahore",
    country: "Pakistan",
    like_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    user: viewer,
    circle: { id: "circle-1", name: "Fitness & Health" } as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository.findById.mockResolvedValue(viewer);
    mockCircleRepository.getJoinedCircleIds.mockResolvedValue(
      new Set(["circle-1"])
    );
    mockFollowRepository.getFollowingIds.mockResolvedValue([]);
    mockPostLikeRepository.getLikedPostIds.mockResolvedValue(new Set());
  });

  it("defaults feed to joined circles", async () => {
    mockPostRepository.findFeed.mockResolvedValue({ items: [samplePost], total: 1 });

    const result = await service.getFeed("user-1");

    expect(mockPostRepository.findFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "circles",
        joinedCircleIds: ["circle-1"],
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].circle_name).toBe("Fitness & Health");
  });

  it("requires circle membership to post in a circle", async () => {
    mockCircleRepository.isMember.mockResolvedValue(false);

    await expect(
      service.createPost("user-1", {
        content: "Trying to post without membership",
        circle_id: "circle-1",
      })
    ).rejects.toMatchObject({
      message: "You must join this circle before posting",
      statusCode: 403,
    });
  });

  it("awards post creation points", async () => {
    mockCircleRepository.isMember.mockResolvedValue(true);
    mockPostRepository.create.mockResolvedValue(samplePost);
    mockPostRepository.findById.mockResolvedValue(samplePost);

    await service.createPost("user-1", {
      content: "My first community post here",
      circle_id: "circle-1",
    });

    expect(mockPointsService.awardPointsOnce).toHaveBeenCalledWith(
      "user-1",
      150,
      "first_post",
      "post-1",
      "First post created"
    );
    expect(mockPointsService.awardPointsWithinDailyEventCap).toHaveBeenCalledWith(
      "user-1",
      25,
      "post_created",
      3,
      "post-1",
      "Post created"
    );
    expect(mockPointsService.awardPointsWithinDailyEventCap).toHaveBeenCalledWith(
      "user-1",
      40,
      "circle_post",
      2,
      "post-1",
      "Post in circle"
    );
  });

  it("awards capped points to post owner on like", async () => {
    const ownerPost = { ...samplePost, user_id: "owner-1" };
    mockPostRepository.findById.mockResolvedValue(ownerPost);
    mockPostLikeRepository.findByPostAndUser.mockResolvedValue(null);
    mockPostLikeRepository.create.mockResolvedValue({} as never);
    mockPointsService.awardPointsWithinDailyPointsCap.mockResolvedValue({
      balance: 5,
      awarded: 5,
    });

    await service.likePost("post-1", "user-1");

    expect(mockPointsService.awardPointsWithinDailyPointsCap).toHaveBeenCalledWith(
      "owner-1",
      5,
      "post_liked_received",
      50,
      "post-1",
      "Someone liked your post"
    );
  });
});
