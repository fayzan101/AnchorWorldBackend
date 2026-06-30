import { AppDataSource } from "../config/database";
import { PointsRepository } from "../repositories/points.repository";
import { AppError } from "../middleware/error.middleware";
import { PointTransaction } from "../entities/PointTransaction.entity";
import { EntityManager } from "typeorm";
import { NotificationService } from "./notification.service";
import { emitPointsUpdated } from "./socket-event.service";
import { POINTS_MILESTONE_BALANCE } from "../constants/notification-types";

function isDeadlock(error: unknown): boolean {
  const err = error as { code?: string; errno?: number };
  return err.code === "ER_LOCK_DEADLOCK" || err.errno === 1213;
}

export interface AwardPointsResult {
  balance: number;
  awarded: number;
  skipped?: boolean;
}

export class PointsService {
  private pointsRepository: PointsRepository;
  private notificationService: NotificationService;

  constructor(
    pointsRepository?: PointsRepository,
    notificationService?: NotificationService
  ) {
    this.pointsRepository = pointsRepository ?? new PointsRepository();
    this.notificationService = notificationService ?? new NotificationService();
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

    return this.runPointsTransaction(async (manager) => {
      const wallet = await this.pointsRepository.getWalletForUpdate(userId, manager);
      const previousBalance = wallet.balance;
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

      this.afterPointsAwarded(userId, previousBalance, wallet.balance);

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

    return this.runPointsTransaction(async (manager) => {
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

  private afterPointsAwarded(
    userId: string,
    previousBalance: number,
    newBalance: number
  ): void {
    emitPointsUpdated(userId, { balance: newBalance });

    if (
      previousBalance < POINTS_MILESTONE_BALANCE &&
      newBalance >= POINTS_MILESTONE_BALANCE
    ) {
      this.notificationService
        .notifyPointsMilestone(userId, newBalance)
        .catch(console.error);
    }
  }

  private async runPointsTransaction<T>(
    operation: (manager: EntityManager) => Promise<T>,
    maxAttempts = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await AppDataSource.transaction(operation);
      } catch (error) {
        if (isDeadlock(error) && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to complete points transaction");
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
