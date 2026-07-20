import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";
import { Message } from "./Message.entity";

/** Per-user hide ("delete for me"). */
@Entity("message_hides")
@Index(["user_id"])
export class MessageHide {
  @PrimaryColumn({ type: "varchar", length: 36 })
  message_id: string;

  @PrimaryColumn({ type: "varchar", length: 36 })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Message, { onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id" })
  message: Message;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
