import { AppDataSource } from "../config/database";
import { UserPoints } from "../entities/UserPoints.entity";
import { PointTransaction } from "../entities/PointTransaction.entity";
import { EntityManager } from "typeorm";

function isDuplicateEntry(error: unknown): boolean {
  const err = error as { code?: string; errno?: number };
  return err.code === "ER_DUP_ENTRY" || err.errno === 1062;
}

export class PointsRepository {
  private walletRepo = () => AppDataSource.getRepository(UserPoints);
  private txRepo = () => AppDataSource.getRepository(PointTransaction);

  async findWallet(userId: string, manager?: EntityManager): Promise<UserPoints | null> {
    const repo = manager ? manager.getRepository(UserPoints) : this.walletRepo();
    return repo.findOne({ where: { user_id: userId } });
  }

  async getOrCreateWallet(userId: string, manager?: EntityManager): Promise<UserPoints> {
    const repo = manager ? manager.getRepository(UserPoints) : this.walletRepo();
    const existing = await repo.findOne({ where: { user_id: userId } });
    if (existing) {
      return existing;
    }

    try {
      const wallet = repo.create({ user_id: userId, balance: 0, lifetime_earned: 0 });
      return await repo.save(wallet);
    } catch (error) {
      if (!isDuplicateEntry(error)) {
        throw error;
      }
      const wallet = await repo.findOne({ where: { user_id: userId } });
      if (!wallet) {
        throw error;
      }
      return wallet;
    }
  }

  async getWalletForUpdate(userId: string, manager: EntityManager): Promise<UserPoints> {
    const repo = manager.getRepository(UserPoints);
    let wallet = await repo
      .createQueryBuilder("wallet")
      .setLock("pessimistic_write")
      .where("wallet.user_id = :userId", { userId })
      .getOne();

    if (wallet) {
      return wallet;
    }

    try {
      const created = repo.create({ user_id: userId, balance: 0, lifetime_earned: 0 });
      await repo.save(created);
    } catch (error) {
      if (!isDuplicateEntry(error)) {
        throw error;
      }
    }

    wallet = await repo
      .createQueryBuilder("wallet")
      .setLock("pessimistic_write")
      .where("wallet.user_id = :userId", { userId })
      .getOne();

    if (!wallet) {
      throw new Error(`Failed to get or create wallet for user ${userId}`);
    }

    return wallet;
  }

  async saveWallet(wallet: UserPoints, manager?: EntityManager): Promise<UserPoints> {
    const repo = manager ? manager.getRepository(UserPoints) : this.walletRepo();
    return repo.save(wallet);
  }

  async createTransaction(
    data: Partial<PointTransaction>,
    manager?: EntityManager
  ): Promise<PointTransaction> {
    const repo = manager ? manager.getRepository(PointTransaction) : this.txRepo();
    const tx = repo.create(data);
    return repo.save(tx);
  }

  async countEarnedToday(userId: string, type: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.txRepo()
      .createQueryBuilder("tx")
      .select("COALESCE(SUM(tx.amount), 0)", "total")
      .where("tx.user_id = :userId", { userId })
      .andWhere("tx.type = :type", { type })
      .andWhere("tx.amount > 0")
      .andWhere("tx.created_at >= :startOfDay", { startOfDay })
      .getRawOne();

    return parseInt(result?.total ?? "0", 10);
  }

  async countTransactionsToday(userId: string, type: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.txRepo()
      .createQueryBuilder("tx")
      .where("tx.user_id = :userId", { userId })
      .andWhere("tx.type = :type", { type })
      .andWhere("tx.amount > 0")
      .andWhere("tx.created_at >= :startOfDay", { startOfDay })
      .getCount();
  }

  async hasEverEarned(userId: string, type: string): Promise<boolean> {
    const count = await this.txRepo().count({
      where: { user_id: userId, type },
    });
    return count > 0;
  }

  async hasEarnedWithReference(
    userId: string,
    type: string,
    referenceId: string
  ): Promise<boolean> {
    const count = await this.txRepo().count({
      where: { user_id: userId, type, reference_id: referenceId },
    });
    return count > 0;
  }

  async hasEarnedToday(userId: string, type: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.txRepo()
      .createQueryBuilder("tx")
      .where("tx.user_id = :userId", { userId })
      .andWhere("tx.type = :type", { type })
      .andWhere("tx.amount > 0")
      .andWhere("tx.created_at >= :startOfDay", { startOfDay })
      .getCount();

    return count > 0;
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: PointTransaction[]; total: number }> {
    const [items, total] = await this.txRepo().findAndCount({
      where: { user_id: userId },
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
