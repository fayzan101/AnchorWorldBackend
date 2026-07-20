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

export enum VideoCallStatus {
  PENDING = "pending",
  ACTIVE = "active",
  COMPLETED = "completed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  MISSED = "missed",
}

export enum CallType {
  VOICE = "voice",
  VIDEO = "video",
}

@Entity("video_calls")
@Index(["caller_id", "created_at"])
@Index(["callee_id", "created_at"])
@Index(["status", "expires_at"])
export class VideoCall {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  caller_id: string;

  @Column({ type: "uuid" })
  callee_id: string;

  @Column({
    type: "enum",
    enum: VideoCallStatus,
    default: VideoCallStatus.PENDING,
  })
  status: VideoCallStatus;

  @Column({
    type: "enum",
    enum: CallType,
    default: CallType.VIDEO,
  })
  call_type: CallType;

  @Column({ type: "int" })
  duration_minutes: number;

  @Column({ type: "int" })
  points_spent: number;

  @Column({ type: "varchar", length: 100 })
  channel_name: string;

  @Column({ type: "timestamp", nullable: true })
  started_at: Date | null;

  @Column({ type: "timestamp", nullable: true })
  ended_at: Date | null;

  @Column({ type: "timestamp" })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "caller_id" })
  caller: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "callee_id" })
  callee: User;
}
