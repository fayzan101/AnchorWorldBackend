import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { body } from "express-validator";

const router = Router();
const postController = new PostController();
const moderationController = new ModerationController();

router.use(authenticateToken);

router.post("/:id/report",
  [
    body("reason")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("reason must be at most 500 characters"),
  ],
  validate,
  moderationController.reportComment
);

router.post("/:id/like", postController.likeComment);
router.delete("/:id/like", postController.unlikeComment);

router.delete("/:id", postController.deleteComment);

export default router;
