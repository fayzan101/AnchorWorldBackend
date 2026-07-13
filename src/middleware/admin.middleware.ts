import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { config } from "../config/environment";
import { ResponseUtil } from "../utils/response.util";

/**
 * Restricts access to users listed in ADMIN_USER_IDS (comma-separated UUIDs).
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id;
  if (!userId) {
    ResponseUtil.unauthorized(res, "Authentication required");
    return;
  }

  const adminIds = config.admin.userIds;
  if (adminIds.length === 0) {
    ResponseUtil.forbidden(res, "Admin access is not configured");
    return;
  }

  if (!adminIds.includes(userId)) {
    ResponseUtil.forbidden(res, "Admin access required");
    return;
  }

  next();
};
