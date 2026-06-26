import { NextFunction, Request, Response } from "express";
import { recordHttpRequest } from "../config/metrics";

const resolveRouteLabel = (req: Request): string => {
  const routePath = req.route?.path;

  if (typeof routePath === "string") {
    return `${req.baseUrl || ""}${routePath}` || req.path;
  }

  if (Array.isArray(routePath) && routePath.length > 0) {
    return `${req.baseUrl || ""}${routePath[0]}` || req.path;
  }

  return req.path;
};

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.path === "/metrics") {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    recordHttpRequest({
      method: req.method,
      route: resolveRouteLabel(req),
      statusCode: String(res.statusCode),
      durationSeconds,
    });
  });

  next();
};