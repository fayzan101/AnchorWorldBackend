import { Router } from "express";
import { BlockController } from "../controllers/block.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const blockController = new BlockController();

router.use(authenticateToken);

router.get("/users/blocked", blockController.listBlocked);
router.post("/users/:id/block", blockController.blockUser);
router.delete("/users/:id/block", blockController.unblockUser);

export default router;
