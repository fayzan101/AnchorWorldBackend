import { Response, NextFunction } from "express";
import { ModerationService } from "../services/moderation.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";
import { ReportStatus } from "../entities/ContentReport.entity";

export class ModerationController {
  private moderationService: ModerationService;

  constructor(moderationService?: ModerationService) {
    this.moderationService = moderationService ?? new ModerationService();
  }

  reportPost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const reporterId = req.user!.id;
      const { id } = req.params;
      const reason = req.body?.reason as string | undefined;
      const report = await this.moderationService.reportPost(
        reporterId,
        id,
        reason
      );
      ResponseUtil.created(res, report, "Post reported successfully");
    } catch (error) {
      next(error);
    }
  };

  reportComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const reporterId = req.user!.id;
      const { id } = req.params;
      const reason = req.body?.reason as string | undefined;
      const report = await this.moderationService.reportComment(
        reporterId,
        id,
        reason
      );
      ResponseUtil.created(res, report, "Comment reported successfully");
    } catch (error) {
      next(error);
    }
  };

  listReports = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status =
        (req.query.status as ReportStatus) || ReportStatus.OPEN;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.moderationService.listReports(status, page, limit);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  takeAction = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { action, notes } = req.body as {
        action: "hide_content" | "dismiss" | "warn_user";
        notes?: string;
      };
      const result = await this.moderationService.takeAction(
        id,
        adminId,
        action,
        notes
      );
      ResponseUtil.success(res, result, "Moderation action recorded");
    } catch (error) {
      next(error);
    }
  };
}
