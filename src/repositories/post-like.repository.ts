import { AppDataSource } from "../config/database";
import { PostLike } from "../entities/PostLike.entity";
import { EntityManager, In } from "typeorm";

export class PostLikeRepository {
  private repo = () => AppDataSource.getRepository(PostLike);

  async create(
    postId: string,
    userId: string,
    manager?: EntityManager
  ): Promise<PostLike> {
    const repository = manager ? manager.getRepository(PostLike) : this.repo();
    const like = repository.create({ post_id: postId, user_id: userId });
    return repository.save(like);
  }

  async findByPostAndUser(
    postId: string,
    userId: string
  ): Promise<PostLike | null> {
    return this.repo().findOne({
      where: { post_id: postId, user_id: userId },
    });
  }

  async delete(postId: string, userId: string): Promise<boolean> {
    const result = await this.repo().delete({ post_id: postId, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  async getLikedPostIds(
    userId: string,
    postIds: string[]
  ): Promise<Set<string>> {
    if (postIds.length === 0) {
      return new Set();
    }

    const likes = await this.repo().find({
      where: {
        user_id: userId,
        post_id: In(postIds),
      },
      select: ["post_id"],
    });

    return new Set(likes.map((like) => like.post_id));
  }
}
