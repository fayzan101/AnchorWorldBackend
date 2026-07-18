import { Router } from "express";
import { ReferralController } from "../controllers/referral.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const referralController = new ReferralController();

router.use(authenticateToken);

router.get("/me", referralController.getMine);
router.post("/apply", referralController.apply);

export default router;
