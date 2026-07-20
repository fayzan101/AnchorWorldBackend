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

@Entity("chat_unlocks")
@Index("UQ_chat_unlocks_pair", ["user_a", "user_b"], { unique: true })
@Index(["unlocked_by"])
export class ChatUnlock {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_a: string;

  @Column({ type: "uuid" })
  user_b: string;

  @Column({ type: "uuid" })
  unlocked_by: string;

  @Column({ type: "int", default: 0 })
  points_spent: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_a" })
  userA: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_b" })
  userB: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "unlocked_by" })
  unlockedBy: User;
}

/** Normalize pair so (a,b) and (b,a) map to the same row. */
export function normalizeChatPair(
  userId1: string,
  userId2: string
): { user_a: string; user_b: string } {
  return userId1 < userId2
    ? { user_a: userId1, user_b: userId2 }
    : { user_a: userId2, user_b: userId1 };
}
