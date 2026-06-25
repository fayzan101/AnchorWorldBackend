import { LikeRepository } from "../repositories/like.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";

export class LikeService {
  private likeRepository: LikeRepository;
  private userRepository: UserRepository;

  constructor() {
    this.likeRepository = new LikeRepository();
    this.userRepository = new UserRepository();
  }

  async likeUser(likerId: string, likedId: string) {
    // Check if trying to like self
    if (likerId === likedId) {
      throw new AppError("Cannot like yourself", 400);
    }

    // Check if user exists
    const userToLike = await this.userRepository.findById(likedId);
    if (!userToLike) {
      throw new AppError("User not found", 404);
    }

    // Check if already liked
    const existingLike = await this.likeRepository.findByUsers(
      likerId,
      likedId
    );
    if (existingLike) {
      throw new AppError("User already liked", 409);
    }

    // Create like
    const like = await this.likeRepository.create(likerId, likedId);

    return {
      id: like.id,
      liked_user_id: likedId,
      created_at: like.created_at,
    };
  }

  async unlikeUser(likerId: string, likedId: string) {
    // Check if like exists
    const existingLike = await this.likeRepository.findByUsers(
      likerId,
      likedId
    );
    if (!existingLike) {
      throw new AppError("Like not found", 404);
    }

    await this.likeRepository.delete(likerId, likedId);

    return { message: "User unliked successfully" };
  }

  async getUserLikes(userId: string) {
    const likes = await this.likeRepository.getUserLikes(userId);

    return likes.map((like) => ({
      id: like.id,
      user: {
        id: like.liker.id,
        full_name: like.liker.full_name,
        profile_picture: like.liker.profile_picture,
        bio: like.liker.bio,
      },
      created_at: like.created_at,
    }));
  }

  async getLikedByMe(userId: string) {
    const likes = await this.likeRepository.getLikedByMe(userId);

    return likes.map((like) => ({
      id: like.id,
      user: {
        id: like.liked.id,
        full_name: like.liked.full_name,
        profile_picture: like.liked.profile_picture,
        bio: like.liked.bio,
      },
      created_at: like.created_at,
    }));
  }

  async getLikesCount(userId: string): Promise<number> {
    return await this.likeRepository.getLikesCount(userId);
  }

  async hasLiked(likerId: string, likedId: string): Promise<boolean> {
    return await this.likeRepository.hasLiked(likerId, likedId);
  }
}
