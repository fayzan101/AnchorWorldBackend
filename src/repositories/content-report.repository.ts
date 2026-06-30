import { AppDataSource } from "../config/database";
import {
  ContentReport,
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";
import {
  ModerationAction,
  ModerationActionType,
} from "../entities/ModerationAction.entity";

export class ContentReportRepository {
  private reportRepo = () => AppDataSource.getRepository(ContentReport);
  private actionRepo = () => AppDataSource.getRepository(ModerationAction);

  async createReport(data: {
    reporter_id: string;
    target_type: ReportTargetType;
    target_id: string;
    reason?: string | null;
  }): Promise<ContentReport> {
    const report = this.reportRepo().create({
      ...data,
      reason: data.reason ?? null,
      status: ReportStatus.OPEN,
    });
    return this.reportRepo().save(report);
  }

  async findById(id: string): Promise<ContentReport | null> {
    return this.reportRepo().findOne({
      where: { id },
      relations: ["reporter"],
    });
  }

  async findOpenByTarget(
    targetType: ReportTargetType,
    targetId: string
  ): Promise<ContentReport | null> {
    return this.reportRepo().findOne({
      where: {
        target_type: targetType,
        target_id: targetId,
        status: ReportStatus.OPEN,
      },
    });
  }

  async listByStatus(
    status: ReportStatus,
    page = 1,
    limit = 20
  ): Promise<{ items: ContentReport[]; total: number }> {
    const [items, total] = await this.reportRepo().findAndCount({
      where: { status },
      relations: ["reporter"],
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async updateStatus(
    id: string,
    status: ReportStatus
  ): Promise<ContentReport | null> {
    await this.reportRepo().update(id, { status });
    return this.findById(id);
  }

  async createAction(data: {
    report_id: string;
    admin_id: string;
    action: ModerationActionType;
    notes?: string | null;
  }): Promise<ModerationAction> {
    const record = this.actionRepo().create({
      ...data,
      notes: data.notes ?? null,
    });
    return this.actionRepo().save(record);
  }
}
