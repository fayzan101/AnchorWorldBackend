import { Response, NextFunction } from "express";
import { DiscoverService } from "../services/discover.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

export class DiscoverController {
  private discoverService: DiscoverService;

  constructor(discoverService?: DiscoverService) {
    this.discoverService = discoverService ?? new DiscoverService();
  }

  getLocal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const data = await this.discoverService.getLocalDiscover(userId);
      ResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  };
}
