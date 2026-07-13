import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from "typeorm";
import { User } from "./User.entity";

@Entity("relationship_goals")
export class RelationshipGoals {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ✅ Many-to-Many reverse relationship
  @ManyToMany(() => User, (user) => user.relationship_goals)
  users: User[];
}
