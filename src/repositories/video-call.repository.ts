import { AppDataSource } from "../config/database";
import { VideoCall, VideoCallStatus } from "../entities/VideoCall.entity";

export class VideoCallRepository {
  private repository = AppDataSource.getRepository(VideoCall);

  async create(data: Partial<VideoCall>): Promise<VideoCall> {
    const call = this.repository.create(data);
    return this.repository.save(call);
  }

  async findById(id: string): Promise<VideoCall | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["caller", "callee"],
    });
  }

  async updateStatus(
    id: string,
    status: VideoCallStatus,
    extra: Partial<VideoCall> = {}
  ): Promise<VideoCall | null> {
    await this.repository.update(id, { status, ...extra });
    return this.findById(id);
  }

  async countRequestsToday(callerId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.repository
      .createQueryBuilder("call")
      .where("call.caller_id = :callerId", { callerId })
      .andWhere("call.created_at >= :startOfDay", { startOfDay })
      .getCount();
  }

  async findHistory(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: VideoCall[]; total: number }> {
    const [items, total] = await this.repository
      .createQueryBuilder("call")
      .leftJoinAndSelect("call.caller", "caller")
      .leftJoinAndSelect("call.callee", "callee")
      .where("call.caller_id = :userId OR call.callee_id = :userId", { userId })
      .orderBy("call.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findExpiredPending(): Promise<VideoCall[]> {
    return this.repository
      .createQueryBuilder("call")
      .where("call.status = :status", { status: VideoCallStatus.PENDING })
      .andWhere("call.expires_at <= :now", { now: new Date() })
      .getMany();
  }
}
