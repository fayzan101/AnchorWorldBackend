import { Response, NextFunction } from "express";
import { OnboardingService } from "../services/onboarding.service";
import { ResponseUtil } from "../utils/response.util";
import { AuthRequest } from "../types";
import { CommunityOnboardingDto } from "../types/community.types";

export class OnboardingController {
  private onboardingService: OnboardingService;

  constructor(onboardingService?: OnboardingService) {
    this.onboardingService = onboardingService ?? new OnboardingService();
  }

  getStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const status = await this.onboardingService.getStatus(userId);
      ResponseUtil.success(res, status);
    } catch (error) {
      next(error);
    }
  };

  completeCommunity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.onboardingService.completeCommunityOnboarding(
        userId,
        req.body as CommunityOnboardingDto
      );
      ResponseUtil.success(res, result, "Community onboarding completed");
    } catch (error) {
      next(error);
    }
  };
}
