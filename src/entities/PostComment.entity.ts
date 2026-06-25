import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Post } from "./Post.entity";
import { User } from "./User.entity";

@Entity("post_comments")
@Index(["post_id", "created_at"])
export class PostComment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  post_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "uuid", nullable: true })
  parent_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
