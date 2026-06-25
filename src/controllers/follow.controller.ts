import { Response, NextFunction } from 'express';
import { FollowService } from '../services/follow.service';
import { ResponseUtil } from '../utils/response.util';
import { AuthRequest } from '../types';

export class FollowController {
  private followService: FollowService;

  constructor() {
    this.followService = new FollowService();
  }

  sendFollowRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const followerId = req.user!.id;
      const { userId } = req.params;
      
      const follow = await this.followService.sendFollowRequest(followerId, userId);
      ResponseUtil.created(res, follow, 'Follow request sent successfully');
    } catch (error) {
      next(error);
    }
  };

  acceptFollowRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { followId } = req.params;
      
      const follow = await this.followService.acceptFollowRequest(followId, userId);
      ResponseUtil.success(res, follow, 'Follow request accepted');
    } catch (error) {
      next(error);
    }
  };

  removeFollow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { followId } = req.params;
      
      const result = await this.followService.removeFollow(followId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPendingRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const requests = await this.followService.getPendingRequests(userId);
      ResponseUtil.success(res, { requests });
    } catch (error) {
      next(error);
    }
  };

  getMatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const matches = await this.followService.getMatches(userId);
      ResponseUtil.success(res, { matches });
    } catch (error) {
      next(error);
    }
  };
}