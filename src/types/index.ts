import { Request } from "express";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export enum SeekingRelation {
  DATE = "date",
  BFF = "bff",
}

export enum FollowStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
}

// New: Relationship status for user listing
export enum RelationshipStatus {
  NONE = "none",
  REQUEST_SENT = "request_sent",
  REQUEST_RECEIVED = "request_received",
  FRIENDS = "friends",
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface RegisterDto {
  email: string;
  password: string;
  full_name: string;
  date_of_birth: string;
  gender: Gender;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  full_name?: string;
  bio?: string;
  gender?: Gender;
  city?: string;
  country?: string;
  location_opt_in?: boolean;
  conversation_style?: string;
  humor_type?: string;
  hobbies?: string[];
}

export interface SendMessageDto {
  content: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface UserListQuery extends PaginationQuery {
  gender?: Gender;
  search?: string;
  purpose?: "search";
}

// Enhanced user response with relationship status (community)
export interface UserWithRelationship {
  id: string;
  full_name: string;
  age: number;
  gender: Gender;
  bio: string | null;
  profile_picture: string | null;
  city: string | null;
  country: string | null;
  is_online: boolean;
  last_seen: Date | null;
  relationship_status: RelationshipStatus;
  follow_request_id?: string;
  interests: string[];
  conversation_style: string | null;
  humor_type: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
}

export interface SocketUser {
  userId: string;
  socketId: string;
}

export interface TypingEvent {
  receiver_id: string;
}

export interface SendMessageEvent {
  receiver_id: string;
  content: string;
}

export interface MarkAsReadEvent {
  message_id: string;
}

export interface OnlineStatusEvent {
  user_id: string;
  is_online: boolean;
  last_seen?: Date;
}

export interface NewMessageEvent {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: Date;
  sender: {
    full_name: string;
    profile_picture: string | null;
  };
}

export interface MessageReadEvent {
  message_id: string;
  read_at: Date;
}

export interface ConversationItem {
  user_id: string;
  full_name: string;
  profile_picture: string | null;
  is_online: boolean;
  last_seen: Date | null;
  last_message: {
    content: string;
    created_at: Date;
    is_read: boolean;
    sender_id: string;
  } | null;
  unread_count: number;
}
