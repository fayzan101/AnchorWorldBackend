import { Router } from "express";
import { DiscoverController } from "../controllers/discover.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const discoverController = new DiscoverController();

router.use(authenticateToken);

router.get("/local", discoverController.getLocal);

export default router;
