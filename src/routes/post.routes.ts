import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { ValidationUtil } from "../utils/validation.util";
import { validate } from "../middleware/validation.middleware";
import { postUpload } from "../middleware/post-upload.middleware";
import { body } from "express-validator";

const router = Router();
const postController = new PostController();
const moderationController = new ModerationController();

router.use(authenticateToken);

router.get(
  "/feed",
  ValidationUtil.feedQuery(),
  validate,
  postController.getFeed
);

router.post(
  "/",
  postUpload.single("media"),
  ValidationUtil.createPost(),
  validate,
  postController.createPost
);

router.get(
  "/:id/comments",
  ValidationUtil.pagination(),
  validate,
  postController.getComments
);

router.post(
  "/:id/comments",
  ValidationUtil.createComment(),
  validate,
  postController.createComment
);

router.post("/:id/like", postController.likePost);
router.delete("/:id/like", postController.unlikePost);

router.post(
  "/:id/report",
  [
    body("reason")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("reason must be at most 500 characters"),
  ],
  validate,
  moderationController.reportPost
);

router.get("/:id", postController.getPostById);
router.delete("/:id", postController.deletePost);

export default router;
