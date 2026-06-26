import { Router } from "express";
import { metricsRegistry } from "../config/metrics";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    res.setHeader("Content-Type", metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
});

export default router;