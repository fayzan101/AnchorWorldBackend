import { config } from "../config/environment";
import { AppError } from "../middleware/error.middleware";

export type RevenueCatEntitlement = {
  expires_date: string | null;
  purchase_date?: string | null;
  product_identifier?: string | null;
};

export type RevenueCatSubscriber = {
  subscriber: {
    entitlements: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, unknown>;
  };
};

export class RevenueCatService {
  private apiKey: string;
  private entitlementId: string;
  private baseUrl = "https://api.revenuecat.com/v1";

  constructor() {
    this.apiKey = config.revenueCat.apiKey;
    this.entitlementId = config.revenueCat.entitlementId;
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async getSubscriber(appUserId: string): Promise<RevenueCatSubscriber> {
    if (!this.apiKey) {
      throw new AppError("RevenueCat is not configured", 503);
    }

    const resp = await fetch(
      `${this.baseUrl}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (resp.status === 404) {
      throw new AppError("No RevenueCat subscriber found for this user", 404);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new AppError(
        `RevenueCat lookup failed (${resp.status}): ${text || resp.statusText}`,
        502
      );
    }

    return (await resp.json()) as RevenueCatSubscriber;
  }

  extractPremium(data: RevenueCatSubscriber): {
    active: boolean;
    expiresAt: Date | null;
    productId: string | null;
  } {
    const entitlement =
      data.subscriber?.entitlements?.[this.entitlementId] ?? null;

    if (!entitlement) {
      return { active: false, expiresAt: null, productId: null };
    }

    const expiresAt = entitlement.expires_date
      ? new Date(entitlement.expires_date)
      : null;
    const active = !expiresAt || expiresAt.getTime() > Date.now();

    return {
      active,
      expiresAt,
      productId: entitlement.product_identifier ?? null,
    };
  }
}
