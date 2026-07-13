import { Response, NextFunction } from 'express';
import { LikeService } from '../services/like.service';
import { ResponseUtil } from '../utils/response.util';
import { AuthRequest } from '../types';

export class LikeController {
  private likeService: LikeService;

  constructor() {
    this.likeService = new LikeService();
  }

  likeUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const likerId = req.user!.id;
      const { userId } = req.params;
      
      const like = await this.likeService.likeUser(likerId, userId);
      ResponseUtil.created(res, like, 'User liked successfully');
    } catch (error) {
      next(error);
    }
  };

  unlikeUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const likerId = req.user!.id;
      const { userId } = req.params;
      
      const result = await this.likeService.unlikeUser(likerId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getUserLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const likes = await this.likeService.getUserLikes(userId);
      ResponseUtil.success(res, { likes, total: likes.length });
    } catch (error) {
      next(error);
    }
  };

  getMyLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const likes = await this.likeService.getUserLikes(userId);
      ResponseUtil.success(res, { likes, total: likes.length });
    } catch (error) {
      next(error);
    }
  };

  getLikedByMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const likes = await this.likeService.getLikedByMe(userId);
      ResponseUtil.success(res, { likes, total: likes.length });
    } catch (error) {
      next(error);
    }
  };

  getLikesCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const count = await this.likeService.getLikesCount(userId);
      ResponseUtil.success(res, { total_likes: count });
    } catch (error) {
      next(error);
    }
  };
}