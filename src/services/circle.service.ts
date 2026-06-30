import { AppDataSource } from "../config/database";
import { CircleRepository } from "../repositories/circle.repository";
import { PointsService } from "./points.service";
import { PostService } from "./post.service";
import { NotificationService } from "./notification.service";
import { AppError } from "../middleware/error.middleware";
import { Circle } from "../entities/Circle.entity";
import {
  CircleListItem,
  CircleMemberItem,
  CircleSummary,
} from "../types/community.types";
import { PointTypes, PointAmounts } from "../constants/point-types";

export class CircleService {
  private circleRepository: CircleRepository;
  private pointsService: PointsService;
  private postService: PostService;
  private notificationService: NotificationService;

  constructor(
    circleRepository?: CircleRepository,
    pointsService?: PointsService,
    postService?: PostService,
    notificationService?: NotificationService
  ) {
    this.circleRepository = circleRepository ?? new CircleRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.postService = postService ?? new PostService();
    this.notificationService = notificationService ?? new NotificationService();
  }

  async listCircles(userId: string): Promise<CircleListItem[]> {
    const [circles, joinedIds] = await Promise.all([
      this.circleRepository.findAll(),
      this.circleRepository.getJoinedCircleIds(userId),
    ]);

    return circles.map((circle) =>
      this.toListItem(circle, joinedIds.has(circle.id))
    );
  }

  async getFeaturedCircles(userId: string): Promise<CircleListItem[]> {
    const [circles, joinedIds] = await Promise.all([
      this.circleRepository.findFeatured(5),
      this.circleRepository.getJoinedCircleIds(userId),
    ]);

    return circles.map((circle) =>
      this.toListItem(circle, joinedIds.has(circle.id))
    );
  }

  async getCircleById(circleId: string, userId: string): Promise<CircleListItem> {
    const circle = await this.circleRepository.findById(circleId);
    if (!circle) {
      throw new AppError("Circle not found", 404);
    }

    const isJoined = await this.circleRepository.isMember(circleId, userId);
    return this.toListItem(circle, isJoined);
  }

  async joinCircle(
    circleId: string,
    userId: string
  ): Promise<{
    circle: CircleListItem;
    points_awarded: number;
    points_balance: number;
  }> {
    const circle = await this.circleRepository.findById(circleId);
    if (!circle) {
      throw new AppError("Circle not found", 404);
    }

    const alreadyMember = await this.circleRepository.isMember(circleId, userId);
    if (alreadyMember) {
      throw new AppError("Already a member of this circle", 409);
    }

    await AppDataSource.transaction(async (manager) => {
      await this.circleRepository.joinCircle(circleId, userId, manager);
    });

    const pointsResult = await this.pointsService.awardPointsOncePerReference(
      userId,
      PointAmounts[PointTypes.CIRCLE_JOINED],
      PointTypes.CIRCLE_JOINED,
      circleId,
      `Joined ${circle.name}`
    );

    const updatedCircle = await this.circleRepository.findById(circleId);

    this.notificationService
      .notifyCircleJoin(userId, circle.name, circleId)
      .catch(console.error);

    return {
      circle: this.toListItem(updatedCircle!, true),
      points_awarded: pointsResult.awarded,
      points_balance: pointsResult.balance,
    };
  }

  async leaveCircle(circleId: string, userId: string): Promise<{ message: string }> {
    const circle = await this.circleRepository.findById(circleId);
    if (!circle) {
      throw new AppError("Circle not found", 404);
    }

    const isMember = await this.circleRepository.isMember(circleId, userId);
    if (!isMember) {
      throw new AppError("Not a member of this circle", 400);
    }

    await this.circleRepository.leaveCircle(circleId, userId);

    return { message: "Left circle successfully" };
  }

  async getCircleMembers(circleId: string, page = 1, limit = 20) {
    const circle = await this.circleRepository.findById(circleId);
    if (!circle) {
      throw new AppError("Circle not found", 404);
    }

    const { items, total } = await this.circleRepository.getMembers(
      circleId,
      page,
      limit
    );

    const members: CircleMemberItem[] = items.map((membership) => ({
      id: membership.user.id,
      full_name: membership.user.full_name,
      profile_picture: membership.user.profile_picture,
      role: membership.role,
      joined_at: membership.joined_at,
    }));

    return {
      items: members,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getCirclePosts(circleId: string, userId: string, page = 1, limit = 20) {
    return this.postService.getCirclePosts(circleId, userId, page, limit);
  }

  async getUserCircleSummaries(userId: string): Promise<CircleSummary[]> {
    return this.circleRepository.getUserCircles(userId);
  }

  private toListItem(circle: Circle, isJoined: boolean): CircleListItem {
    return {
      id: circle.id,
      name: circle.name,
      slug: circle.slug,
      description: circle.description,
      icon_url: circle.icon_url,
      member_count: circle.member_count,
      is_featured: circle.is_featured,
      is_joined: isJoined,
    };
  }
}
