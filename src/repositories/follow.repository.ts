import { AppDataSource } from '../config/database';
import { Follow } from '../entities/Follow.entity';
import { FollowStatus } from '../types';

export class FollowRepository {
  private repository = AppDataSource.getRepository(Follow);

  async create(followerId: string, followingId: string): Promise<Follow> {
    const follow = this.repository.create({
      follower_id: followerId,
      following_id: followingId,
      status: FollowStatus.PENDING,
    });
    return await this.repository.save(follow);
  }

  async findById(id: string): Promise<Follow | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['follower', 'following'],
    });
  }

  async findByUsers(followerId: string, followingId: string): Promise<Follow | null> {
    return await this.repository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });
  }

  async acceptFollow(id: string): Promise<Follow | null> {
    await this.repository.update(id, { status: FollowStatus.ACCEPTED });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getPendingRequests(userId: string): Promise<Follow[]> {
    return await this.repository.find({
      where: {
        following_id: userId,
        status: FollowStatus.PENDING,
      },
      relations: ['follower'],
      order: { created_at: 'DESC' },
    });
  }

  async getMatches(userId: string): Promise<any[]> {
    // Get users where both have followed each other with accepted status
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.profile_picture,
        u.bio,
        u.city,
        u.is_online,
        u.last_seen
      FROM follows f1
      INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
      INNER JOIN users u ON u.id = f1.following_id
      WHERE f1.follower_id = ? 
        AND f1.status = ? 
        AND f2.status = ?
      ORDER BY f1.created_at DESC
    `;

    return await this.repository.query(query, [
      userId,
      FollowStatus.ACCEPTED,
      FollowStatus.ACCEPTED,
    ]);
  }

  async checkMutualFollow(user1Id: string, user2Id: string): Promise<boolean> {
    const follow1 = await this.repository.findOne({
      where: {
        follower_id: user1Id,
        following_id: user2Id,
        status: FollowStatus.ACCEPTED,
      },
    });

    const follow2 = await this.repository.findOne({
      where: {
        follower_id: user2Id,
        following_id: user1Id,
        status: FollowStatus.ACCEPTED,
      },
    });

    return !!(follow1 && follow2);
  }

  async getConnectionStatus(
    viewerId: string,
    targetUserId: string
  ): Promise<"none" | "pending" | "following" | "connected"> {
    if (viewerId === targetUserId) {
      return "none";
    }

    const isMutual = await this.checkMutualFollow(viewerId, targetUserId);
    if (isMutual) {
      return "connected";
    }

    const outgoing = await this.findByUsers(viewerId, targetUserId);
    const incoming = await this.findByUsers(targetUserId, viewerId);

    if (incoming?.status === FollowStatus.PENDING) {
      return "pending";
    }

    if (outgoing?.status === FollowStatus.ACCEPTED) {
      return "following";
    }

    if (outgoing?.status === FollowStatus.PENDING) {
      return "following";
    }

    return "none";
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.repository.find({
      where: {
        follower_id: userId,
        status: FollowStatus.ACCEPTED,
      },
      select: ['following_id'],
    });

    return follows.map((f) => f.following_id);
  }

  async getFollowersIds(userId: string): Promise<string[]> {
    const follows = await this.repository.find({
      where: {
        following_id: userId,
        status: FollowStatus.ACCEPTED,
      },
      select: ['follower_id'],
    });

    return follows.map((f) => f.follower_id);
  }
}