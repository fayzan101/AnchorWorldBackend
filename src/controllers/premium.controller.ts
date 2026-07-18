import { Response, NextFunction } from "express";
import { PremiumService } from "../services/premium.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

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

  subscribe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = await this.premiumService.subscribe(req.user!.id);
      ResponseUtil.success(res, status, "Premium activated");
    } catch (error) {
      next(error);
    }
  };
}
