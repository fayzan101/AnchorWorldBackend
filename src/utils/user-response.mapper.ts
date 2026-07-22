import { User } from "../entities/User.entity";
import {
  CommunityRelationshipStatus,
  CommunityUserListItem,
  ConnectionStatus,
  OwnProfile,
  PublicUserProfile,
} from "../types/community.types";
import { Gender } from "../types";

export interface PublicUserMapperOptions {
  includeEmail?: boolean;
  pointsBalance?: number;
  postCount?: number;
  circles?: { id: string; name: string }[];
  connectionStatus?: ConnectionStatus;
  age?: number;
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

function mapInterests(user: User): string[] {
  if (!user.hobbies?.length) {
    return [];
  }
  return user.hobbies.map((hobby) => hobby.name);
}

export function mapRelationshipStatus(
  raw: string | null | undefined
): CommunityRelationshipStatus {
    switch (raw) {
    case "friends":
    case "connected":
      return "connected";
    case "request_sent":
    case "pending_sent":
      return "pending_sent";
    case "request_received":
    case "pending_received":
      return "pending_received";
    default:
      return "none";
  }
}

export function toPublicUser(
  user: User,
  options: PublicUserMapperOptions = {}
): PublicUserProfile {
  const age = options.age ?? calculateAge(user.date_of_birth);

  const profile: PublicUserProfile = {
    id: user.id,
    full_name: user.full_name,
    age,
    gender: user.gender as Gender,
    bio: user.bio,
    profile_picture: user.profile_picture,
    city: user.city ?? null,
    country: user.country ?? null,
    location_opt_in: Boolean(user.location_opt_in),
    interests: mapInterests(user),
    conversation_style: user.conversation_style ?? null,
    humor_type: user.humor_type ?? null,
    post_count: options.postCount ?? 0,
    points_balance: options.pointsBalance ?? 0,
    circles: options.circles ?? [],
  };

  if (options.connectionStatus) {
    profile.connection_status = options.connectionStatus;
  }
  if (options.includeEmail === false) {
    // Public view — no extra fields
  }

  return profile;
}

export function toOwnProfile(
  user: User,
  options: Omit<PublicUserMapperOptions, "includeEmail"> = {}
): OwnProfile {
  return {
    ...toPublicUser(user, options),
    email: user.email,
    date_of_birth: user.date_of_birth,
    profile_completed: Boolean(user.profile_completed),
    onboarding_completed_at: user.onboarding_completed_at ?? null,
    intro_video_url: user.intro_video_url ?? null,
    email_verified_at: user.email_verified_at ?? null,
    email_verified: Boolean(user.email_verified_at),
    hobbies: (user.hobbies ?? []).map((h) => ({ id: h.id, name: h.name })),
  };
}

export function toCommunityUserListItem(
  row: Record<string, unknown>
): CommunityUserListItem {
  const hobbiesRaw = row.hobbies as string | null;
  const interests = hobbiesRaw
    ? hobbiesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    id: row.id as string,
    full_name: row.full_name as string,
    age: calculateAge(new Date(row.date_of_birth as string)),
    gender: row.gender as Gender,
    bio: (row.bio as string) ?? null,
    profile_picture: (row.profile_picture as string) ?? null,
    city: (row.city as string) ?? null,
    is_online: Boolean(row.is_online),
    last_seen: (row.last_seen as Date) ?? null,
    interests,
    relationship_status: mapRelationshipStatus(
      row.relationship_status as string
    ),
    follow_request_id: (row.follow_request_id as string) ?? undefined,
  };
}
