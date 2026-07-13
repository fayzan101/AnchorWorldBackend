import { AppDataSource } from '../config/database';
import { RefreshToken } from '../entities/RefreshToken.entity';
import { LessThan } from 'typeorm';

export class RefreshTokenRepository {
  private repository = AppDataSource.getRepository(RefreshToken);

  async create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const refreshToken = this.repository.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });
    return await this.repository.save(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return await this.repository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repository.delete({ token });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ user_id: userId });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({
      expires_at: LessThan(new Date()),
    });
  }

  async getUserTokens(userId: string): Promise<RefreshToken[]> {
    return await this.repository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}