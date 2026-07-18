import { Response, NextFunction } from "express";
import { ReferralService } from "../services/referral.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

export class ReferralController {
  private referralService: ReferralService;

  constructor() {
    this.referralService = new ReferralService();
  }

  getMine = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await this.referralService.getMine(req.user!.id);
      ResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  apply = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const code = (req.body?.code ?? req.body?.referral_code ?? "").toString();
      const result = await this.referralService.applyCode(req.user!.id, code);
      ResponseUtil.success(res, result, "Referral applied");
    } catch (error) {
      next(error);
    }
  };
}
