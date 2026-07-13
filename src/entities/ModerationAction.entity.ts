import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ContentReport } from "./ContentReport.entity";
import { User } from "./User.entity";

export enum ModerationActionType {
  HIDE_CONTENT = "hide_content",
  DISMISS = "dismiss",
  WARN_USER = "warn_user",
  BAN_USER = "ban_user",
}

@Entity("moderation_actions")
@Index(["report_id"])
@Index(["admin_id", "created_at"])
export class ModerationAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  report_id: string;

  @Column({ type: "uuid" })
  admin_id: string;

  @Column({
    type: "enum",
    enum: ModerationActionType,
  })
  action: ModerationActionType;

  @Column({ type: "varchar", length: 1000, nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ContentReport, { onDelete: "CASCADE" })
  @JoinColumn({ name: "report_id" })
  report: ContentReport;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "admin_id" })
  admin: User;
}
