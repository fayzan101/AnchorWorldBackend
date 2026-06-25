import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import { NotificationService } from "./notification.service";

export class FollowService {
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private notificationService: NotificationService;

  constructor() {
    this.followRepository = new FollowRepository();
    this.userRepository = new UserRepository();
    this.notificationService = new NotificationService();
  }

  async sendFollowRequest(followerId: string, followingId: string) {
    // Check if trying to follow self
    if (followerId === followingId) {
      throw new AppError("Cannot follow yourself", 400);
    }

    // Check if user exists
    const userToFollow = await this.userRepository.findById(followingId);
    if (!userToFollow) {
      throw new AppError("User not found", 404);
    }

    // Get follower info for notification
    const follower = await this.userRepository.findById(followerId);

    // Check if already following or request exists
    const existingFollow = await this.followRepository.findByUsers(
      followerId,
      followingId
    );
    if (existingFollow) {
      throw new AppError("Follow request already exists", 409);
    }

    // Check if reverse request exists (User B already sent to User A)
    const reverseFollow = await this.followRepository.findByUsers(
      followingId,
      followerId
    );
    if (reverseFollow && reverseFollow.status === "pending") {
      // User B already sent request to User A
      // Auto-accept both and make them friends
      await this.followRepository.acceptFollow(reverseFollow.id);

      // Create and accept the new follow
      const newFollow = await this.followRepository.create(
        followerId,
        followingId
      );
      await this.followRepository.acceptFollow(newFollow.id);

      // Send notification: You are now friends!
      this.notificationService
        .notifyFriendAccept(followingId, follower!.full_name, followerId)
        .catch(console.error);

      return {
        id: newFollow.id,
        follower_id: newFollow.follower_id,
        following_id: newFollow.following_id,
        status: newFollow.status,
        created_at: newFollow.created_at,
        message: "You are now friends!",
      };
    }

    // Create follow request
    const follow = await this.followRepository.create(followerId, followingId);

    // Send notification: New friend request
    this.notificationService
      .notifyFriendRequest(followingId, follower!.full_name, followerId)
      .catch(console.error);

    return {
      id: follow.id,
      follower_id: follow.follower_id,
      following_id: follow.following_id,
      status: follow.status,
      created_at: follow.created_at,
    };
  }

  async acceptFollowRequest(followId: string, userId: string) {
    const follow = await this.followRepository.findById(followId);

    if (!follow) {
      throw new AppError("Follow request not found", 404);
    }

    // Check if user is the one being followed
    if (follow.following_id !== userId) {
      throw new AppError("Not authorized to accept this request", 403);
    }

    // Check if already accepted
    if (follow.status === "accepted") {
      throw new AppError("Request already accepted", 400);
    }

    // Get accepter info for notification
    const accepter = await this.userRepository.findById(userId);

    // Accept the follow request
    const updatedFollow = await this.followRepository.acceptFollow(followId);

    // NEW: Automatically create reverse follow to make them mutual friends
    const reverseFollow = await this.followRepository.findByUsers(
      userId,
      follow.follower_id
    );

    if (!reverseFollow) {
      // Create reverse follow and accept it immediately
      const newReverseFollow = await this.followRepository.create(
        userId,
        follow.follower_id
      );
      await this.followRepository.acceptFollow(newReverseFollow.id);
    } else if (reverseFollow.status === "pending") {
      // If reverse follow exists but pending, accept it
      await this.followRepository.acceptFollow(reverseFollow.id);
    }

    // Send notification: Friend request accepted
    this.notificationService
      .notifyFriendAccept(follow.follower_id, accepter!.full_name, userId)
      .catch(console.error);

    return {
      id: updatedFollow!.id,
      follower_id: updatedFollow!.follower_id,
      following_id: updatedFollow!.following_id,
      status: updatedFollow!.status,
      updated_at: updatedFollow!.updated_at,
      message: "You are now friends!",
    };
  }

  async removeFollow(followId: string, userId: string) {
    const follow = await this.followRepository.findById(followId);

    if (!follow) {
      throw new AppError("Follow not found", 404);
    }

    // Check if user is either the follower or the one being followed
    if (follow.follower_id !== userId && follow.following_id !== userId) {
      throw new AppError("Not authorized to remove this follow", 403);
    }

    // If they are friends (accepted), also remove the reverse follow
    if (follow.status === "accepted") {
      const reverseFollow = await this.followRepository.findByUsers(
        follow.following_id,
        follow.follower_id
      );

      if (reverseFollow) {
        await this.followRepository.delete(reverseFollow.id);
      }
    }

    await this.followRepository.delete(followId);

    return { message: "Follow removed successfully" };
  }

  async getPendingRequests(userId: string) {
    const follows = await this.followRepository.getPendingRequests(userId);

    return follows.map((follow) => ({
      id: follow.id,
      follower: {
        id: follow.follower.id,
        full_name: follow.follower.full_name,
        profile_picture: follow.follower.profile_picture,
        bio: follow.follower.bio,
      },
      created_at: follow.created_at,
    }));
  }

  async getMatches(userId: string) {
    const matches = await this.followRepository.getMatches(userId);

    return matches.map((match) => ({
      id: match.id,
      full_name: match.full_name,
      profile_picture: match.profile_picture,
      bio: match.bio,
      location: match.location,
      is_online: match.is_online,
      last_seen: match.last_seen,
    }));
  }

  async checkMutualFollow(user1Id: string, user2Id: string): Promise<boolean> {
    return await this.followRepository.checkMutualFollow(user1Id, user2Id);
  }
}
