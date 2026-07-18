import { UserRepository } from "../repositories/user.repository";
import { ReferralRepository } from "../repositories/referral.repository";
import { PointsService } from "./points.service";
import { AppError } from "../middleware/error.middleware";
import { ReferralStatus } from "../entities/Referral.entity";
import { PointAmounts, PointTypes } from "../constants/point-types";
import { config } from "../config/environment";

function generateReferralCode(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${clean || "ANCH"}${rand}`.slice(0, 8);
}

export class ReferralService {
  private userRepository: UserRepository;
  private referralRepository: ReferralRepository;
  private pointsService: PointsService;

  constructor(
    userRepository?: UserRepository,
    referralRepository?: ReferralRepository,
    pointsService?: PointsService
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.referralRepository = referralRepository ?? new ReferralRepository();
    this.pointsService = pointsService ?? new PointsService();
  }

  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    if (user.referral_code) return user.referral_code;

    for (let i = 0; i < 8; i++) {
      const code = generateReferralCode(user.full_name || user.email || "USER");
      try {
        await this.userRepository.update(userId, { referral_code: code } as any);
        return code;
      } catch {
        // unique collision — retry
      }
    }
    throw new AppError("Could not generate referral code", 500);
  }

  async getMine(userId: string) {
    const code = await this.ensureReferralCode(userId);
    const counts = await this.referralRepository.countByReferrer(userId);
    const rows = await this.referralRepository.findByReferrer(userId);
    const base = (config.frontend.url || "https://app.anchorworld.org").replace(/\/$/, "");
    const shareLink = `${base}/invite/${code}`;

    return {
      referral_code: code,
      share_link: shareLink,
      invited_count: counts.invited,
      completed_count: counts.completed,
      referrer_reward: PointAmounts[PointTypes.REFERRAL_REFERRER],
      referee_reward: PointAmounts[PointTypes.REFERRAL_REFEREE],
      invites: rows.map((r) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        completed_at: r.completed_at,
        referee: r.referee
          ? {
              id: r.referee.id,
              full_name: r.referee.full_name,
              profile_picture: r.referee.profile_picture,
            }
          : null,
      })),
    };
  }

  async applyCode(userId: string, rawCode: string) {
    const code = (rawCode || "").trim().toUpperCase();
    if (!code) throw new AppError("Referral code is required", 400);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.referred_by_user_id) {
      throw new AppError("Referral already applied", 409);
    }

    const existing = await this.referralRepository.findByReferee(userId);
    if (existing) {
      throw new AppError("Referral already applied", 409);
    }

    const referrer = await this.userRepository.findByReferralCode(code);
    if (!referrer) throw new AppError("Invalid referral code", 404);
    if (referrer.id === userId) {
      throw new AppError("You cannot use your own referral code", 400);
    }

    await this.userRepository.update(userId, {
      referred_by_user_id: referrer.id,
    } as any);

    await this.referralRepository.create({
      referrer_id: referrer.id,
      referee_id: userId,
      status: ReferralStatus.PENDING,
      completed_at: null,
    });

    return { applied: true, referrer_id: referrer.id };
  }

  /**
   * When invitee completes community onboarding — award both parties once.
   */
  async completeForUser(refereeId: string): Promise<{
    referrer_awarded: number;
    referee_awarded: number;
  }> {
    const referral = await this.referralRepository.findByReferee(refereeId);
    if (!referral || referral.status === ReferralStatus.COMPLETED) {
      return { referrer_awarded: 0, referee_awarded: 0 };
    }

    const [referrerResult, refereeResult] = await Promise.all([
      this.pointsService.awardPointsOncePerReference(
        referral.referrer_id,
        PointAmounts[PointTypes.REFERRAL_REFERRER],
        PointTypes.REFERRAL_REFERRER,
        refereeId,
        "Referral bonus — friend joined"
      ),
      this.pointsService.awardPointsOncePerReference(
        refereeId,
        PointAmounts[PointTypes.REFERRAL_REFEREE],
        PointTypes.REFERRAL_REFEREE,
        referral.referrer_id,
        "Welcome bonus — joined via invite"
      ),
    ]);

    await this.referralRepository.markCompleted(referral.id);

    return {
      referrer_awarded: referrerResult.awarded,
      referee_awarded: refereeResult.awarded,
    };
  }
}
