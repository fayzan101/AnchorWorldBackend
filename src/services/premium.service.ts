import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "./points.service";
import { RevenueCatService } from "./revenuecat.service";
import { AppError } from "../middleware/error.middleware";
import { User } from "../entities/User.entity";

export type PremiumDiscountTier = {
  min_points: number;
  discount_percent: number;
  label: string;
  product_id: string;
};

export const PREMIUM_BASE_PRICE_USD = 9.99;

/** Points unlock subscription discounts via separate store product SKUs. */
export const PREMIUM_DISCOUNT_TIERS: PremiumDiscountTier[] = [
  { min_points: 0, discount_percent: 0, label: "Starter", product_id: "premium_monthly" },
  { min_points: 500, discount_percent: 10, label: "Member", product_id: "premium_monthly_10" },
  { min_points: 1000, discount_percent: 20, label: "Active", product_id: "premium_monthly_20" },
  { min_points: 2000, discount_percent: 30, label: "Champion", product_id: "premium_monthly_30" },
];

export class PremiumService {
  private userRepository: UserRepository;
  private pointsService: PointsService;
  private revenueCatService: RevenueCatService;

  constructor(
    userRepository?: UserRepository,
    pointsService?: PointsService,
    revenueCatService?: RevenueCatService
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.revenueCatService = revenueCatService ?? new RevenueCatService();
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

  static productIdForPoints(points: number): string {
    return PremiumService.discountForPoints(points).product_id;
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
      premium_product_id: user.premium_product_id ?? null,
      points_balance: balance,
      base_price_usd: PREMIUM_BASE_PRICE_USD,
      discount_percent: tier.discount_percent,
      discount_label: tier.label,
      discounted_price_usd: discountedPrice,
      savings_usd: Math.round((PREMIUM_BASE_PRICE_USD - discountedPrice) * 100) / 100,
      recommended_product_id: tier.product_id,
      offering_id: "default",
      tiers: PREMIUM_DISCOUNT_TIERS.map((t) => ({
        min_points: t.min_points,
        discount_percent: t.discount_percent,
        label: t.label,
        product_id: t.product_id,
        price_usd: PremiumService.priceAfterDiscount(PREMIUM_BASE_PRICE_USD, t.discount_percent),
        unlocked: balance >= t.min_points,
        current: t.min_points === tier.min_points,
      })),
      next_tier: nextTier
        ? {
            min_points: nextTier.min_points,
            discount_percent: nextTier.discount_percent,
            label: nextTier.label,
            product_id: nextTier.product_id,
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
   * @deprecated Free subscribe removed — use confirmPurchase / webhook.
   */
  async subscribe(_userId: string) {
    throw new AppError(
      "Use in-app purchase. Call POST /premium/confirm after a successful store purchase.",
      400
    );
  }

  async applyEntitlement(
    userId: string,
    opts: { active: boolean; expiresAt: Date | null; productId: string | null }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    await this.userRepository.update(userId, {
      is_premium: opts.active,
      premium_until: opts.active ? opts.expiresAt : null,
      premium_product_id: opts.active ? opts.productId : null,
    } as Partial<User>);

    return this.getStatus(userId);
  }

  async confirmPurchase(userId: string) {
    const subscriber = await this.revenueCatService.getSubscriber(userId);
    const premium = this.revenueCatService.extractPremium(subscriber);

    if (!premium.active) {
      throw new AppError("No active Premium entitlement found", 402);
    }

    return this.applyEntitlement(userId, {
      active: true,
      expiresAt: premium.expiresAt,
      productId: premium.productId,
    });
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const event = (payload.event as Record<string, unknown>) ?? payload;
    const appUserId = String(
      event.app_user_id ?? event.appUserId ?? payload.app_user_id ?? ""
    ).trim();

    if (!appUserId) {
      throw new AppError("Missing app_user_id in webhook", 400);
    }

    // Anonymous / RC-generated ids that aren't Anchor UUIDs — try lookup anyway.
    const user = await this.userRepository.findById(appUserId);
    if (!user) {
      return { ignored: true, reason: "user_not_found" };
    }

    const type = String(event.type ?? "").toUpperCase();
    const expirationAtMs = event.expiration_at_ms
      ? Number(event.expiration_at_ms)
      : null;
    const expiresAt =
      expirationAtMs && !Number.isNaN(expirationAtMs)
        ? new Date(expirationAtMs)
        : null;
    const productId = event.product_id
      ? String(event.product_id)
      : event.product_identifier
        ? String(event.product_identifier)
        : null;

    const cancelTypes = new Set([
      "EXPIRATION",
      "CANCELLATION",
      "SUBSCRIPTION_PAUSED",
    ]);

    if (cancelTypes.has(type)) {
      const stillActive = expiresAt ? expiresAt.getTime() > Date.now() : false;
      await this.applyEntitlement(user.id, {
        active: stillActive,
        expiresAt: stillActive ? expiresAt : null,
        productId: stillActive ? productId : null,
      });
      return { ignored: false, active: stillActive };
    }

    // Prefer live RC lookup when configured; otherwise trust webhook fields.
    if (this.revenueCatService.configured) {
      try {
        const subscriber = await this.revenueCatService.getSubscriber(user.id);
        const premium = this.revenueCatService.extractPremium(subscriber);
        await this.applyEntitlement(user.id, {
          active: premium.active,
          expiresAt: premium.expiresAt,
          productId: premium.productId,
        });
        return { ignored: false, active: premium.active };
      } catch {
        // Fall through to webhook payload.
      }
    }

    const active = !expiresAt || expiresAt.getTime() > Date.now();
    await this.applyEntitlement(user.id, {
      active,
      expiresAt: active ? expiresAt : null,
      productId: active ? productId : null,
    });
    return { ignored: false, active };
  }
}
