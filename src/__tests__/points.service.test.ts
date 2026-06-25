import { PointsService } from "../services/points.service";
import { PointsRepository } from "../repositories/points.repository";
import { UserPoints } from "../entities/UserPoints.entity";
import { AppError } from "../middleware/error.middleware";

jest.mock("../config/database", () => ({
  AppDataSource: {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<unknown>) =>
      cb({})
    ),
  },
}));

describe("PointsService", () => {
  const userId = "user-123";
  let pointsRepository: jest.Mocked<PointsRepository>;
  let service: PointsService;

  beforeEach(() => {
    pointsRepository = {
      getOrCreateWallet: jest.fn(),
      getWalletForUpdate: jest.fn(),
      saveWallet: jest.fn(),
      createTransaction: jest.fn(),
      hasEverEarned: jest.fn(),
      hasEarnedToday: jest.fn(),
      countEarnedToday: jest.fn(),
      getTransactions: jest.fn(),
      findWallet: jest.fn(),
    } as unknown as jest.Mocked<PointsRepository>;

    service = new PointsService(pointsRepository);
  });

  it("returns zero balance for new wallet", async () => {
    pointsRepository.getOrCreateWallet.mockResolvedValue({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
    } as UserPoints);

    const result = await service.getBalance(userId);
    expect(result).toEqual({ balance: 0, lifetime_earned: 0 });
  });

  it("skips daily login if already awarded today", async () => {
    pointsRepository.hasEarnedToday.mockResolvedValue(true);
    pointsRepository.getOrCreateWallet.mockResolvedValue({
      user_id: userId,
      balance: 10,
      lifetime_earned: 10,
    } as UserPoints);

    const result = await service.awardDailyLogin(userId);
    expect(result.skipped).toBe(true);
    expect(result.awarded).toBe(0);
  });

  it("throws 402 when spending more than balance", async () => {
    pointsRepository.getWalletForUpdate.mockResolvedValue({
      user_id: userId,
      balance: 100,
      lifetime_earned: 100,
    } as UserPoints);

    await expect(
      service.spendPoints(userId, 500, "video_intro_spent")
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.spendPoints(userId, 500, "video_intro_spent")
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it("awards points once for profile complete", async () => {
    pointsRepository.hasEverEarned.mockResolvedValue(true);
    pointsRepository.getOrCreateWallet.mockResolvedValue({
      user_id: userId,
      balance: 100,
      lifetime_earned: 100,
    } as UserPoints);

    const result = await service.awardPointsOnce(
      userId,
      100,
      "profile_complete"
    );

    expect(result.skipped).toBe(true);
    expect(pointsRepository.getWalletForUpdate).not.toHaveBeenCalled();
  });
});
