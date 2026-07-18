import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";

export enum ReferralStatus {
  PENDING = "pending",
  COMPLETED = "completed",
}

@Entity("referrals")
@Index(["referee_id"], { unique: true })
@Index(["referrer_id"])
export class Referral {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  referrer_id: string;

  @Column({ type: "uuid" })
  referee_id: string;

  @Column({ type: "varchar", length: 32, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "referrer_id" })
  referrer: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "referee_id" })
  referee: User;
}
