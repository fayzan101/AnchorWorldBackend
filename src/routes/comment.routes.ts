import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const postController = new PostController();
const moderationController = new ModerationController();

router.use(authenticateToken);
router.post("/:id/report", moderationController.reportComment);
router.delete("/:id", postController.deleteComment);

export default router;
