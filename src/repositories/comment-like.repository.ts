import { AppDataSource } from "../config/database";
import { CommentLike } from "../entities/CommentLike.entity";
import { EntityManager } from "typeorm";

export class CommentLikeRepository {
  private repo = () => AppDataSource.getRepository(CommentLike);

  async findByCommentAndUser(
    commentId: string,
    userId: string
  ): Promise<CommentLike | null> {
    return this.repo().findOne({
      where: { comment_id: commentId, user_id: userId },
    });
  }

  async findLikedCommentIds(
    userId: string,
    commentIds: string[]
  ): Promise<Set<string>> {
    if (commentIds.length === 0) return new Set();
    const rows = await this.repo()
      .createQueryBuilder("like")
      .select("like.comment_id", "comment_id")
      .where("like.user_id = :userId", { userId })
      .andWhere("like.comment_id IN (:...commentIds)", { commentIds })
      .getRawMany();
    return new Set(rows.map((r) => r.comment_id as string));
  }

  async create(
    data: Partial<CommentLike>,
    manager?: EntityManager
  ): Promise<CommentLike> {
    const repository = manager
      ? manager.getRepository(CommentLike)
      : this.repo();
    const like = repository.create(data);
    return repository.save(like);
  }

  async delete(commentId: string, userId: string): Promise<boolean> {
    const result = await this.repo().delete({
      comment_id: commentId,
      user_id: userId,
    });
    return (result.affected ?? 0) > 0;
  }
}
