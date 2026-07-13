import { AppDataSource } from "../config/database";
import { Like } from "../entities/Like.entity";

export class LikeRepository {
  private repository = AppDataSource.getRepository(Like);

  async create(likerId: string, likedId: string): Promise<Like> {
    const like = this.repository.create({
      liker_id: likerId,
      liked_id: likedId,
    });
    return await this.repository.save(like);
  }

  async findByUsers(likerId: string, likedId: string): Promise<Like | null> {
    return await this.repository.findOne({
      where: {
        liker_id: likerId,
        liked_id: likedId,
      },
    });
  }

  async delete(likerId: string, likedId: string): Promise<void> {
    await this.repository.delete({
      liker_id: likerId,
      liked_id: likedId,
    });
  }

  async getLikesCount(userId: string): Promise<number> {
    return await this.repository.count({
      where: { liked_id: userId },
    });
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    return await this.repository.find({
      where: { liked_id: userId },
      relations: ["liker"],
      order: { created_at: "DESC" },
    });
  }

  async getLikedByMe(userId: string): Promise<Like[]> {
    return await this.repository.find({
      where: { liker_id: userId },
      relations: ['liked'],
      order: { created_at: 'DESC' },
    });
  }

  async hasLiked(likerId: string, likedId: string): Promise<boolean> {
    const like = await this.findByUsers(likerId, likedId);
    return !!like;
  }

  // Get likes counts for multiple users at once (for listing optimization)
  async getLikesCountForUsers(userIds: string[]): Promise<Map<string, number>> {
    const result = await this.repository
      .createQueryBuilder("like")
      .select("like.liked_id", "userId")
      .addSelect("COUNT(*)", "count")
      .where("like.liked_id IN (:...userIds)", { userIds })
      .groupBy("like.liked_id")
      .getRawMany();

    const likesMap = new Map<string, number>();
    result.forEach((row) => {
      likesMap.set(row.userId, parseInt(row.count));
    });

    // Set 0 for users with no likes
    userIds.forEach((id) => {
      if (!likesMap.has(id)) {
        likesMap.set(id, 0);
      }
    });

    return likesMap;
  }
}
