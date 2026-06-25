import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ValidationUtil } from '../utils/validation.util';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', userController.getProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/',
  ValidationUtil.updateProfile(),
  validate,
  userController.updateProfile
);

/**
 * @route   POST /api/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post(
  '/picture',
  upload.single('profile_picture'),
  userController.uploadProfilePicture
);

export default router;