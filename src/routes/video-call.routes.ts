import { Router } from "express";
import { VideoCallController } from "../controllers/video-call.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate } from "../middleware/validation.middleware";

const router = Router();
const videoCallController = new VideoCallController();

router.use(authenticateToken);

router.post(
  "/request",
  [
    body("callee_id").isUUID().withMessage("callee_id must be a valid UUID"),
    body("duration_minutes")
      .isIn([5, 10])
      .withMessage("duration_minutes must be 5 or 10"),
  ],
  validate,
  videoCallController.requestIntro
);

router.get("/history", videoCallController.getHistory);

router.get("/:id/token", videoCallController.getToken);
router.post("/:id/accept", videoCallController.acceptIntro);
router.post("/:id/reject", videoCallController.rejectIntro);
router.post("/:id/cancel", videoCallController.cancelIntro);
router.post("/:id/end", videoCallController.endIntro);

export default router;
