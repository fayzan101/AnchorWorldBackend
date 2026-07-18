import { Router } from "express";
import { PremiumController } from "../controllers/premium.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const premiumController = new PremiumController();

/**
 * @route   POST /api/premium/webhook
 * @desc    RevenueCat server webhook (no user JWT)
 */
router.post("/webhook", premiumController.webhook);

router.use(authenticateToken);

/**
 * @route   GET /api/premium/status
 */
router.get("/status", premiumController.getStatus);

/**
 * @route   POST /api/premium/confirm
 * @desc    Confirm Premium after successful store purchase via RevenueCat
 */
router.post("/confirm", premiumController.confirm);

/**
 * @route   POST /api/premium/subscribe
 * @desc    Deprecated — returns 400 directing clients to IAP confirm
 */
router.post("/subscribe", premiumController.subscribe);

export default router;
