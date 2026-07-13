import { UserRepository } from "../repositories/user.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { PointsService } from "./points.service";
import { CircleService } from "./circle.service";
import { PostService } from "./post.service";
import { HobbyRepository } from "../repositories/hobby.repository";
import {
  CommunityProfileUpdateDto,
  OwnProfile,
  ProfileLocationUpdateDto,
  PublicUserProfile,
} from "../types/community.types";
import { PaginatedResponse, UserListQuery } from "../types";
import { AppError } from "../middleware/error.middleware";
import {
  toCommunityUserListItem,
  toOwnProfile,
  toPublicUser,
} from "../utils/user-response.mapper";

const DEPRECATED_PROFILE_FIELDS = [
  "seeking_relation",
  "interested_in",
  "relationship_goals",
  "partner_qualities",
  "date_you_reason",
  "have_kids",
  "kids",
  "height",
  "location",
] as const;

export class UserService {
  private userRepository: UserRepository;
  private followRepository: FollowRepository;
  private pointsService: PointsService;
  private circleService: CircleService;
  private postService: PostService;
  private hobbyRepository: HobbyRepository;

  constructor(
    userRepository?: UserRepository,
    followRepository?: FollowRepository,
    pointsService?: PointsService,
    circleService?: CircleService,
    postService?: PostService,
    hobbyRepository?: HobbyRepository
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.followRepository = followRepository ?? new FollowRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.circleService = circleService ?? new CircleService();
    this.postService = postService ?? new PostService();
    this.hobbyRepository = hobbyRepository ?? new HobbyRepository();
  }

  async getProfile(userId: string): Promise<OwnProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [{ balance }, circles, postCount] = await Promise.all([
      this.pointsService.getBalance(userId),
      this.circleService.getUserCircleSummaries(userId),
      this.postService.countUserPosts(userId),
    ]);

    return toOwnProfile(user, {
      pointsBalance: balance,
      postCount,
      circles,
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    DEPRECATED_PROFILE_FIELDS.forEach((field) => {
      if (data[field] !== undefined) {
        console.warn(
          `[profile] Deprecated field ignored: ${field}. Use community onboarding instead.`
        );
      }
    });

    const community = data as CommunityProfileUpdateDto;

    if (community.full_name !== undefined) user.full_name = community.full_name;
    if (community.bio !== undefined) user.bio = community.bio;
    if (community.gender !== undefined) user.gender = community.gender;
    if (community.city !== undefined) user.city = community.city;
    if (community.country !== undefined) user.country = community.country;
    if (community.location_opt_in !== undefined) {
      user.location_opt_in = community.location_opt_in;
    }
    if (community.conversation_style !== undefined) {
      user.conversation_style = community.conversation_style;
    }
    if (community.humor_type !== undefined) user.humor_type = community.humor_type;

    if (community.hobbies) {
      const foundHobbies = await this.hobbyRepository.findByIds(community.hobbies);
      user.hobbies = foundHobbies;
    }

    const updatedUser = await this.userRepository.save(user);

    const [{ balance }, circles, postCount] = await Promise.all([
      this.pointsService.getBalance(userId),
      this.circleService.getUserCircleSummaries(userId),
      this.postService.countUserPosts(userId),
    ]);

    return toOwnProfile(updatedUser, {
      pointsBalance: balance,
      postCount,
      circles,
    });
  }

  async updateProfileLocation(
    userId: string,
    data: ProfileLocationUpdateDto
  ): Promise<OwnProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.city = data.city.trim();
    if (data.country !== undefined) {
      user.country = data.country.trim() || null;
    }
    user.location_opt_in = data.location_opt_in;

    const updatedUser = await this.userRepository.save(user);

    const [{ balance }, circles, postCount] = await Promise.all([
      this.pointsService.getBalance(userId),
      this.circleService.getUserCircleSummaries(userId),
      this.postService.countUserPosts(userId),
    ]);

    return toOwnProfile(updatedUser, {
      pointsBalance: balance,
      postCount,
      circles,
    });
  }

  async updateProfilePicture(userId: string, filePath: string) {
    const user = await this.userRepository.update(userId, {
      profile_picture: filePath,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      profile_picture: user.profile_picture,
    };
  }

  async getUserById(
    userId: string,
    requestingUserId?: string
  ): Promise<PublicUserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [{ balance }, circles, postCount] = await Promise.all([
      this.pointsService.getBalance(userId),
      this.circleService.getUserCircleSummaries(userId),
      this.postService.countUserPosts(userId),
    ]);
    let connectionStatus;

    if (requestingUserId && requestingUserId !== userId) {
      connectionStatus = await this.followRepository.getConnectionStatus(
        requestingUserId,
        userId
      );
    }

    return toPublicUser(user, {
      pointsBalance: balance,
      postCount,
      circles,
      connectionStatus,
    });
  }

  async markReportById(userId: string) {
    await this.userRepository.markReportById(userId);
  }

  async getAllUsers(query: UserListQuery, currentUserId: string) {
    if (query.purpose !== "search") {
      throw new AppError(
        'User browse requires query parameter purpose=search. Use GET /api/discover/local for community discovery.',
        400
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const { users, total } =
      await this.userRepository.findAllWithRelationshipStatus(
        currentUserId,
        page,
        limit,
        query.gender,
        query.search
      );

    const items = users.map((user: Record<string, unknown>) =>
      toCommunityUserListItem(user)
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    } satisfies PaginatedResponse<(typeof items)[number]>;
  }

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    await this.userRepository.updateOnlineStatus(userId, isOnline);
  }
}
