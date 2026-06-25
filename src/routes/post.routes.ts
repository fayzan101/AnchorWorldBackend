import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { ValidationUtil } from "../utils/validation.util";
import { validate } from "../middleware/validation.middleware";
import { postUpload } from "../middleware/post-upload.middleware";

const router = Router();
const postController = new PostController();

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
router.get("/:id", postController.getPostById);
router.delete("/:id", postController.deletePost);

export default router;
