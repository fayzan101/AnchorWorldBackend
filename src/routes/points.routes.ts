import { Router } from "express";
import { PointsController } from "../controllers/points.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { ValidationUtil } from "../utils/validation.util";
import { validate } from "../middleware/validation.middleware";

const router = Router();
const pointsController = new PointsController();

router.use(authenticateToken);

router.get("/balance", pointsController.getBalance);

router.get(
  "/transactions",
  ValidationUtil.pagination(),
  validate,
  pointsController.getTransactions
);

export default router;
