import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
}

@Entity('messages')
@Index(['sender_id', 'receiver_id'])
@Index(['receiver_id', 'is_read'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  sender_id: string;

  @Column({ type: 'varchar', length: 36 })
  receiver_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, default: MessageType.TEXT })
  message_type: MessageType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  media_url: string | null;

  @Column({ type: 'int', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reply_to_message_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  /** Soft-delete for everyone (WhatsApp-style). */
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  deleted_by_user_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  edited_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.sent_messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, (user) => user.received_messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_message_id' })
  reply_to: Message | null;
}
