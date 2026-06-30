import { PointsService } from "../services/points.service";
import { NotificationService } from "../services/notification.service";
import { PointsRepository } from "../repositories/points.repository";
import { UserPoints } from "../entities/UserPoints.entity";
import { AppError } from "../middleware/error.middleware";
import { emitPointsUpdated } from "../services/socket-event.service";

jest.mock("../services/socket-event.service", () => ({
  emitPointsUpdated: jest.fn(),
}));

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
  let notificationService: jest.Mocked<NotificationService>;
  let service: PointsService;

  beforeEach(() => {
    jest.clearAllMocks();

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

    notificationService = {
      notifyPointsMilestone: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<NotificationService>;

    service = new PointsService(pointsRepository, notificationService);
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

  it("emits points_updated and milestone notification when crossing 500", async () => {
    pointsRepository.getWalletForUpdate.mockResolvedValue({
      user_id: userId,
      balance: 490,
      lifetime_earned: 490,
    } as UserPoints);
    pointsRepository.saveWallet.mockResolvedValue({} as UserPoints);
    pointsRepository.createTransaction.mockResolvedValue({} as never);

    const result = await service.awardPoints(userId, 20, "post_created");

    expect(result.balance).toBe(510);
    expect(emitPointsUpdated).toHaveBeenCalledWith(userId, { balance: 510 });
    expect(notificationService.notifyPointsMilestone).toHaveBeenCalledWith(
      userId,
      510
    );
  });
});
