import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { NotificationType } from "../constants/notification-types";
import { User } from "./User.entity";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.notifications, {
    nullable: true,
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  @Column({ type: "uuid", nullable: true })
  user_id: string | null;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "text", nullable: false })
  body: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    nullable: false,
  })
  type: NotificationType;

  @Column({ type: "json", nullable: true })
  data: Record<string, string> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
