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
      const blockedId = req.params.userId ?? req.params.id;
      const result = await this.blockService.blockUser(blockerId, blockedId);
      ResponseUtil.created(res, result, "User blocked");
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
      const blockedId = req.params.userId ?? req.params.id;
      const result = await this.blockService.unblockUser(blockerId, blockedId);
      ResponseUtil.success(res, result, "User unblocked");
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
      const blockerId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;
      const result = await this.blockService.listBlocked(
        blockerId,
        page,
        limit
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
