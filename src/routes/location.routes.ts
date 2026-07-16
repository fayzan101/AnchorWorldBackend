import { Router } from "express";
import { LocationController } from "../controllers/location.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const locationController = new LocationController();

router.use(authenticateToken);

/**
 * @route   GET /api/locations/countries
 * @desc    List countries for location pickers
 * @access  Private
 */
router.get("/countries", locationController.getCountries);

/**
 * @route   GET /api/locations/cities?country=Pakistan
 * @desc    List cities for a country (name or ISO code)
 * @access  Private
 */
router.get("/cities", locationController.getCities);

export default router;
