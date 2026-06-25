import { Router } from "express";
import { LikeController } from "../controllers/like.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const likeController = new LikeController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/likes/:userId
 * @desc    Like a user
 * @access  Private
 */
router.post("/:userId", likeController.likeUser);

/**
 * @route   DELETE /api/likes/:userId
 * @desc    Unlike a user
 * @access  Private
 */
router.delete("/:userId", likeController.unlikeUser);

/**
 * @route   GET /api/likes/my-likes
 * @desc    Get current user's received likes (who liked me)
 * @access  Private
 */
router.get('/my-likes', likeController.getMyLikes);

/**
 * @route   GET /api/likes/liked-by-me
 * @desc    Get users that I liked
 * @access  Private
 */
router.get('/liked-by-me', likeController.getLikedByMe);

/**
 * @route   GET /api/likes/:userId/list
 * @desc    Get likes for a specific user
 * @access  Private
 */
router.get("/:userId/list", likeController.getUserLikes);

/**
 * @route   GET /api/likes/:userId/count
 * @desc    Get likes count for a user
 * @access  Private
 */
router.get("/:userId/count", likeController.getLikesCount);

export default router;
