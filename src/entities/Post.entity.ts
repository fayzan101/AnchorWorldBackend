import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";
import { Circle } from "./Circle.entity";

export enum PostMediaType {
  NONE = "none",
  IMAGE = "image",
  VIDEO = "video",
}

@Entity("posts")
@Index(["user_id", "created_at"])
@Index(["circle_id", "created_at"])
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  media_url: string | null;

  @Column({
    type: "enum",
    enum: PostMediaType,
    default: PostMediaType.NONE,
  })
  media_type: PostMediaType;

  @Column({ type: "uuid", nullable: true })
  circle_id: string | null;

  @Column({ type: "uuid", nullable: true })
  source_post_id: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  country: string | null;

  @Column({ type: "int", default: 0 })
  like_count: number;

  @Column({ type: "int", default: 0 })
  comment_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Circle, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "circle_id" })
  circle: Circle | null;

  @ManyToOne(() => Post, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "source_post_id" })
  source_post: Post | null;
}
