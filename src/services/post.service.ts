import { AppDataSource } from "../config/database";
import { PostRepository } from "../repositories/post.repository";
import { PostLikeRepository } from "../repositories/post-like.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import { CommentLikeRepository } from "../repositories/comment-like.repository";
import { CircleRepository } from "../repositories/circle.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "./points.service";
import { NotificationService } from "./notification.service";
import { AppError } from "../middleware/error.middleware";
import { Post, PostMediaType } from "../entities/Post.entity";
import { User } from "../entities/User.entity";
import {
  CreateCommentDto,
  CreatePostDto,
  FeedFilter,
  PostAuthor,
  PostCommentResponse,
  PostResponse,
} from "../types/post.types";
import { toPublicUser } from "../utils/user-response.mapper";
import { getBlockedUserIds } from "../utils/block.util";
import { PointTypes, PointAmounts } from "../constants/point-types";

const DAILY_CAPS = {
  POST_CREATED_EVENTS: 3,
  CIRCLE_POST_EVENTS: 2,
  LIKES_RECEIVED_POINTS: 50,
  COMMENTS_RECEIVED_POINTS: 30,
  COMMENT_CREATED_EVENTS: 5,
};

export class PostService {
  private postRepository: PostRepository;
  private postLikeRepository: PostLikeRepository;
  private postCommentRepository: PostCommentRepository;
  private commentLikeRepository: CommentLikeRepository;
  private circleRepository: CircleRepository;
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private pointsService: PointsService;
  private notificationService: NotificationService;

  constructor(
    postRepository?: PostRepository,
    postLikeRepository?: PostLikeRepository,
    postCommentRepository?: PostCommentRepository,
    circleRepository?: CircleRepository,
    followRepository?: FollowRepository,
    userRepository?: UserRepository,
    pointsService?: PointsService,
    notificationService?: NotificationService,
    commentLikeRepository?: CommentLikeRepository
  ) {
    this.postRepository = postRepository ?? new PostRepository();
    this.postLikeRepository = postLikeRepository ?? new PostLikeRepository();
    this.postCommentRepository =
      postCommentRepository ?? new PostCommentRepository();
    this.commentLikeRepository =
      commentLikeRepository ?? new CommentLikeRepository();
    this.circleRepository = circleRepository ?? new CircleRepository();
    this.followRepository = followRepository ?? new FollowRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.notificationService = notificationService ?? new NotificationService();
  }

