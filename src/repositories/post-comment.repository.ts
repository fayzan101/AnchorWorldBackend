import { AppDataSource } from "../config/database";
import { PostComment } from "../entities/PostComment.entity";
import { EntityManager } from "typeorm";

export class PostCommentRepository {
  private repo = () => AppDataSource.getRepository(PostComment);

  async create(
    data: Partial<PostComment>,
    manager?: EntityManager
  ): Promise<PostComment> {
    const repository = manager
      ? manager.getRepository(PostComment)
      : this.repo();
    const comment = repository.create(data);
    return repository.save(comment);
  }

  async findById(id: string): Promise<PostComment | null> {
    return this.repo().findOne({
      where: { id },
      relations: ["user", "user.hobbies"],
      withDeleted: false,
    });
  }

  async findByPost(
    postId: string,
    page: number,
    limit: number
  ): Promise<{ items: PostComment[]; total: number }> {
    const [items, total] = await this.repo().findAndCount({
      where: { post_id: postId },
      relations: ["user", "user.hobbies"],
      order: { created_at: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await this.repo().softDelete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  async incrementLikeCount(id: string, manager?: EntityManager): Promise<void> {
    const repository = manager
      ? manager.getRepository(PostComment)
      : this.repo();
    await repository.increment({ id }, "like_count", 1);
  }

  async decrementLikeCount(id: string): Promise<void> {
    await this.repo()
      .createQueryBuilder()
      .update(PostComment)
      .set({ like_count: () => "GREATEST(like_count - 1, 0)" })
      .where("id = :id", { id })
      .execute();
  }
}
