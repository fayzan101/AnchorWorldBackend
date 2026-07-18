import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "./points.service";
import { AppError } from "../middleware/error.middleware";
import { User } from "../entities/User.entity";

export type PremiumDiscountTier = {
  min_points: number;
  discount_percent: number;
  label: string;
};

export const PREMIUM_BASE_PRICE_USD = 9.99;
export const PREMIUM_DURATION_DAYS = 30;

/** Points unlock subscription discounts — they are never spent on video intros. */
export const PREMIUM_DISCOUNT_TIERS: PremiumDiscountTier[] = [
  { min_points: 0, discount_percent: 0, label: "Starter" },
  { min_points: 500, discount_percent: 10, label: "Member" },
  { min_points: 1000, discount_percent: 20, label: "Active" },
  { min_points: 2000, discount_percent: 30, label: "Champion" },
];

export class PremiumService {
  private userRepository: UserRepository;
  private pointsService: PointsService;

  constructor(
    userRepository?: UserRepository,
    pointsService?: PointsService
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.pointsService = pointsService ?? new PointsService();
  }

  static discountForPoints(points: number): PremiumDiscountTier {
    let current = PREMIUM_DISCOUNT_TIERS[0];
    for (const tier of PREMIUM_DISCOUNT_TIERS) {
      if (points >= tier.min_points) current = tier;
    }
    return current;
  }

  static priceAfterDiscount(base: number, discountPercent: number): number {
    const priced = base * (1 - discountPercent / 100);
    return Math.round(priced * 100) / 100;
  }

  isPremiumActive(user: User): boolean {
    if (!user.is_premium) return false;
    if (!user.premium_until) return true;
    return new Date(user.premium_until) > new Date();
  }

  async ensurePremiumActive(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.is_premium && user.premium_until && new Date(user.premium_until) <= new Date()) {
      user.is_premium = false;
      await this.userRepository.update(userId, {
        is_premium: false,
      } as Partial<User>);
    }

    return user;
  }

  async getStatus(userId: string) {
    const user = await this.ensurePremiumActive(userId);
    const { balance } = await this.pointsService.getBalance(userId);
    const tier = PremiumService.discountForPoints(balance);
    const discountedPrice = PremiumService.priceAfterDiscount(
      PREMIUM_BASE_PRICE_USD,
      tier.discount_percent
    );
    const nextTier = PREMIUM_DISCOUNT_TIERS.find((t) => t.min_points > balance) ?? null;
    const isPremium = this.isPremiumActive(user);

    return {
      is_premium: isPremium,
      premium_until: user.premium_until,
      points_balance: balance,
      base_price_usd: PREMIUM_BASE_PRICE_USD,
      discount_percent: tier.discount_percent,
      discount_label: tier.label,
      discounted_price_usd: discountedPrice,
      savings_usd: Math.round((PREMIUM_BASE_PRICE_USD - discountedPrice) * 100) / 100,
      tiers: PREMIUM_DISCOUNT_TIERS.map((t) => ({
        ...t,
        price_usd: PremiumService.priceAfterDiscount(PREMIUM_BASE_PRICE_USD, t.discount_percent),
        unlocked: balance >= t.min_points,
        current: t.min_points === tier.min_points,
      })),
      next_tier: nextTier
        ? {
            ...nextTier,
            points_needed: Math.max(0, nextTier.min_points - balance),
            price_usd: PremiumService.priceAfterDiscount(
              PREMIUM_BASE_PRICE_USD,
              nextTier.discount_percent
            ),
          }
        : null,
      benefits: [
        "Unlimited guided video intros with connections",
        "Priority intro matching experience",
        "Points-based subscription discounts",
      ],
    };
  }

  /**
   * Activates Premium. Payment provider integration can replace this later;
   * points only affect the displayed discount — they are not deducted.
   */
  async subscribe(userId: string) {
    const user = await this.ensurePremiumActive(userId);
    if (this.isPremiumActive(user)) {
      return this.getStatus(userId);
    }

    const until = new Date();
    until.setDate(until.getDate() + PREMIUM_DURATION_DAYS);

    await this.userRepository.update(userId, {
      is_premium: true,
      premium_until: until,
    } as Partial<User>);

    return this.getStatus(userId);
  }
}
