import { Router } from "express";
import { HobbyController } from "../controllers/hobby.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const hobbyController = new HobbyController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/hobbies
 * @desc    Get All hobbies
 * @access  Private
 */
router.get("/", hobbyController.getAll);

export default router;
