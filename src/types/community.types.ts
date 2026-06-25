import { Gender } from "./index";

export type ConnectionStatus =
  | "none"
  | "pending"
  | "following"
  | "connected";

export type CommunityRelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export interface InterestTag {
  id: string;
  name: string;
}

export interface CircleSummary {
  id: string;
  name: string;
}

export interface CircleListItem extends CircleSummary {
  slug: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  is_featured: boolean;
  is_joined: boolean;
}

export interface CircleMemberItem {
  id: string;
  full_name: string;
  profile_picture: string | null;
  role: string;
  joined_at: Date;
}

export interface PublicUserProfile {
  id: string;
  full_name: string;
  age?: number;
  gender: Gender;
  bio: string | null;
  profile_picture: string | null;
  city: string | null;
  country: string | null;
  location_opt_in: boolean;
  interests: string[];
  conversation_style: string | null;
  humor_type: string | null;
  post_count: number;
  points_balance: number;
  circles: CircleSummary[];
  connection_status?: ConnectionStatus;
  is_online?: boolean;
  last_seen?: Date | null;
}

export interface OwnProfile extends PublicUserProfile {
  email: string;
  date_of_birth: Date;
  profile_completed: boolean;
  onboarding_completed_at: Date | null;
  intro_video_url: string | null;
}

export interface CommunityUserListItem {
  id: string;
  full_name: string;
  age: number;
  gender: Gender;
  bio: string | null;
  profile_picture: string | null;
  city: string | null;
  is_online: boolean;
  last_seen: Date | null;
  interests: string[];
  relationship_status: CommunityRelationshipStatus;
  follow_request_id?: string;
}

export interface CommunityProfileUpdateDto {
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
