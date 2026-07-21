import { Gender } from "../types";
import { User } from "../entities/User.entity";
import {
  mapRelationshipStatus,
  toCommunityUserListItem,
  toOwnProfile,
  toPublicUser,
} from "../utils/user-response.mapper";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    full_name: "Sara Khan",
    email: "sara@example.com",
    password_hash: "hidden",
    date_of_birth: new Date("1995-06-15"),
    gender: Gender.FEMALE,
    profile_completed: true,
    hobbies: [{ id: "h1", name: "Hiking", created_at: new Date(), updated_at: new Date(), users: [] }],
    profile_picture: "/uploads/pic.jpg",
    location: "Lahore",
    city: "Lahore",
    country: "Pakistan",
    location_opt_in: true,
    onboarding_completed_at: null,
    intro_video_url: null,
    conversation_style: "Quality Time",
    humor_type: "Witty",
    is_online: false,
    last_seen: null,
    bio: "Community member",
    report_count: 0,
    reset_token: null,
    reset_token_expires: null,
    fcm_token: null,
    notifications_enabled: true,
    is_basic: false,
    basic_until: null,
    basic_product_id: null,
    is_premium: false,
    premium_until: null,
    premium_product_id: null,
    referral_code: null,
    referred_by_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    following: [],
    followers: [],
    sent_messages: [],
    received_messages: [],
    refresh_tokens: [],
    notifications: [],
    ...overrides,
  } as User;
}

describe("user-response.mapper", () => {
  it("maps relationship status friends to connected", () => {
    expect(mapRelationshipStatus("friends")).toBe("connected");
    expect(mapRelationshipStatus("connected")).toBe("connected");
    expect(mapRelationshipStatus("pending_sent")).toBe("pending_sent");
    expect(mapRelationshipStatus("pending_received")).toBe("pending_received");
  });

  it("strips dating fields from public profile", () => {
    const profile = toPublicUser(buildUser(), { pointsBalance: 120 });

    expect(profile.interests).toEqual(["Hiking"]);
    expect(profile.conversation_style).toBe("Quality Time");
    expect(profile.points_balance).toBe(120);
    expect(profile).not.toHaveProperty("seeking_relation");
    expect(profile).not.toHaveProperty("relationship_goals");
    expect(profile).not.toHaveProperty("interested_in");
    expect(profile).not.toHaveProperty("date_you_reason");
  });

  it("maps own profile with community fields", () => {
    const profile = toOwnProfile(buildUser(), { pointsBalance: 50, postCount: 2 });

    expect(profile.email).toBe("sara@example.com");
    expect(profile.post_count).toBe(2);
    expect(profile.city).toBe("Lahore");
    expect(profile.location_opt_in).toBe(true);
    expect(profile.hobbies).toEqual([{ id: "h1", name: "Hiking" }]);
    expect(profile.interests).toEqual(["Hiking"]);
  });

  it("maps community user list item without dating discovery fields", () => {
    const item = toCommunityUserListItem({
      id: "u2",
      full_name: "Ali",
      date_of_birth: "1994-01-01",
      gender: "male",
      bio: "Hello",
      profile_picture: null,
      city: "Karachi",
      is_online: 1,
      last_seen: null,
      hobbies: "Cooking,Travel",
      relationship_status: "friends",
      follow_request_id: null,
    });

    expect(item.relationship_status).toBe("connected");
    expect(item.interests).toEqual(["Cooking", "Travel"]);
    expect(item).not.toHaveProperty("total_likes");
    expect(item).not.toHaveProperty("seeking_relation");
  });
});
