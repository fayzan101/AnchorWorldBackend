import { Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";
import { listCitiesForCountry, listCountries } from "../data/locations";
import { AppError } from "../middleware/error.middleware";

export class LocationController {
  getCountries = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      ResponseUtil.success(res, { countries: listCountries() });
    } catch (error) {
      next(error);
    }
  };

  getCities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const country = String(req.query.country ?? req.params.country ?? "").trim();
      if (!country) {
        throw new AppError("country query is required (name or code)", 400);
      }
      const cities = listCitiesForCountry(country);
      if (cities.length === 0) {
        throw new AppError("Unknown country", 404);
      }
      ResponseUtil.success(res, { country, cities });
    } catch (error) {
      next(error);
    }
  };
}
