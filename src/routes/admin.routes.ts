import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { body } from "express-validator";
import { validate } from "../middleware/validation.middleware";

const router = Router();
const moderationController = new ModerationController();

router.use(authenticateToken);
router.use(requireAdmin);

router.get("/reports", moderationController.listReports);
router.post(
  "/reports/:id/action",
  [
    body("action")
      .isIn(["hide_content", "dismiss", "warn_user"])
      .withMessage("Invalid moderation action"),
  ],
  validate,
  moderationController.takeAction
);

export default router;
