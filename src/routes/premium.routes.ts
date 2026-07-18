import { Router } from "express";
import { PremiumController } from "../controllers/premium.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const premiumController = new PremiumController();

router.use(authenticateToken);

/**
 * @route   GET /api/premium/status
 * @desc    Premium status + points-based subscription discount tiers
 */
router.get("/status", premiumController.getStatus);

/**
 * @route   POST /api/premium/subscribe
 * @desc    Activate Premium (points discount display only — no points spent)
 */
router.post("/subscribe", premiumController.subscribe);

export default router;
