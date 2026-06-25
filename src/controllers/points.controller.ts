import { Response, NextFunction } from "express";
import { PointsService } from "../services/points.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

export class PointsController {
  private pointsService: PointsService;

  constructor(pointsService?: PointsService) {
    this.pointsService = pointsService ?? new PointsService();
  }

  getBalance = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const balance = await this.pointsService.getBalance(userId);
      ResponseUtil.success(res, balance);
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.pointsService.getTransactions(userId, page, limit);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
