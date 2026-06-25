import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from "typeorm";
import { User } from "./User.entity";

@Entity("partner_qualities")
export class PartnerQuality {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ✅ Many-to-Many reverse relationship
  @ManyToMany(() => User, (user) => user.partner_qualities)
  users: User[];
}
