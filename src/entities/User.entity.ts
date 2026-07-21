import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Gender } from "../types";
import { Follow } from "./Follow.entity";
import { Message } from "./Message.entity";
import { RefreshToken } from "./RefreshToken.entity";
import { Notification } from "./Notification.entity";
import { Hobby } from "./Hobbies.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  full_name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, select: false })
  password_hash: string;

  @Column({ type: "date" })
  date_of_birth: Date;

  @Column({
    type: "enum",
    enum: Gender,
  })
  gender: Gender;

  @Column({
    type: "boolean",
    default: false,
  })
  profile_completed: Boolean;

  // Community topics (hobbies)
  @ManyToMany(() => Hobby, (hobby) => hobby.users, { cascade: true })
  @JoinTable({
    name: "user_hobbies",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "hobby_id", referencedColumnName: "id" },
  })
  hobbies: Hobby[];

  @Column({ type: "varchar", length: 500, nullable: true })
  profile_picture: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  country: string | null;

  @Column({ type: "boolean", default: false })
  location_opt_in: boolean;

  @Column({ type: "timestamp", nullable: true })
  onboarding_completed_at: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  intro_video_url: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  conversation_style: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  humor_type: string | null;

  @Column({ type: "boolean", default: false })
  is_online: boolean;

  @Column({ type: "timestamp", nullable: true })
  last_seen: Date | null;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ type: "int", default: 0 })
  report_count: number;

  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  reset_token: string | null;

  @Column({ type: "timestamp", nullable: true, select: false })
  reset_token_expires: Date | null;

  // FCM Token for push notifications
  @Column({ type: "varchar", length: 500, nullable: true })
  fcm_token: string | null;

  // Notification preferences
  @Column({ type: "boolean", default: true })
  notifications_enabled: boolean;

  @Column({ type: "boolean", default: false })
  is_basic: boolean;

  @Column({ type: "timestamp", nullable: true })
  basic_until: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  basic_product_id: string | null;

  @Column({ type: "boolean", default: false })
  is_premium: boolean;

  @Column({ type: "timestamp", nullable: true })
  premium_until: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  premium_product_id: string | null;

  @Column({ type: "varchar", length: 16, nullable: true, unique: true })
  referral_code: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  referred_by_user_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @OneToMany(() => Message, (message) => message.sender)
  sent_messages: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  received_messages: Message[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refresh_tokens: RefreshToken[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