  async getFeed(
    userId: string,
    filter: FeedFilter = "circles",
    page = 1,
    limit = 20,
    circleId?: string
  ) {
    const viewer = await this.userRepository.findById(userId);
    if (!viewer) {
      throw new AppError("User not found", 404);
    }

    if (filter === "local" && !viewer.location_opt_in) {
      throw new AppError(
        "Enable location sharing in profile to view local posts",
        400
      );
    }

    const [joinedCircleIds, followingIds, blockedUserIds] = await Promise.all([
      this.circleRepository.getJoinedCircleIds(userId).then((set) => [...set]),
      this.followRepository.getFollowingIds(userId),
      getBlockedUserIds(userId),
    ]);

    const { items, total } = await this.postRepository.findFeed({
      viewerId: userId,
      filter,
      circleId,
      joinedCircleIds,
      followingIds,
      viewerCity: viewer.city,
      locationOptIn: Boolean(viewer.location_opt_in),
      blockedUserIds,
      page,
      limit,
    });

    const formatted = await this.formatPosts(items, userId);

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getCirclePosts(circleId: string, userId: string, page = 1, limit = 20) {
    const circle = await this.circleRepository.findById(circleId);
    if (!circle) {
      throw new AppError("Circle not found", 404);
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    const { items, total } = await this.postRepository.findByCircle(
      circleId,
      page,
      limit,
      blockedUserIds
    );

    const formatted = await this.formatPosts(items, userId);

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(postId: string, userId: string): Promise<PostResponse> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(post.user_id)) {
      throw new AppError("Post not found", 404);
    }

    const [formatted] = await this.formatPosts([post], userId);
    return formatted;
  }

  async getUserPosts(
    targetUserId: string,
    viewerId: string,
    page = 1,
    limit = 20
  ) {
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const blockedUserIds = await getBlockedUserIds(viewerId);
    const { items, total } = await this.postRepository.findByUser(
      targetUserId,
      page,
      limit,
      blockedUserIds
    );

    const formatted = await this.formatPosts(items, viewerId);

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async createPost(
    userId: string,
    data: CreatePostDto,
    media?: { url: string; type: PostMediaType }
  ): Promise<PostResponse> {
    const content = (data.content ?? "").trim();
    if (!content && !media) {
      throw new AppError("Add a caption or attach a photo/video", 400);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (data.circle_id) {
      const isMember = await this.circleRepository.isMember(
        data.circle_id,
        userId
      );
      if (!isMember) {
        throw new AppError("You must join this circle before posting", 403);
      }
    }

    const post = await this.postRepository.create({
      user_id: userId,
      content: content || "",
      media_url: media?.url ?? null,
      media_type: media?.type ?? PostMediaType.NONE,
      circle_id: data.circle_id ?? null,
      city: user.location_opt_in ? user.city ?? null : null,
      country: user.location_opt_in ? user.country ?? null : null,
    });

    await this.awardCreatePostPoints(userId, post);

    const saved = await this.postRepository.findById(post.id);
    const [formatted] = await this.formatPosts([saved!], userId);
    return formatted;
  }

  async deletePost(postId: string, userId: string): Promise<{ message: string }> {
    const deleted = await this.postRepository.softDelete(postId, userId);
    if (!deleted) {
      throw new AppError("Post not found or not owned by you", 404);
    }
    return { message: "Post deleted successfully" };
  }

  async likePost(
    postId: string,
    userId: string
  ): Promise<{ like_count: number; points_awarded_to_owner: number }> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (
      blockedUserIds.includes(post.user_id) ||
      blockedUserIds.includes(userId)
    ) {
      throw new AppError("Cannot like this post", 403);
    }

    const existing = await this.postLikeRepository.findByPostAndUser(
      postId,
      userId
    );
    if (existing) {
      throw new AppError("Post already liked", 409);
    }

    await AppDataSource.transaction(async (manager) => {
      await this.postLikeRepository.create(postId, userId, manager);
      await this.postRepository.incrementLikeCount(postId, manager);
    });

    let pointsAwarded = 0;
    if (post.user_id !== userId) {
      const result = await this.pointsService.awardPointsWithinDailyPointsCap(
        post.user_id,
        PointAmounts[PointTypes.POST_LIKED_RECEIVED],
        PointTypes.POST_LIKED_RECEIVED,
        DAILY_CAPS.LIKES_RECEIVED_POINTS,
        postId,
        "Someone liked your post"
      );
      pointsAwarded = result.awarded;
    }

    const updated = await this.postRepository.findById(postId);

    if (post.user_id !== userId) {
      const liker = await this.userRepository.findById(userId);
      if (liker) {
        this.notificationService
          .notifyPostLiked(post.user_id, userId, liker.full_name, postId)
          .catch(console.error);
      }
    }

    return {
      like_count: updated!.like_count,
      points_awarded_to_owner: pointsAwarded,
    };
  }

  async unlikePost(
    postId: string,
    userId: string
  ): Promise<{ like_count: number }> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const removed = await this.postLikeRepository.delete(postId, userId);
    if (!removed) {
      throw new AppError("Like not found", 404);
    }

    await this.postRepository.decrementLikeCount(postId);
    const updated = await this.postRepository.findById(postId);

    return { like_count: updated!.like_count };
  }

  async likeComment(
    commentId: string,
    userId: string
  ): Promise<{ like_count: number; is_liked_by_me: boolean }> {
    const comment = await this.postCommentRepository.findById(commentId);
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const existing = await this.commentLikeRepository.findByCommentAndUser(
      commentId,
      userId
    );
    if (existing) {
      return {
        like_count: comment.like_count ?? 0,
        is_liked_by_me: true,
      };
    }

    await AppDataSource.transaction(async (manager) => {
      await this.commentLikeRepository.create(
        { comment_id: commentId, user_id: userId },
        manager
      );
      await this.postCommentRepository.incrementLikeCount(commentId, manager);
    });

    const updated = await this.postCommentRepository.findById(commentId);
    return {
      like_count: updated!.like_count ?? 0,
      is_liked_by_me: true,
    };
  }

  async unlikeComment(
    commentId: string,
    userId: string
  ): Promise<{ like_count: number; is_liked_by_me: boolean }> {
    const comment = await this.postCommentRepository.findById(commentId);
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const removed = await this.commentLikeRepository.delete(commentId, userId);
    if (!removed) {
      return {
        like_count: comment.like_count ?? 0,
        is_liked_by_me: false,
      };
    }

    await this.postCommentRepository.decrementLikeCount(commentId);
    const updated = await this.postCommentRepository.findById(commentId);
    return {
      like_count: updated!.like_count ?? 0,
      is_liked_by_me: false,
    };
  }

  async getComments(postId: string, userId: string, page = 1, limit = 20) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const { items, total } = await this.postCommentRepository.findByPost(
      postId,
      page,
      limit
    );

    const likedIds = await this.commentLikeRepository.findLikedCommentIds(
      userId,
      items.map((c) => c.id)
    );

    return {
      items: items.map((comment) => this.formatComment(comment, likedIds)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async createComment(
    postId: string,
    userId: string,
    data: CreateCommentDto
  ): Promise<PostCommentResponse> {
    const content = data.content?.trim();
    if (!content || content.length < 1) {
      throw new AppError("Comment cannot be empty", 400);
    }

    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (
      blockedUserIds.includes(post.user_id) ||
      blockedUserIds.includes(userId)
    ) {
      throw new AppError("Cannot comment on this post", 403);
    }

    let parentId: string | null = null;
    if (data.parent_id) {
      const parent = await this.postCommentRepository.findById(data.parent_id);
      if (!parent || parent.post_id !== postId) {
        throw new AppError("Parent comment not found", 404);
      }
      parentId = parent.id;
    }

    const comment = await AppDataSource.transaction(async (manager) => {
      const created = await this.postCommentRepository.create(
        {
          post_id: postId,
          user_id: userId,
          content,
          parent_id: parentId,
        },
        manager
      );
      await this.postRepository.incrementCommentCount(postId, manager);
      return created;
    });

    await this.pointsService.awardPointsWithinDailyEventCap(
      userId,
      PointAmounts[PointTypes.COMMENT_CREATED],
      PointTypes.COMMENT_CREATED,
      DAILY_CAPS.COMMENT_CREATED_EVENTS,
      comment.id,
      "Comment created"
    );

    if (post.user_id !== userId) {
      await this.pointsService.awardPointsWithinDailyPointsCap(
        post.user_id,
        PointAmounts[PointTypes.COMMENT_RECEIVED],
        PointTypes.COMMENT_RECEIVED,
        DAILY_CAPS.COMMENTS_RECEIVED_POINTS,
        comment.id,
        "Someone commented on your post"
      );
    }

    const saved = await this.postCommentRepository.findById(comment.id);

    if (post.user_id !== userId) {
      const commenter = saved!.user;
      this.notificationService
        .notifyPostCommented(
          post.user_id,
          userId,
          commenter.full_name,
          postId,
          comment.id
        )
        .catch(console.error);
    }

    return this.formatComment(saved!, new Set());
  }

  async deleteComment(
    commentId: string,
    userId: string
  ): Promise<{ message: string }> {
    const comment = await this.postCommentRepository.findById(commentId);
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const deleted = await this.postCommentRepository.softDelete(
      commentId,
      userId
    );
    if (!deleted) {
      throw new AppError("Comment not found or not owned by you", 404);
    }

    await this.postRepository.decrementCommentCount(comment.post_id);

    return { message: "Comment deleted successfully" };
  }

  async countUserPosts(userId: string): Promise<number> {
    return this.postRepository.countByUser(userId);
  }

  private async awardCreatePostPoints(userId: string, post: Post): Promise<void> {
    await this.pointsService.awardPointsOnce(
      userId,
      PointAmounts[PointTypes.FIRST_POST],
      PointTypes.FIRST_POST,
      post.id,
      "First post created"
    );

    await this.pointsService.awardPointsWithinDailyEventCap(
      userId,
      PointAmounts[PointTypes.POST_CREATED],
      PointTypes.POST_CREATED,
      DAILY_CAPS.POST_CREATED_EVENTS,
      post.id,
      "Post created"
    );

    if (post.circle_id) {
      await this.pointsService.awardPointsWithinDailyEventCap(
        userId,
        PointAmounts[PointTypes.CIRCLE_POST],
        PointTypes.CIRCLE_POST,
        DAILY_CAPS.CIRCLE_POST_EVENTS,
        post.id,
        "Post in circle"
      );
    }
  }

  private async formatPosts(
    posts: Post[],
    viewerId: string
  ): Promise<PostResponse[]> {
    const postIds = posts.map((post) => post.id);
    const likedIds = await this.postLikeRepository.getLikedPostIds(
      viewerId,
      postIds
    );

    return posts.map((post) => ({
      id: post.id,
      user: this.toPostAuthor(post.user),
      content: post.content,
      media_url: post.media_url,
      media_type: post.media_type,
      circle_id: post.circle_id,
      circle_name: post.circle?.name ?? null,
      city: post.city,
      country: post.country,
      like_count: post.like_count,
      comment_count: post.comment_count,
      is_liked_by_me: likedIds.has(post.id),
      created_at: post.created_at,
    }));
  }

  private formatComment(
    comment: {
      id: string;
      post_id: string;
      content: string;
      parent_id?: string | null;
      like_count?: number;
      created_at: Date;
      user: User;
    },
    likedIds: Set<string> = new Set()
  ): PostCommentResponse {
    return {
      id: comment.id,
      post_id: comment.post_id,
      user: this.toPostAuthor(comment.user),
      content: comment.content,
      parent_id: comment.parent_id ?? null,
      like_count: comment.like_count ?? 0,
      is_liked_by_me: likedIds.has(comment.id),
      created_at: comment.created_at,
    };
  }

  private toPostAuthor(user: User): PostAuthor {
    const profile = toPublicUser(user);
    return {
      id: profile.id,
      full_name: profile.full_name,
      profile_picture: profile.profile_picture,
      city: profile.city,
      interests: profile.interests,
      conversation_style: profile.conversation_style,
    };
  }
}
