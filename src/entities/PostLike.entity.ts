import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Post } from "./Post.entity";
import { User } from "./User.entity";

@Entity("post_likes")
@Index(["post_id", "user_id"], { unique: true })
export class PostLike {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  post_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
