import { AppDataSource } from "../config/database";
import { PointsRepository } from "../repositories/points.repository";
import { AppError } from "../middleware/error.middleware";
import { PointTransaction } from "../entities/PointTransaction.entity";

export interface AwardPointsResult {
  balance: number;
  awarded: number;
  skipped?: boolean;
}

export class PointsService {
  private pointsRepository: PointsRepository;

  constructor(pointsRepository?: PointsRepository) {
    this.pointsRepository = pointsRepository ?? new PointsRepository();
  }

  async getBalance(userId: string): Promise<{ balance: number; lifetime_earned: number }> {
    const wallet = await this.pointsRepository.getOrCreateWallet(userId);
    return {
      balance: wallet.balance,
      lifetime_earned: wallet.lifetime_earned,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const { items, total } = await this.pointsRepository.getTransactions(
      userId,
      page,
      limit
    );

    return {
      items: items.map((tx) => this.formatTransaction(tx)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async awardPoints(
    userId: string,
    amount: number,
    type: string,
    referenceId?: string,
    description?: string
  ): Promise<AwardPointsResult> {
    if (amount <= 0) {
      throw new AppError("Award amount must be positive", 400);
    }

    return AppDataSource.transaction(async (manager) => {
      const wallet = await this.pointsRepository.getWalletForUpdate(userId, manager);
      wallet.balance += amount;
      wallet.lifetime_earned += amount;
      await this.pointsRepository.saveWallet(wallet, manager);
      await this.pointsRepository.createTransaction(
        {
          user_id: userId,
          amount,
          type,
          reference_id: referenceId ?? null,
          description: description ?? null,
        },
        manager
      );

      return { balance: wallet.balance, awarded: amount };
    });
  }

  async awardPointsOnce(
    userId: string,
    amount: number,
    type: string,
    referenceId?: string,
    description?: string
  ): Promise<AwardPointsResult> {
    const already = await this.pointsRepository.hasEverEarned(userId, type);
    if (already) {
      const wallet = await this.pointsRepository.getOrCreateWallet(userId);
      return { balance: wallet.balance, awarded: 0, skipped: true };
    }
    return this.awardPoints(userId, amount, type, referenceId, description);
  }

  async awardPointsOncePerReference(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description?: string
  ): Promise<AwardPointsResult> {
    const already = await this.pointsRepository.hasEarnedWithReference(
      userId,
      type,
      referenceId
    );
    if (already) {
      const wallet = await this.pointsRepository.getOrCreateWallet(userId);
      return { balance: wallet.balance, awarded: 0, skipped: true };
    }
    return this.awardPoints(userId, amount, type, referenceId, description);
  }

  async awardPointsWithinDailyPointsCap(
    userId: string,
    amount: number,
    type: string,
    dailyPointsCap: number,
    referenceId?: string,
    description?: string
  ): Promise<AwardPointsResult> {
    const earnedToday = await this.pointsRepository.countEarnedToday(userId, type);
    if (earnedToday + amount > dailyPointsCap) {
      const wallet = await this.pointsRepository.getOrCreateWallet(userId);
      return { balance: wallet.balance, awarded: 0, skipped: true };
    }
    return this.awardPoints(userId, amount, type, referenceId, description);
  }

  async awardPointsWithinDailyEventCap(
    userId: string,
    amount: number,
    type: string,
    maxEventsPerDay: number,
    referenceId?: string,
    description?: string
  ): Promise<AwardPointsResult> {
    const eventsToday = await this.pointsRepository.countTransactionsToday(
      userId,
      type
    );
    if (eventsToday >= maxEventsPerDay) {
      const wallet = await this.pointsRepository.getOrCreateWallet(userId);
      return { balance: wallet.balance, awarded: 0, skipped: true };
    }
    return this.awardPoints(userId, amount, type, referenceId, description);
  }

  async awardDailyLogin(userId: string): Promise<AwardPointsResult> {
    const alreadyToday = await this.pointsRepository.hasEarnedToday(
      userId,
      "daily_login"
    );
    if (alreadyToday) {
      const wallet = await this.pointsRepository.getOrCreateWallet(userId);
      return { balance: wallet.balance, awarded: 0, skipped: true };
    }
    return this.awardPoints(userId, 10, "daily_login", undefined, "Daily login bonus");
  }

  async spendPoints(
    userId: string,
    amount: number,
    type: string,
    referenceId?: string,
    description?: string
  ): Promise<{ balance: number; spent: number }> {
    if (amount <= 0) {
      throw new AppError("Spend amount must be positive", 400);
    }

    return AppDataSource.transaction(async (manager) => {
      const wallet = await this.pointsRepository.getWalletForUpdate(userId, manager);

      if (wallet.balance < amount) {
        throw new AppError("Insufficient Anchor Points", 402);
      }

      wallet.balance -= amount;
      await this.pointsRepository.saveWallet(wallet, manager);
      await this.pointsRepository.createTransaction(
        {
          user_id: userId,
          amount: -amount,
          type,
          reference_id: referenceId ?? null,
          description: description ?? null,
        },
        manager
      );

      return { balance: wallet.balance, spent: amount };
    });
  }

  async getDailyEarned(userId: string, type: string): Promise<number> {
    return this.pointsRepository.countEarnedToday(userId, type);
  }

  private formatTransaction(tx: PointTransaction) {
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      reference_id: tx.reference_id,
      description: tx.description,
      created_at: tx.created_at,
    };
  }
}
