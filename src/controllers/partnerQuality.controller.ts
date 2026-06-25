import { Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";
import { PartnerQualityService } from "../services/partnerQuality.service";

export class PartnerQualityController {
  private partnerQualityService: PartnerQualityService;

  constructor() {
    this.partnerQualityService = new PartnerQualityService();
  }

  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const partnerQualities = await this.partnerQualityService.getAll();
      ResponseUtil.success(res, partnerQualities);
    } catch (error) {
      next(error);
    }
  };
}
