import { Request, Response, NextFunction } from "express";
import { HobbyService } from "../services/hobby.service";
import { ResponseUtil } from "../utils/response.util";

export class HobbyController {
  private hobbyService: HobbyService;

  constructor() {
    this.hobbyService = new HobbyService();
  }

  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const hobbies = await this.hobbyService.getAll();
      ResponseUtil.success(res, hobbies);
    } catch (error) {
      next(error);
    }
  };
}
