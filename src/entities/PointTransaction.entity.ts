import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity("point_transactions")
export class PointTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int" })
  amount: number;

  @Column({ type: "varchar", length: 64 })
  type: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  reference_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;
}
