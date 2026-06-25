import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  IntegerType
} from "typeorm";
import { Gender, SeekingRelation } from "../types";
import { Follow } from "./Follow.entity";
import { Message } from "./Message.entity";
import { RefreshToken } from "./RefreshToken.entity";
import { Notification } from "./Notification.entity";
import { Hobby } from "./Hobbies.entity";
import { RelationshipGoals } from "./RelationshipGoals.entity";
import { PartnerQuality } from "./PartnerQualities.entity";

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

  // Profile Fields
  @Column({
    type: "enum",
    enum: SeekingRelation,
    nullable: true,
  })
  seeking_relation: string | null; // What brings you to Anchor

  @Column({
    type: "enum",
    enum: Gender,
    nullable: true,
  })
  interested_in: string | null; // Who would you like to meet

  // ✅ Many-to-Many relationship with Relationship Goals
  @ManyToMany(() => RelationshipGoals, (goal) => goal.users, { cascade: true })
  @JoinTable({
    name: "user_goals", // custom join table name
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "goal_id", referencedColumnName: "id" },
  })
  relationship_goals: RelationshipGoals[]; // What are you hoping to find

  @Column({ type: "varchar", length: 500, nullable: true })
  height: string | null; 

  // ✅ Many-to-Many relationship with Hobby
  @ManyToMany(() => Hobby, (hobby) => hobby.users, { cascade: true })
  @JoinTable({
    name: "user_hobbies", // custom join table name
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "hobby_id", referencedColumnName: "id" },
  })
  hobbies: Hobby[]; // Things you are into

  // ✅ Many-to-Many relationship with Partner Quality
  @ManyToMany(() => PartnerQuality, (quality) => quality.users, { cascade: true })
  @JoinTable({
    name: "user_partner_qualities", // custom join table name
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "partner_quality_id", referencedColumnName: "id" },
  })
  partner_qualities: PartnerQuality[]; // Partner qualities you like

  @Column({ type: "varchar", length: 500, nullable: true })
  have_kids: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  kids: string | null;

  @Column({ type: "text", nullable: true })
  date_you_reason: string | null; // whats it like to date you?

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

  @Column({ type: "int",  default: 0 })
  report_count: IntegerType;

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
