import { Response, NextFunction } from "express";
import { CircleService } from "../services/circle.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

export class CircleController {
  private circleService: CircleService;

  constructor(circleService?: CircleService) {
    this.circleService = circleService ?? new CircleService();
  }

  listCircles = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const circles = await this.circleService.listCircles(req.user!.id);
      ResponseUtil.success(res, circles);
    } catch (error) {
      next(error);
    }
  };

  getFeatured = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const circles = await this.circleService.getFeaturedCircles(req.user!.id);
      ResponseUtil.success(res, circles);
    } catch (error) {
      next(error);
    }
  };

  getCircleById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const circle = await this.circleService.getCircleById(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, circle);
    } catch (error) {
      next(error);
    }
  };

  joinCircle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.circleService.joinCircle(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.created(res, result, "Joined circle successfully");
    } catch (error) {
      next(error);
    }
  };

  leaveCircle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.circleService.leaveCircle(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMembers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.circleService.getCircleMembers(
        req.params.id,
        page,
        limit
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPosts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.circleService.getCirclePosts(
        req.params.id,
        req.user!.id,
        page,
        limit
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
