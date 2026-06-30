import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { deprecationHeader } from "../middleware/deprecation.middleware";
import { RelationShipGoalController } from "../controllers/relationshipGoals.controller";

const router = Router();
const relationShipGoalController = new RelationShipGoalController();

router.use(authenticateToken);
router.use(deprecationHeader());

/**
 * @route   GET /api/relationship-goals
 * @desc    Get All relationship-goals
 * @access  Private
 */
router.get("/", relationShipGoalController.getAll);

export default router;
