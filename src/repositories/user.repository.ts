import { AppDataSource } from "../config/database";
import { User } from "../entities/User.entity";
import { Gender } from "../types";

export class UserRepository {
  private repository = AppDataSource.getRepository(User);

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ["hobbies", "relationship_goals", "partner_qualities"],
    });
  }

  async markReportById(id: string): Promise<void> {
    await this.repository.update(id,{
      report_count: () => "report_count + 1",
    });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return await this.repository
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
      .where("user.id = :id", { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return await this.repository
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
      .where("user.email = :email", { email })
      .getOne();
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    gender?: Gender,
    search?: string,
    excludeUserId?: string
  ): Promise<{ users: User[]; total: number }> {
    const query = this.repository.createQueryBuilder("user");

    if (excludeUserId) {
      query.andWhere("user.id != :excludeUserId", { excludeUserId });
    }

    if (gender) {
      query.andWhere("user.gender = :gender", { gender });
    }

    if (search) {
      query.andWhere(
        "(user.full_name LIKE :search OR user.location LIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [users, total] = await query
      .orderBy("user.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  async findAllWithRelationshipStatus(
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
    gender?: Gender,
    search?: string
  ): Promise<{ users: any[]; total: number }> {
    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.date_of_birth,
        u.gender,
        u.bio,
        u.profile_picture,
        u.city,
        u.is_online,
        u.last_seen,
        u.created_at,
        GROUP_CONCAT(DISTINCT h.name) AS hobbies,
        CASE
          WHEN f1.status = 'accepted' AND f2.status = 'accepted' THEN 'connected'
          WHEN f1.status = 'pending' THEN 'pending_sent'
          WHEN f2.status = 'pending' THEN 'pending_received'
          ELSE 'none'
        END as relationship_status,
        CASE
          WHEN f2.status = 'pending' THEN f2.id
          ELSE NULL
        END as follow_request_id
      FROM users u
      LEFT JOIN follows f1 ON f1.follower_id = ? AND f1.following_id = u.id
      LEFT JOIN follows f2 ON f2.follower_id = u.id AND f2.following_id = ?
      LEFT JOIN user_hobbies uh ON uh.user_id = u.id
      LEFT JOIN hobbies h ON uh.hobby_id = h.id
      WHERE u.id != ?
    `;

    const params: any[] = [currentUserId, currentUserId, currentUserId];

    if (gender) {
      query += ` AND u.gender = ?`;
      params.push(gender);
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.location LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const users = await this.repository.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE u.id != ?
    `;
    const countParams: any[] = [currentUserId];

    if (gender) {
      countQuery += ` AND u.gender = ?`;
      countParams.push(gender);
    }

    if (search) {
      countQuery += ` AND (u.full_name LIKE ? OR u.location LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [{ total }] = await this.repository.query(countQuery, countParams);

    return { users, total: parseInt(total) };
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return await this.findById(id);
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.repository.update(id, {
      is_online: isOnline,
      last_seen: isOnline ? null : new Date(),
    });
  }

  async setResetToken(
    id: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    await this.repository.update(id, {
      reset_token: token,
      reset_token_expires: expiresAt,
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.repository
      .createQueryBuilder("user")
      .addSelect("user.reset_token")
      .addSelect("user.reset_token_expires")
      .where("user.reset_token = :token", { token })
      .andWhere("user.reset_token_expires > :now", { now: new Date() })
      .getOne();
  }

  async clearResetToken(id: string): Promise<void> {
    await this.repository.update(id, {
      reset_token: null,
      reset_token_expires: null,
    });
  }

  async save(userData: Partial<User>): Promise<User> {
    return await this.repository.save(userData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
