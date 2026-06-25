import { AppDataSource } from "../config/database";
import { Post } from "../entities/Post.entity";
import { FeedFilter } from "../types/post.types";
import { EntityManager, In, IsNull } from "typeorm";

export interface FeedQueryOptions {
  viewerId: string;
  filter: FeedFilter;
  circleId?: string;
  joinedCircleIds: string[];
  followingIds: string[];
  viewerCity?: string | null;
  locationOptIn: boolean;
  blockedUserIds: string[];
  page: number;
  limit: number;
}

export class PostRepository {
  private repo = () => AppDataSource.getRepository(Post);

  async create(
    data: Partial<Post>,
    manager?: EntityManager
  ): Promise<Post> {
    const repository = manager ? manager.getRepository(Post) : this.repo();
    const post = repository.create(data);
    return repository.save(post);
  }

  async findById(id: string): Promise<Post | null> {
    return this.repo().findOne({
      where: { id },
      relations: ["user", "user.hobbies", "circle"],
      withDeleted: false,
    });
  }

  async findByIdIncludingDeleted(id: string): Promise<Post | null> {
    return this.repo().findOne({
      where: { id },
      relations: ["user", "user.hobbies", "circle"],
      withDeleted: true,
    });
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await this.repo().softDelete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  async countByUser(userId: string): Promise<number> {
    return this.repo().count({
      where: { user_id: userId },
    });
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    blockedUserIds: string[]
  ): Promise<{ items: Post[]; total: number }> {
    if (blockedUserIds.includes(userId)) {
      return { items: [], total: 0 };
    }

    const [items, total] = await this.repo().findAndCount({
      where: { user_id: userId },
      relations: ["user", "user.hobbies", "circle"],
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findByCircle(
    circleId: string,
    page: number,
    limit: number,
    blockedUserIds: string[]
  ): Promise<{ items: Post[]; total: number }> {
    const qb = this.repo()
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.user", "user")
      .leftJoinAndSelect("user.hobbies", "hobbies")
      .leftJoinAndSelect("post.circle", "circle")
      .where("post.circle_id = :circleId", { circleId })
      .andWhere("post.deleted_at IS NULL");

    if (blockedUserIds.length > 0) {
      qb.andWhere("post.user_id NOT IN (:...blockedUserIds)", {
        blockedUserIds,
      });
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy("post.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total };
  }

  async findFeed(
    options: FeedQueryOptions
  ): Promise<{ items: Post[]; total: number }> {
    const {
      filter,
      circleId,
      joinedCircleIds,
      followingIds,
      viewerCity,
      locationOptIn,
      blockedUserIds,
      page,
      limit,
    } = options;

    const qb = this.repo()
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.user", "user")
      .leftJoinAndSelect("user.hobbies", "hobbies")
      .leftJoinAndSelect("post.circle", "circle")
      .where("post.deleted_at IS NULL");

    if (blockedUserIds.length > 0) {
      qb.andWhere("post.user_id NOT IN (:...blockedUserIds)", {
        blockedUserIds,
      });
    }

    if (circleId) {
      qb.andWhere("post.circle_id = :circleId", { circleId });
    } else {
      switch (filter) {
        case "circles":
          if (joinedCircleIds.length === 0) {
            return { items: [], total: 0 };
          }
          qb.andWhere("post.circle_id IN (:...joinedCircleIds)", {
            joinedCircleIds,
          });
          break;
        case "following":
          if (followingIds.length === 0) {
            return { items: [], total: 0 };
          }
          qb.andWhere("post.user_id IN (:...followingIds)", { followingIds });
          break;
        case "local":
          if (!locationOptIn || !viewerCity) {
            return { items: [], total: 0 };
          }
          qb.andWhere("post.city = :viewerCity", { viewerCity });
          break;
        case "all":
        default:
          break;
      }
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy("post.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total };
  }

  async incrementLikeCount(postId: string, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(Post) : this.repo();
    await repository.increment({ id: postId }, "like_count", 1);
  }

  async decrementLikeCount(postId: string, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(Post) : this.repo();
    const post = await repository.findOne({ where: { id: postId } });
    if (post && post.like_count > 0) {
      await repository.decrement({ id: postId }, "like_count", 1);
    }
  }

  async incrementCommentCount(
    postId: string,
    manager?: EntityManager
  ): Promise<void> {
    const repository = manager ? manager.getRepository(Post) : this.repo();
    await repository.increment({ id: postId }, "comment_count", 1);
  }

  async decrementCommentCount(
    postId: string,
    manager?: EntityManager
  ): Promise<void> {
    const repository = manager ? manager.getRepository(Post) : this.repo();
    const post = await repository.findOne({ where: { id: postId } });
    if (post && post.comment_count > 0) {
      await repository.decrement({ id: postId }, "comment_count", 1);
    }
  }

  async findByIds(ids: string[]): Promise<Post[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repo().find({
      where: { id: In(ids), deleted_at: IsNull() },
      relations: ["user", "user.hobbies", "circle"],
    });
  }
}
