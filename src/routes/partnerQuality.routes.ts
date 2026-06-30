import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { deprecationHeader } from "../middleware/deprecation.middleware";
import { PartnerQualityController } from "../controllers/partnerQuality.controller";

const router = Router();
const partnerQualityController = new PartnerQualityController();

router.use(authenticateToken);
router.use(deprecationHeader());

/**
 * @route   GET /api/partner-qualities
 * @desc    Get All partner qualities
 * @access  Private
 */
router.get("/", partnerQualityController.getAll);

export default router;