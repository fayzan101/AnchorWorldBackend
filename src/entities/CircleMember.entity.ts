import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Circle } from "./Circle.entity";
import { User } from "./User.entity";

export enum CircleMemberRole {
  MEMBER = "member",
  ADMIN = "admin",
}

@Entity("circle_members")
@Index(["circle_id", "user_id"], { unique: true })
export class CircleMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  circle_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({
    type: "enum",
    enum: CircleMemberRole,
    default: CircleMemberRole.MEMBER,
  })
  role: CircleMemberRole;

  @CreateDateColumn()
  joined_at: Date;

  @ManyToOne(() => Circle, { onDelete: "CASCADE" })
  @JoinColumn({ name: "circle_id" })
  circle: Circle;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
