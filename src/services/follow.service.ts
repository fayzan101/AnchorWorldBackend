import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import { NotificationService } from "./notification.service";
import { PointsService } from "./points.service";
import { PointAmounts, PointTypes } from "../constants/point-types";
import { isEitherBlocked } from "../utils/block.util";

export class FollowService {
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private notificationService: NotificationService;
  private pointsService: PointsService;

  constructor(
    followRepository?: FollowRepository,
    userRepository?: UserRepository,
    notificationService?: NotificationService,
    pointsService?: PointsService
  ) {
    this.followRepository = followRepository ?? new FollowRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.notificationService = notificationService ?? new NotificationService();
    this.pointsService = pointsService ?? new PointsService();
  }

  async sendFollowRequest(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError("Cannot follow yourself", 400);
    }

    if (await isEitherBlocked(followerId, followingId)) {
      throw new AppError("Cannot connect with this user", 403);
    }

    const userToFollow = await this.userRepository.findById(followingId);
    if (!userToFollow) {
      throw new AppError("User not found", 404);
    }

    const follower = await this.userRepository.findById(followerId);

    const existingFollow = await this.followRepository.findByUsers(
      followerId,
      followingId
    );
    if (existingFollow) {
      throw new AppError("Follow request already exists", 409);
    }

    const reverseFollow = await this.followRepository.findByUsers(
      followingId,
      followerId
    );
    if (reverseFollow && reverseFollow.status === "pending") {
      await this.followRepository.acceptFollow(reverseFollow.id);

      const newFollow = await this.followRepository.create(
        followerId,
        followingId
      );
      await this.followRepository.acceptFollow(newFollow.id);

      await this.awardConnectionPoints(followerId, followingId);

      this.notificationService
        .notifyConnectionMade(followingId, follower!.full_name, followerId)
        .catch(console.error);

      return {
        id: newFollow.id,
        follower_id: newFollow.follower_id,
        following_id: newFollow.following_id,
        status: newFollow.status,
        created_at: newFollow.created_at,
        message: "You are now connected!",
      };
    }

    const follow = await this.followRepository.create(followerId, followingId);

    this.notificationService
      .notifyConnectionRequest(followingId, follower!.full_name, followerId)
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

    if (follow.following_id !== userId) {
      throw new AppError("Not authorized to accept this request", 403);
    }

    if (follow.status === "accepted") {
      throw new AppError("Request already accepted", 400);
    }

    if (await isEitherBlocked(userId, follow.follower_id)) {
      throw new AppError("Cannot connect with this user", 403);
    }

    const accepter = await this.userRepository.findById(userId);

    const updatedFollow = await this.followRepository.acceptFollow(followId);

    const reverseFollow = await this.followRepository.findByUsers(
      userId,
      follow.follower_id
    );

    if (!reverseFollow) {
      const newReverseFollow = await this.followRepository.create(
        userId,
        follow.follower_id
      );
      await this.followRepository.acceptFollow(newReverseFollow.id);
    } else if (reverseFollow.status === "pending") {
      await this.followRepository.acceptFollow(reverseFollow.id);
    }

    await this.awardConnectionPoints(userId, follow.follower_id);

    this.notificationService
      .notifyConnectionMade(follow.follower_id, accepter!.full_name, userId)
      .catch(console.error);

    return {
      id: updatedFollow!.id,
      follower_id: updatedFollow!.follower_id,
      following_id: updatedFollow!.following_id,
      status: updatedFollow!.status,
      updated_at: updatedFollow!.updated_at,
      message: "You are now connected!",
    };
  }

  async removeFollow(followId: string, userId: string) {
    const follow = await this.followRepository.findById(followId);

    if (!follow) {
      throw new AppError("Follow not found", 404);
    }

    if (follow.follower_id !== userId && follow.following_id !== userId) {
      throw new AppError("Not authorized to remove this follow", 403);
    }

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

  async getConnections(userId: string) {
    const connections = await this.followRepository.getMatches(userId);

    return connections.map((connection) => ({
      id: connection.id,
      full_name: connection.full_name,
      profile_picture: connection.profile_picture,
      bio: connection.bio,
      city: connection.city ?? connection.location ?? null,
      is_online: connection.is_online,
      last_seen: connection.last_seen,
    }));
  }

  async checkMutualFollow(user1Id: string, user2Id: string): Promise<boolean> {
    return await this.followRepository.checkMutualFollow(user1Id, user2Id);
  }

  private async awardConnectionPoints(
    user1Id: string,
    user2Id: string
  ): Promise<void> {
    const amount = PointAmounts[PointTypes.CONNECTION_MADE];
    const awards = [
      { userId: user1Id, referenceId: user2Id },
      { userId: user2Id, referenceId: user1Id },
    ].sort((a, b) => a.userId.localeCompare(b.userId));

    for (const { userId, referenceId } of awards) {
      await this.pointsService.awardPointsOncePerReference(
        userId,
        amount,
        PointTypes.CONNECTION_MADE,
        referenceId,
        "New connection made"
      );
    }
  }
}
