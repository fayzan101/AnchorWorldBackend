import { Request, Response, NextFunction } from "express";

const DEFAULT_DEPRECATION =
  'endpoint="legacy-onboarding"; use="/api/onboarding/community"';

export function deprecationHeader(
  deprecation?: string
): (_req: Request, res: Response, next: NextFunction) => void {
  const message = deprecation ?? DEFAULT_DEPRECATION;
  return (_req, res, next) => {
    res.setHeader("X-Deprecated", "true");
    res.setHeader("Deprecation", message);
    next();
  };
}
