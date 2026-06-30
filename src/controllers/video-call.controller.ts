import { Response, NextFunction } from "express";
import { VideoCallService } from "../services/video-call.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";
import { VideoCallRequestDto } from "../types/video-call.types";

export class VideoCallController {
  private videoCallService: VideoCallService;

  constructor(videoCallService?: VideoCallService) {
    this.videoCallService = videoCallService ?? new VideoCallService();
  }

  requestIntro = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const callerId = req.user!.id;
      const call = await this.videoCallService.requestIntro(
        callerId,
        req.body as VideoCallRequestDto
      );
      ResponseUtil.created(res, call, "Video intro requested");
    } catch (error) {
      next(error);
    }
  };

  acceptIntro = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const call = await this.videoCallService.acceptIntro(id, userId);
      ResponseUtil.success(res, call, "Video intro accepted");
    } catch (error) {
      next(error);
    }
  };

  rejectIntro = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const call = await this.videoCallService.rejectIntro(id, userId);
      ResponseUtil.success(res, call, "Video intro rejected");
    } catch (error) {
      next(error);
    }
  };

  cancelIntro = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const call = await this.videoCallService.cancelIntro(id, userId);
      ResponseUtil.success(res, call, "Video intro cancelled");
    } catch (error) {
      next(error);
    }
  };

  endIntro = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const call = await this.videoCallService.endIntro(id, userId);
      ResponseUtil.success(res, call, "Video intro ended");
    } catch (error) {
      next(error);
    }
  };

  getToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const token = await this.videoCallService.getToken(id, userId);
      ResponseUtil.success(res, token);
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const history = await this.videoCallService.getHistory(userId, page, limit);
      ResponseUtil.success(res, history);
    } catch (error) {
      next(error);
    }
  };
}
