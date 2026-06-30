import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User.entity";

@Entity("user_blocks")
@Unique(["blocker_id", "blocked_id"])
@Index(["blocker_id"])
@Index(["blocked_id"])
export class UserBlock {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  blocker_id: string;

  @Column({ type: "uuid" })
  blocked_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocker_id" })
  blocker: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocked_id" })
  blocked: User;
}
