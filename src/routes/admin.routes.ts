import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { body, query } from "express-validator";
import { validate } from "../middleware/validation.middleware";
import { ValidationUtil } from "../utils/validation.util";

const router = Router();
const moderationController = new ModerationController();

router.use(authenticateToken);
router.use(requireAdmin);

router.get(
  "/reports",
  [
    query("status")
      .optional()
      .isIn(["open", "reviewed", "dismissed", "actioned"])
      .withMessage("Invalid status"),
    ...ValidationUtil.pagination(),
  ],
  validate,
  moderationController.listReports
);

router.post(
  "/reports/:id/action",
  [
    body("action")
      .isIn(["hide_content", "dismiss", "warn_user", "ban_user"])
      .withMessage("Invalid action"),
    body("notes")
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage("notes must be at most 1000 characters"),
  ],
  validate,
  moderationController.takeAction
);

export default router;
