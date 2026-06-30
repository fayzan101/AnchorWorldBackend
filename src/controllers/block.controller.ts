import { Response, NextFunction } from "express";
import { BlockService } from "../services/block.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";

export class BlockController {
  private blockService: BlockService;

  constructor(blockService?: BlockService) {
    this.blockService = blockService ?? new BlockService();
  }

  blockUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const blockerId = req.user!.id;
      const { id } = req.params;
      const result = await this.blockService.blockUser(blockerId, id);
      ResponseUtil.created(res, result, "User blocked successfully");
    } catch (error) {
      next(error);
    }
  };

  unblockUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const blockerId = req.user!.id;
      const { id } = req.params;
      const result = await this.blockService.unblockUser(blockerId, id);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  listBlocked = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.blockService.listBlockedUsers(userId, page, limit);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
