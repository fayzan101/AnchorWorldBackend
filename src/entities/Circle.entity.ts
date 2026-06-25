import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("circles")
export class Circle {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 120 })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  icon_url: string | null;

  @Column({ type: "int", default: 0 })
  member_count: number;

  @Column({ type: "boolean", default: false })
  is_featured: boolean;

  @CreateDateColumn()
  created_at: Date;
}
