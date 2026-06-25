import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const postController = new PostController();

router.use(authenticateToken);
router.delete("/:id", postController.deleteComment);

export default router;
