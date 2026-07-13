import { Router } from "express";
import { OnboardingController } from "../controllers/onboarding.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { ValidationUtil } from "../utils/validation.util";
import { validate } from "../middleware/validation.middleware";

const router = Router();
const onboardingController = new OnboardingController();

router.use(authenticateToken);

router.get("/status", onboardingController.getStatus);

router.post(
  "/community",
  ValidationUtil.communityOnboarding(),
  validate,
  onboardingController.completeCommunity
);

export default router;
