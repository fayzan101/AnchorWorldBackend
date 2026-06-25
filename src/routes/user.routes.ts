import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { PostController } from '../controllers/post.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ValidationUtil } from '../utils/validation.util';
import { validate } from '../middleware/validation.middleware';
// import { upload } from '../middleware/upload.middleware';

const router = Router();
const userController = new UserController();
const postController = new PostController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters)
 * @access  Private
 */
router.get(
  '/',
  ValidationUtil.userListQuery(),
  validate,
  userController.getAllUsers
);

/**
 * @route   GET /api/users/:userId/posts
 * @desc    Get posts by user
 * @access  Private
 */
router.get(
  '/:userId/posts',
  ValidationUtil.pagination(),
  validate,
  postController.getUserPosts
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:userId', userController.getUserById);

/**
 * @route   PUT /api/users/:userId
 * @desc    Mark a report spam user by ID
 * @access  Private
 */
router.put('/:userId', userController.markReportUserById);

export default router;