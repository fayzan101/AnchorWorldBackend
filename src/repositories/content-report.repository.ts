import { AppDataSource } from "../config/database";
import {
  ContentReport,
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";

export class ContentReportRepository {
  private repository = AppDataSource.getRepository(ContentReport);

  async create(data: {
    reporter_id: string;
    target_type: ReportTargetType;
    target_id: string;
    reason?: string | null;
  }): Promise<ContentReport> {
    const report = this.repository.create({
      reporter_id: data.reporter_id,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason ?? null,
      status: ReportStatus.OPEN,
    });
    return this.repository.save(report);
  }

  async findById(id: string): Promise<ContentReport | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["reporter"],
    });
  }

  async findOpenDuplicate(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string
  ): Promise<ContentReport | null> {
    return this.repository.findOne({
      where: {
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        status: ReportStatus.OPEN,
      },
    });
  }

  async findByStatus(
    status: ReportStatus | undefined,
    page: number,
    limit: number
  ): Promise<{ items: ContentReport[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.reporter", "reporter")
      .orderBy("report.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.where("report.status = :status", { status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStatus(
    id: string,
    status: ReportStatus
  ): Promise<ContentReport | null> {
    await this.repository.update(id, { status });
    return this.findById(id);
  }
}
