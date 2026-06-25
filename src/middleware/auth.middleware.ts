import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { verifyAccessToken } from "../utils/jwt.util";
import { ResponseUtil } from "../utils/response.util";

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      ResponseUtil.unauthorized(res, "Access token required");
      return;
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        ResponseUtil.unauthorized(res, "Access token expired");
        return;
      }
      if (error.name === "JsonWebTokenError") {
        ResponseUtil.unauthorized(res, "Invalid access token");
        return;
      }
    }
    ResponseUtil.unauthorized(res, "Authentication failed");
  }
};
