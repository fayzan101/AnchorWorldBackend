import { Response, NextFunction } from "express";
import { PostService } from "../services/post.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";
import { FeedFilter } from "../types/post.types";
import { PostMediaType } from "../entities/Post.entity";
import { getPostMediaPath } from "../middleware/post-upload.middleware";

export class PostController {
  private postService: PostService;

  constructor(postService?: PostService) {
    this.postService = postService ?? new PostService();
  }

  getFeed = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const filter = (req.query.filter as FeedFilter) || "circles";
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const circleId = req.query.circle_id as string | undefined;

      const result = await this.postService.getFeed(
        userId,
        filter,
        page,
        limit,
        circleId
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPostById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const post = await this.postService.getPostById(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, post);
    } catch (error) {
      next(error);
    }
  };

  createPost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let media: { url: string; type: PostMediaType } | undefined;

      if (req.file) {
        const isVideo = req.file.mimetype.startsWith("video/");
        media = {
          url: getPostMediaPath(req.file.filename),
          type: isVideo ? PostMediaType.VIDEO : PostMediaType.IMAGE,
        };
      }

      const post = await this.postService.createPost(
        req.user!.id,
        {
          content: req.body.content,
          circle_id: req.body.circle_id || undefined,
        },
        media
      );

      ResponseUtil.created(res, post, "Post created successfully");
    } catch (error) {
      next(error);
    }
  };

  deletePost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.deletePost(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  likePost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.likePost(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  unlikePost = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.unlikePost(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getComments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.postService.getComments(
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

  createComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const comment = await this.postService.createComment(
        req.params.id,
        req.user!.id,
        { content: req.body.content, parent_id: req.body.parent_id }
      );
      ResponseUtil.created(res, comment, "Comment created successfully");
    } catch (error) {
      next(error);
    }
  };

  likeComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.likeComment(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  unlikeComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.unlikeComment(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  deleteComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.postService.deleteComment(
        req.params.id,
        req.user!.id
      );
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getUserPosts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await this.postService.getUserPosts(
        req.params.userId,
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
