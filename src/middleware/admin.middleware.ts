import { Response, NextFunction } from "express";
import { config } from "../config/environment";
import { AuthRequest } from "../types";
import { AppError } from "./error.middleware";

export function requireAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const userId = req.user?.id;
  if (!userId) {
    next(new AppError("Authentication required", 401));
    return;
  }

  if (!config.admin.userIds.includes(userId)) {
    next(new AppError("Admin access required", 403));
    return;
  }

  next();
}
