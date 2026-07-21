import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { PostComment } from "./PostComment.entity";
import { User } from "./User.entity";

@Entity("comment_likes")
@Index(["comment_id", "user_id"], { unique: true })
export class CommentLike {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  comment_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => PostComment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "comment_id" })
  comment: PostComment;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
