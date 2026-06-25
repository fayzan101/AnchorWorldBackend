import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity("user_points")
export class UserPoints {
  @PrimaryColumn({ type: "uuid" })
  user_id: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int", default: 0 })
  balance: number;

  @Column({ type: "int", default: 0 })
  lifetime_earned: number;

  @UpdateDateColumn()
  updated_at: Date;
}
