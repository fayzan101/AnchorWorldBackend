import { AppDataSource } from "../config/data-source";
import { Referral, ReferralStatus } from "../entities/Referral.entity";

export class ReferralRepository {
  private get repo() {
    return AppDataSource.getRepository(Referral);
  }

  async create(data: Partial<Referral>): Promise<Referral> {
    const row = this.repo.create(data);
    return this.repo.save(row);
  }

  async findByReferee(refereeId: string): Promise<Referral | null> {
    return this.repo.findOne({ where: { referee_id: refereeId } });
  }

  async findByReferrer(referrerId: string): Promise<Referral[]> {
    return this.repo.find({
      where: { referrer_id: referrerId },
      order: { created_at: "DESC" },
      relations: ["referee"],
    });
  }

  async markCompleted(id: string): Promise<Referral | null> {
    await this.repo.update(id, {
      status: ReferralStatus.COMPLETED,
      completed_at: new Date(),
    });
    return this.repo.findOne({ where: { id } });
  }

  async countByReferrer(referrerId: string): Promise<{
    invited: number;
    completed: number;
  }> {
    const invited = await this.repo.count({ where: { referrer_id: referrerId } });
    const completed = await this.repo.count({
      where: { referrer_id: referrerId, status: ReferralStatus.COMPLETED },
    });
    return { invited, completed };
  }
}
