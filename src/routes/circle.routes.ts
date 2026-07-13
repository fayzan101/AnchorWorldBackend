import { Router } from "express";
import { CircleController } from "../controllers/circle.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { ValidationUtil } from "../utils/validation.util";
import { validate } from "../middleware/validation.middleware";

const router = Router();
const circleController = new CircleController();

router.use(authenticateToken);

router.get("/", circleController.listCircles);
router.get("/featured", circleController.getFeatured);

router.get(
  "/:id/posts",
  ValidationUtil.pagination(),
  validate,
  circleController.getPosts
);

router.get(
  "/:id/members",
  ValidationUtil.pagination(),
  validate,
  circleController.getMembers
);

router.get("/:id", circleController.getCircleById);
router.post("/:id/join", circleController.joinCircle);
router.delete("/:id/leave", circleController.leaveCircle);

export default router;
