import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";

export enum ReportTargetType {
  USER = "user",
  POST = "post",
  COMMENT = "comment",
}

export enum ReportStatus {
  OPEN = "open",
  DISMISSED = "dismissed",
  ACTIONED = "actioned",
}

@Entity("content_reports")
@Index(["status", "created_at"])
@Index(["target_type", "target_id"])
export class ContentReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  reporter_id: string;

  @Column({
    type: "enum",
    enum: ReportTargetType,
  })
  target_type: ReportTargetType;

  @Column({ type: "uuid" })
  target_id: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({
    type: "enum",
    enum: ReportStatus,
    default: ReportStatus.OPEN,
  })
  status: ReportStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reporter_id" })
  reporter: User;
}
