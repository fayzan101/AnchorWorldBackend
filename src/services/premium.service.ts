import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "./points.service";
import { RevenueCatService } from "./revenuecat.service";
import { AppError } from "../middleware/error.middleware";
import { User } from "../entities/User.entity";
import {
  CHAT_UNLOCK_COST,
  FREE_CHAT_UNLOCK_MAX,
} from "../constants/point-types";
import { ChatUnlockRepository } from "../repositories/chat-unlock.repository";

export type PremiumDiscountTier = {
  min_points: number;
  discount_percent: number;
  label: string;
  product_id: string;
};

export type PlanTier = "free" | "basic" | "premium";

export const PREMIUM_BASE_PRICE_USD = 9.99;
export const BASIC_BASE_PRICE_USD = 4.99;
export const BASIC_PRODUCT_ID = "basic_monthly";

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
  private chatUnlockRepository: ChatUnlockRepository;

  constructor(
    userRepository?: UserRepository,
    pointsService?: PointsService,
    revenueCatService?: RevenueCatService,
    chatUnlockRepository?: ChatUnlockRepository
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.revenueCatService = revenueCatService ?? new RevenueCatService();
    this.chatUnlockRepository =
      chatUnlockRepository ?? new ChatUnlockRepository();
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

  isBasicActive(user: User): boolean {
    if (this.isPremiumActive(user)) return true;
    if (!user.is_basic) return false;
    if (!user.basic_until) return true;
    return new Date(user.basic_until) > new Date();
  }

  effectivePlan(user: User): PlanTier {
    if (this.isPremiumActive(user)) return "premium";
    if (this.isBasicActive(user)) return "basic";
    return "free";
  }

  async ensurePremiumActive(userId: string): Promise<User> {
    return this.ensurePlansActive(userId);
  }

  async ensurePlansActive(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const updates: Partial<User> = {};
    if (
      user.is_premium &&
      user.premium_until &&
      new Date(user.premium_until) <= new Date()
    ) {
      user.is_premium = false;
      updates.is_premium = false;
    }
    if (
      user.is_basic &&
      user.basic_until &&
      new Date(user.basic_until) <= new Date()
    ) {
      user.is_basic = false;
      updates.is_basic = false;
    }
    if (Object.keys(updates).length > 0) {
      await this.userRepository.update(userId, updates);
    }

    return user;
  }

  async getStatus(userId: string) {
    const user = await this.ensurePlansActive(userId);
    const { balance } = await this.pointsService.getBalance(userId);
    const tier = PremiumService.discountForPoints(balance);
    const discountedPrice = PremiumService.priceAfterDiscount(
      PREMIUM_BASE_PRICE_USD,
      tier.discount_percent
    );
    const nextTier = PREMIUM_DISCOUNT_TIERS.find((t) => t.min_points > balance) ?? null;
    const isPremium = this.isPremiumActive(user);
    const isBasic = this.isBasicActive(user);
    const plan = this.effectivePlan(user);
    const chatSlotsUsed = await this.chatUnlockRepository.countUnlockedBy(userId);
    const hasUnlimitedChat = plan !== "free";

    return {
      plan,
      is_basic: isBasic,
      basic_until: user.basic_until,
      basic_product_id: user.basic_product_id ?? null,
      is_premium: isPremium,
      premium_until: user.premium_until,
      premium_product_id: user.premium_product_id ?? null,
      can_voice: isBasic,
      can_video: isPremium,
      has_unlimited_chat: hasUnlimitedChat,
      chat_slots_used: chatSlotsUsed,
      chat_slots_max: hasUnlimitedChat ? null : FREE_CHAT_UNLOCK_MAX,
      chat_unlock_cost: CHAT_UNLOCK_COST,
      points_balance: balance,
      basic_price_usd: BASIC_BASE_PRICE_USD,
      recommended_basic_product_id: BASIC_PRODUCT_ID,
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
      benefits: isPremium
        ? [
            "Voice and video intros with connections",
            "Unlimited chat with connections",
            "Points-based Premium discounts",
          ]
        : isBasic
          ? [
              "Voice intros with connections",
              "Unlimited chat with connections",
              "Upgrade to Premium for video intros",
            ]
          : [
              `Unlock chat with ${CHAT_UNLOCK_COST} points (max 2 partners)`,
              "Basic: unlimited chat + voice calls",
              "Premium: adds guided video intros",
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

  async applyPremiumEntitlement(
    userId: string,
    opts: { active: boolean; expiresAt: Date | null; productId: string | null }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    await this.userRepository.update(userId, {
      is_premium: opts.active,
      premium_until: opts.active ? opts.expiresAt : null,
      premium_product_id: opts.active ? opts.productId : null,
      // Premium includes Basic.
      ...(opts.active
        ? {
            is_basic: true,
            basic_until: opts.expiresAt,
          }
        : {}),
    } as Partial<User>);

    return this.getStatus(userId);
  }

  /** @deprecated Prefer applyPremiumEntitlement / applyBasicEntitlement */
  async applyEntitlement(
    userId: string,
    opts: { active: boolean; expiresAt: Date | null; productId: string | null }
  ) {
    return this.applyPremiumEntitlement(userId, opts);
  }

  async applyBasicEntitlement(
    userId: string,
    opts: { active: boolean; expiresAt: Date | null; productId: string | null }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    // Do not strip Basic if Premium is still active.
    if (!opts.active && this.isPremiumActive(user)) {
      return this.getStatus(userId);
    }

    await this.userRepository.update(userId, {
      is_basic: opts.active,
      basic_until: opts.active ? opts.expiresAt : null,
      basic_product_id: opts.active ? opts.productId : null,
    } as Partial<User>);

    return this.getStatus(userId);
  }

  async syncFromRevenueCat(userId: string) {
    const subscriber = await this.revenueCatService.getSubscriber(userId);
    const { premium, basic } = this.revenueCatService.extractPlans(subscriber);

    await this.userRepository.update(userId, {
      is_premium: premium.active,
      premium_until: premium.active ? premium.expiresAt : null,
      premium_product_id: premium.active ? premium.productId : null,
      is_basic: basic.active,
      basic_until: basic.active ? basic.expiresAt : null,
      basic_product_id: basic.active && !premium.active ? basic.productId : null,
    } as Partial<User>);

    return this.getStatus(userId);
  }

  async confirmPurchase(userId: string) {
    const subscriber = await this.revenueCatService.getSubscriber(userId);
    const { premium, basic } = this.revenueCatService.extractPlans(subscriber);

    if (!premium.active && !basic.active) {
      throw new AppError("No active Basic or Premium entitlement found", 402);
    }

    return this.syncFromRevenueCat(userId);
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const event = (payload.event as Record<string, unknown>) ?? payload;
    const appUserId = String(
      event.app_user_id ?? event.appUserId ?? payload.app_user_id ?? ""
    ).trim();

    if (!appUserId) {
      throw new AppError("Missing app_user_id in webhook", 400);
    }

    const user = await this.userRepository.findById(appUserId);
    if (!user) {
      return { ignored: true, reason: "user_not_found" };
    }

    if (this.revenueCatService.configured) {
      try {
        await this.syncFromRevenueCat(user.id);
        const refreshed = await this.ensurePlansActive(user.id);
        return {
          ignored: false,
          plan: this.effectivePlan(refreshed),
          active: this.isBasicActive(refreshed) || this.isPremiumActive(refreshed),
        };
      } catch {
        // Fall through to webhook payload.
      }
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

    const entitlementIds = [
      String(event.entitlement_id ?? ""),
      ...(Array.isArray(event.entitlement_ids)
        ? event.entitlement_ids.map(String)
        : []),
    ]
      .map((s) => s.toLowerCase())
      .filter(Boolean);

    const isBasicEvent =
      entitlementIds.includes("basic") ||
      (productId ?? "").toLowerCase().includes("basic");
    const isPremiumEvent =
      entitlementIds.includes("premium") ||
      (productId ?? "").toLowerCase().includes("premium") ||
      !isBasicEvent;

    const cancelTypes = new Set([
      "EXPIRATION",
      "CANCELLATION",
      "SUBSCRIPTION_PAUSED",
    ]);

    const stillActive = expiresAt ? expiresAt.getTime() > Date.now() : !cancelTypes.has(type);
    const active = cancelTypes.has(type)
      ? stillActive && Boolean(expiresAt && expiresAt.getTime() > Date.now())
      : !expiresAt || expiresAt.getTime() > Date.now();

    if (isPremiumEvent) {
      await this.applyPremiumEntitlement(user.id, {
        active,
        expiresAt: active ? expiresAt : null,
        productId: active ? productId : null,
      });
    } else {
      await this.applyBasicEntitlement(user.id, {
        active,
        expiresAt: active ? expiresAt : null,
        productId: active ? productId : null,
      });
    }

    return { ignored: false, active };
  }
}
