import { Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";
import { RelationShipGoalsService } from "../services/relationshipGoals.service";

export class RelationShipGoalController {
  private relationShipGoalService: RelationShipGoalsService;

  constructor() {
    this.relationShipGoalService = new RelationShipGoalsService();
  }

  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const relationshipGoals = await this.relationShipGoalService.getAll();
      ResponseUtil.success(res, relationshipGoals);
    } catch (error) {
      next(error);
    }
  };
}
