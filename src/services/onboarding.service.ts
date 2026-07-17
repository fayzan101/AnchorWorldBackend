import { validate as isUuid } from "uuid";
import { UserRepository } from "../repositories/user.repository";
import { HobbyRepository } from "../repositories/hobby.repository";
import { CircleRepository } from "../repositories/circle.repository";
import { CircleService } from "./circle.service";
import { PointsService } from "./points.service";
import { AppError } from "../middleware/error.middleware";
import {
  CommunityOnboardingDto,
  OnboardingStatusResponse,
  OwnProfile,
} from "../types/community.types";
import { PointTypes, PointAmounts } from "../constants/point-types";
import { toOwnProfile } from "../utils/user-response.mapper";
import { PostService } from "./post.service";

const REJECTED_ONBOARDING_FIELDS = [
  "seeking_relation",
  "interested_in",
  "relationship_goals",
  "date_you_reason",
  "partner_qualities",
  "height",
  "have_kids",
  "kids",
] as const;

const MIN_SUGGESTED_CIRCLES = 2;

export class OnboardingService {
  private userRepository: UserRepository;
  private hobbyRepository: HobbyRepository;
  private circleRepository: CircleRepository;
  private circleService: CircleService;
  private pointsService: PointsService;
  private postService: PostService;

  constructor(
    userRepository?: UserRepository,
    hobbyRepository?: HobbyRepository,
    circleRepository?: CircleRepository,
    circleService?: CircleService,
    pointsService?: PointsService,
    postService?: PostService
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.hobbyRepository = hobbyRepository ?? new HobbyRepository();
    this.circleRepository = circleRepository ?? new CircleRepository();
    this.circleService = circleService ?? new CircleService();
    this.pointsService = pointsService ?? new PointsService();
    this.postService = postService ?? new PostService();
  }

  async getStatus(userId: string): Promise<OnboardingStatusResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [circles, joinedIds] = await Promise.all([
      this.circleRepository.findFeatured(7),
      this.circleRepository.getJoinedCircleIds(userId),
    ]);

    const suggested_circles = circles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      slug: circle.slug,
      description: circle.description,
      icon_url: circle.icon_url,
      member_count: circle.member_count,
      is_featured: circle.is_featured,
      is_joined: joinedIds.has(circle.id),
    }));

    return {
      completed: Boolean(user.onboarding_completed_at),
      onboarding_completed_at: user.onboarding_completed_at ?? null,
      suggested_circles,
      joined_circle_count: joinedIds.size,
    };
  }

  async completeCommunityOnboarding(
    userId: string,
    body: CommunityOnboardingDto
  ): Promise<OwnProfile & { points_awarded: number; circles_joined: number }> {
    this.rejectDeprecatedFields(body as unknown as Record<string, unknown>);

    const interestInput = body.interests ?? body.hobbies ?? [];
    if (interestInput.length < 2) {
      throw new AppError("Pick at least 2 topics", 400);
    }

    if (!body.conversation_style?.trim()) {
      throw new AppError("Participation style is required", 400);
    }

    if (!body.humor_type?.trim()) {
      throw new AppError("Community tone is required", 400);
    }

    if (!body.city?.trim()) {
      throw new AppError("City is required for community onboarding", 400);
    }

    if (
      !body.suggested_circle_ids ||
      body.suggested_circle_ids.length < MIN_SUGGESTED_CIRCLES
    ) {
      throw new AppError(
        `Join at least ${MIN_SUGGESTED_CIRCLES} suggested circles`,
        400
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const wasOnboarded = Boolean(user.onboarding_completed_at);
    const hobbyIds = await this.resolveInterestIds(interestInput);
    const hobbies = await this.hobbyRepository.findByIds(hobbyIds);

    user.bio = body.bio?.trim() ?? user.bio;
    user.city = body.city.trim();
    user.country = body.country?.trim() ?? user.country;
    user.location_opt_in = body.location_opt_in ?? false;
    user.humor_type = body.humor_type?.trim() ?? user.humor_type;
    user.conversation_style =
      body.conversation_style?.trim() ?? user.conversation_style;
    user.hobbies = hobbies;
    user.profile_completed = true;
    user.onboarding_completed_at = user.onboarding_completed_at ?? new Date();

    await this.userRepository.save(user);

    let circlesJoined = 0;
    for (const circleId of body.suggested_circle_ids) {
      try {
        await this.circleService.joinCircle(circleId, userId);
        circlesJoined += 1;
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 409) {
          continue;
        }
        throw error;
      }
    }

    let pointsAwarded = 0;
    if (!wasOnboarded) {
      const pointsResult = await this.pointsService.awardPointsOnce(
        userId,
        PointAmounts[PointTypes.PROFILE_COMPLETE],
        PointTypes.PROFILE_COMPLETE,
        undefined,
        "Community onboarding completed"
      );
      pointsAwarded = pointsResult.awarded;
    }

    const updatedUser = await this.userRepository.findById(userId);
    const [{ balance }, circles, postCount] = await Promise.all([
      this.pointsService.getBalance(userId),
      this.circleService.getUserCircleSummaries(userId),
      this.postService.countUserPosts(userId),
    ]);

    const profile = toOwnProfile(updatedUser!, {
      pointsBalance: balance,
      postCount,
      circles,
    });

    return {
      ...profile,
      points_awarded: pointsAwarded,
      circles_joined: circlesJoined,
    };
  }

  private rejectDeprecatedFields(body: Record<string, unknown>): void {
    for (const field of REJECTED_ONBOARDING_FIELDS) {
      if (body[field] !== undefined) {
        throw new AppError(
          `Field "${field}" is not accepted. Use POST /api/onboarding/community`,
          400
        );
      }
    }
  }

  private async resolveInterestIds(interests: string[]): Promise<string[]> {
    const ids: string[] = [];

    for (const raw of interests) {
      const value = raw?.trim();
      if (!value) continue;

      if (isUuid(value)) {
        ids.push(value);
        continue;
      }

      const hobby = await this.hobbyRepository.findByName(value);
      if (hobby) {
        ids.push(hobby.id);
      }
    }

    return [...new Set(ids)];
  }
}
