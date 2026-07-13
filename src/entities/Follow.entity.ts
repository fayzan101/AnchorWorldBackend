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
import { FollowStatus } from '../types';
import { User } from './User.entity';

@Entity('follows')
@Index(['follower_id', 'following_id'], { unique: true })
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  follower_id: string;

  @Column({ type: 'uuid' })
  following_id: string;

  @Column({
    type: 'enum',
    enum: FollowStatus,
    default: FollowStatus.PENDING,
  })
  status: FollowStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.following, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @ManyToOne(() => User, (user) => user.followers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: User;
}