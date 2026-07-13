import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { PostController } from '../controllers/post.controller';
import { BlockController } from '../controllers/block.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ValidationUtil } from '../utils/validation.util';
import { validate } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();
const userController = new UserController();
const postController = new PostController();
const blockController = new BlockController();

router.use(authenticateToken);

router.get(
  '/',
  ValidationUtil.userListQuery(),
  validate,
  userController.getAllUsers
);

router.get(
  '/blocked',
  ValidationUtil.pagination(),
  validate,
  blockController.listBlocked
);

router.get(
  '/:userId/posts',
  ValidationUtil.pagination(),
  validate,
  postController.getUserPosts
);

router.post('/:userId/block', blockController.blockUser);
router.delete('/:userId/block', blockController.unblockUser);

router.get('/:userId', userController.getUserById);

router.put(
  '/:userId',
  [
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('reason must be at most 500 characters'),
  ],
  validate,
  userController.markReportUserById
);

export default router;
