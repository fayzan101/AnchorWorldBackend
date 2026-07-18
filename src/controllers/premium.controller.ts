import { Response, NextFunction, Request } from "express";
import { PremiumService } from "../services/premium.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";
import { config } from "../config/environment";
import { AppError } from "../middleware/error.middleware";

export class PremiumController {
  private premiumService: PremiumService;

  constructor() {
    this.premiumService = new PremiumService();
  }

  getStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = await this.premiumService.getStatus(req.user!.id);
      ResponseUtil.success(res, status);
    } catch (error) {
      next(error);
    }
  };

  /** @deprecated Free subscribe removed — use confirm after IAP. */
  subscribe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.premiumService.subscribe(req.user!.id);
      ResponseUtil.success(res, null);
    } catch (error) {
      next(error);
    }
  };

  confirm = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = await this.premiumService.confirmPurchase(req.user!.id);
      ResponseUtil.success(res, status, "Premium confirmed");
    } catch (error) {
      next(error);
    }
  };

  webhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const secret = config.revenueCat.webhookSecret;
      if (secret) {
        const auth =
          req.header("Authorization") ||
          req.header("authorization") ||
          req.header("X-RevenueCat-Signature") ||
          "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (token !== secret) {
          throw new AppError("Invalid webhook secret", 401);
        }
      }

      const result = await this.premiumService.handleWebhookEvent(
        (req.body ?? {}) as Record<string, unknown>
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
