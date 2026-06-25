import { UserRepository } from "../repositories/user.repository";
import { DiscoverRepository } from "../repositories/discover.repository";
import { CircleRepository } from "../repositories/circle.repository";
import { PostService } from "./post.service";
import { AppError } from "../middleware/error.middleware";
import { DiscoverLocalResponse } from "../types/community.types";

export class DiscoverService {
  private userRepository: UserRepository;
  private discoverRepository: DiscoverRepository;
  private circleRepository: CircleRepository;
  private postService: PostService;

  constructor(
    userRepository?: UserRepository,
    discoverRepository?: DiscoverRepository,
    circleRepository?: CircleRepository,
    postService?: PostService
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.discoverRepository = discoverRepository ?? new DiscoverRepository();
    this.circleRepository = circleRepository ?? new CircleRepository();
    this.postService = postService ?? new PostService();
  }

  async getLocalDiscover(userId: string): Promise<DiscoverLocalResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.location_opt_in) {
      throw new AppError(
        "Enable location sharing in profile to view local discover",
        400
      );
    }

    if (!user.city?.trim()) {
      return {
        local_posts: [],
        active_circles: [],
        recent_circle_activity: [],
      };
    }

    const city = user.city.trim();
    const joinedIds = await this.circleRepository.getJoinedCircleIds(userId);

    const [localFeed, activeRows, recentCircleIds] = await Promise.all([
      this.postService.getFeed(userId, "local", 1, 20),
      this.discoverRepository.getActiveCirclesByCity(city, 10),
      this.discoverRepository.getRecentCircleIdsByCity(city, 5),
    ]);

    const active_circles = activeRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon_url: row.icon_url,
      member_count: row.member_count,
      is_featured: row.is_featured,
      is_joined: joinedIds.has(row.id),
      post_count_in_city: row.post_count_in_city,
    }));

    const recent_circle_activity = [];
    for (const circleId of recentCircleIds) {
      const circle = await this.circleRepository.findById(circleId);
      if (!circle) continue;

      const { items } = await this.postService.getCirclePosts(
        circleId,
        userId,
        1,
        5
      );

      const cityPosts = items.filter((post) => post.city === city);
      if (cityPosts.length === 0) continue;

      recent_circle_activity.push({
        circle_id: circle.id,
        circle_name: circle.name,
        posts: cityPosts,
      });
    }

    return {
      local_posts: localFeed.items,
      active_circles,
      recent_circle_activity,
    };
  }
}
