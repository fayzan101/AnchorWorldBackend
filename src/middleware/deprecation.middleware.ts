import { Request, Response, NextFunction } from "express";

export function deprecationHeader(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader("X-Deprecated", "true");
  res.setHeader(
    "Deprecation",
    'endpoint="legacy-onboarding"; use="/api/onboarding/community"'
  );
  next();
}
