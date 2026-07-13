import { AppDataSource } from "../config/database";
import {
  ModerationAction,
  ModerationActionType,
} from "../entities/ModerationAction.entity";

export class ModerationActionRepository {
  private repository = AppDataSource.getRepository(ModerationAction);

  async create(data: {
    report_id: string;
    admin_id: string;
    action: ModerationActionType;
    notes?: string | null;
  }): Promise<ModerationAction> {
    const action = this.repository.create({
      report_id: data.report_id,
      admin_id: data.admin_id,
      action: data.action,
      notes: data.notes ?? null,
    });
    return this.repository.save(action);
  }
}
