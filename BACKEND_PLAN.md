# Anchor Heart — Backend Plan

This document explains what the **server/API** needs to build for the social pivot and **App Store 4.3(b) resubmission**.  
Written in simple words so any developer can follow it.

**API base URL (current):** `https://app.anchorworld.org/api`  
**No subscription** — only free features + Anchor Points.

**Rejection context:** Apple rejected v1.0 under **Guideline 4.3(b)** (saturated dating category). This plan removes dating positioning from APIs and centers **Circles + Posts + Anchor Points + Guided Video Intros** as the unique product loop.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Database Tables](#2-database-tables)
3. [Posts](#3-posts)
4. [Likes on Posts](#4-likes-on-posts)
5. [Comments](#5-comments)
6. [Anchor Points](#6-anchor-points)
7. [Video Calls (Guided Intros)](#7-video-calls-guided-intros)
8. [Location](#8-location)
9. [Circles (Communities)](#9-circles-communities)
10. [Social Graph (Follow / Connections)](#10-social-graph-follow--connections)
11. [Chat (Keep Existing)](#11-chat-keep-existing)
12. [Notifications](#12-notifications)
13. [Safety (Block & Report)](#13-safety-block--report)
14. [Auth, Profile & Onboarding](#14-auth-profile--onboarding)
15. [Content Moderation](#15-content-moderation)
16. [Demo Account & Seed Data](#16-demo-account--seed-data)
17. [What NOT to Build](#17-what-not-to-build)
18. [Build Order](#18-build-order)
19. [App Store Resubmission (Backend)](#19-app-store-resubmission-backend)

---

## 1. Big Picture

### Product identity (for Apple and developers)

**Anchor Heart is a topic-based community app.** Users join **Circles**, share **posts**, earn **Anchor Points** for positive activity, and spend points on **guided video introductions** with people they have mutually connected with.

This is **not** a dating or swipe-to-match product. The backend must not expose dating-specific discovery or compatibility APIs.

### One-line pitch

> Join circles, share posts, earn Anchor Points, and unlock guided video intros with your connections.

### Core loop (build APIs in this priority)

1. **Circles** — topic communities (primary discovery)
2. **Posts + feed** — user-generated content inside circles and globally
3. **Anchor Points** — server-side earn/spend wallet
4. **Guided video intros** — points unlock timed calls with conversation prompts
5. **Connections** — mutual follow unlocks chat + video (not random matching)

### Secondary features

- Likes and comments on posts
- City-based local feed (opt-in, city name only — no GPS tracking)
- Text chat between connections only

All point earning and spending must happen **on the server**. Never trust the mobile app to add or remove points.

---

## 2. Database Tables

### New tables to create

| Table | What it stores |
|-------|----------------|
| `posts` | User posts (text, image, video) |
| `post_likes` | Who liked which post |
| `post_comments` | Comments on posts |
| `user_points` | Each user's point balance |
| `point_transactions` | History of every point earn/spend |
| `video_calls` | Video call requests and status |
| `circles` | Community groups |
| `circle_members` | Who joined which circle |
| `user_blocks` | Who blocked whom |
| `content_reports` | Reports on posts, comments, or users |
| `moderation_actions` | Admin actions on reported content (hide, dismiss) |

### Update existing `users` table

Add these columns:

| Column | Type | Meaning |
|--------|------|---------|
| `city` | string | User's city name, e.g. "Lahore" |
| `country` | string | User's country |
| `location_opt_in` | boolean | Did user agree to show city on posts? |
| `onboarding_completed_at` | datetime | When user finished new community onboarding |
| `intro_video_url` | string (optional) | Short profile intro clip (not a dating video) |

### Dating fields — stop exposing (do not delete columns yet)

These columns stay in the database for legacy users but **must not** be returned by public profile/feed APIs or used for discovery:

| Field | Action |
|-------|--------|
| `seeking_relation` | Stop returning in API responses |
| `interested_in` | Stop returning in API responses |
| `relationship_goals` | Stop returning in API responses |
| `date_you_reason` | Stop returning in API responses |
| `valued_partner_qualities` | Stop returning in API responses |

### Community fields — keep and expose as interest tags

| Field | How it appears |
|-------|----------------|
| `hobbies` | "Interests" chips on profile and posts |
| `humor_type` | Optional "About me" tag |
| `love_language` | Rename in API to `conversation_style` (same DB column, new JSON key) |
| `social_preference` | Optional "About me" tag |
| `communication_preference` | Optional "About me" tag |

---

## 3. Posts

### What it does

A user writes something, optionally adds a photo or short video, and shares it to the feed.  
Posts can be public, shown to followers, or posted inside a circle.

### Database: `posts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who created it |
| `content` | text | Post text (required, min 10 characters) |
| `media_url` | string | Optional image or video URL |
| `media_type` | enum | `none`, `image`, `video` |
| `circle_id` | UUID | Optional — if posted in a circle |
| `city` | string | Copied from user profile if opted in |
| `country` | string | Copied from user profile |
| `like_count` | int | Cached count for fast loading |
| `comment_count` | int | Cached count |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `deleted_at` | datetime | Soft delete |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `GET` | `/posts/feed` | Get feed posts (paginated) |
| `GET` | `/posts/:id` | Get one post with details |
| `POST` | `/posts` | Create a new post |
| `DELETE` | `/posts/:id` | Delete own post |
| `GET` | `/users/:id/posts` | Get all posts by one user |

### Feed filters (query params)

| Filter | Meaning |
|--------|---------|
| `filter=circles` | Posts from circles I joined (**default for new users**) |
| `filter=following` | Posts from people I follow |
| `filter=local` | Posts from my city (only if I opted in) |
| `filter=all` | All public posts |
| `circle_id=xxx` | Posts inside one circle |

### Rules

- User must be logged in to create a post
- Max 3 posts per day for earning points (still allow more posts, just no extra points)
- Max image size: 5 MB. Max video: 30 seconds, 20 MB
- When post is created → award points (see Points section)
- Do not show posts from blocked users

### Response example (one post)

```json
{
  "id": "abc-123",
  "user": {
    "id": "user-1",
    "name": "Sara",
    "profile_picture": "https://...",
    "city": "Lahore",
    "interests": ["Hiking", "Photography"],
    "conversation_style": "Quality Time"
  },
  "content": "Just finished a morning hike!",
  "media_url": "https://...",
  "media_type": "image",
  "like_count": 12,
  "comment_count": 3,
  "is_liked_by_me": false,
  "city": "Lahore",
  "created_at": "2026-06-20T10:00:00Z"
}
```

---

## 4. Likes on Posts

### What it does

A user taps the heart on a post. One like per user per post.

### Database: `post_likes`

| Field | Type |
|-------|------|
| `id` | UUID |
| `post_id` | UUID |
| `user_id` | UUID |
| `created_at` | datetime |

**Unique rule:** One row per `(post_id, user_id)` — no duplicate likes.

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `POST` | `/posts/:id/like` | Like a post |
| `DELETE` | `/posts/:id/like` | Remove like (unlike) |

### Rules

- Increase `posts.like_count` when liked, decrease when unliked
- Give **+5 points** to post owner when someone likes (max 50 points/day from likes received)
- Send notification to post owner
- Send socket event `post_liked`

---

## 5. Comments

### What it does

Users can write comments under a post. Simple text only for version 1.

### Database: `post_comments`

| Field | Type |
|-------|------|
| `id` | UUID |
| `post_id` | UUID |
| `user_id` | UUID |
| `content` | text (min 3 characters) |
| `parent_id` | UUID (optional) | For replies later |
| `created_at` | datetime |
| `deleted_at` | datetime | Soft delete |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `GET` | `/posts/:id/comments` | List comments (paginated) |
| `POST` | `/posts/:id/comments` | Add a comment |
| `DELETE` | `/comments/:id` | Delete own comment |

### Rules

- Increase `posts.comment_count` on new comment
- **+15 points** to commenter (max 5 comments/day earn points)
- **+10 points** to post owner when someone comments (max 30/day)
- Notify post owner on new comment
- Do not allow comments from blocked users

---

## 6. Anchor Points

### What it does

Every user has a point wallet. They earn points by being active. They spend points on video calls.

**Important:** All math happens on the server. The app only shows the balance.

### Database: `user_points`

| Field | Type |
|-------|------|
| `user_id` | UUID (primary key) |
| `balance` | int (default 0) |
| `lifetime_earned` | int (total ever earned) |
| `updated_at` | datetime |

### Database: `point_transactions`

| Field | Type |
|-------|------|
| `id` | UUID |
| `user_id` | UUID |
| `amount` | int | Positive = earned, negative = spent |
| `type` | string | See table below |
| `reference_id` | UUID | Related post_id or call_id |
| `description` | string | Human-readable text |
| `created_at` | datetime |

### Point amounts

#### Earning points

| Action | Points | Daily limit |
|--------|--------|-------------|
| Complete profile (first time) | +100 | Once ever |
| First post ever | +150 | Once ever |
| Create a post | +25 | 3 times/day |
| Someone likes your post | +5 | 50/day total |
| Someone comments on your post | +10 | 30/day total |
| You write a comment | +15 | 5/day |
| Mutual follow (connection) | +50 | No limit |
| Join a circle | +30 | Once per circle |
| Post inside a circle | +40 | 2/day |
| Upload video intro on profile | +100 | Once ever |
| Daily login | +10 | Once/day |
| Finish a guided video call | +100 | Both users get this |

#### Spending points

| Action | Points |
|--------|--------|
| 5-minute video call | -500 |
| 10-minute video call | -800 |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `GET` | `/points/balance` | Get current balance |
| `GET` | `/points/transactions` | Get history (paginated) |

### Internal functions (not public API)

Create server-side helper functions:

```
awardPoints(userId, amount, type, referenceId)
spendPoints(userId, amount, type, referenceId)
```

`spendPoints` must check balance first. If not enough points, return error.

### Rules

- Balance cannot go below 0
- Log every change in `point_transactions`
- Use database transaction (lock row) when spending to avoid double-spend
- New users start with **0 points** (or give 100 welcome bonus — your choice)

---

## 7. Video Calls (Guided Intros)

### What it does

**Guided video intros** are the flagship differentiator. A user spends Anchor Points to request a timed video introduction with a **mutual connection**. During the call, both users see **community-focused conversation prompts** (not dating icebreakers).

Use **Agora** or **Daily.co** for the actual video. Backend creates the room, token, and prompt list.

### Database: `video_calls`

| Field | Type |
|-------|------|
| `id` | UUID |
| `caller_id` | UUID | Who requested and pays |
| `callee_id` | UUID | Who receives request |
| `status` | enum | See below |
| `points_cost` | int | 500 or 800 |
| `duration_minutes` | int | 5 or 10 |
| `room_id` | string | Agora/Daily room name |
| `started_at` | datetime | |
| `ended_at` | datetime | |
| `duration_seconds` | int | Actual call length |
| `created_at` | datetime | |

### Status values

| Status | Meaning |
|--------|---------|
| `pending` | Waiting for B to accept |
| `accepted` | B accepted, call not started yet |
| `active` | Call in progress |
| `completed` | Call finished normally |
| `rejected` | B said no — refund points to A |
| `cancelled` | A cancelled before B answered — refund |
| `missed` | B did not answer in 60 seconds — refund |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `POST` | `/video-calls/request` | Start a call request |
| `POST` | `/video-calls/:id/accept` | Callee accepts |
| `POST` | `/video-calls/:id/reject` | Callee rejects |
| `POST` | `/video-calls/:id/end` | Either user ends call |
| `GET` | `/video-calls/:id/token` | Get video room token |
| `GET` | `/video-calls/history` | Past calls for logged-in user |

### Request body example

```json
{
  "callee_id": "user-2",
  "duration_minutes": 5
}
```

### Flow step by step

1. A calls `POST /video-calls/request`
2. Server checks: A has 500+ points, B is mutual friend, B not blocked
3. Server deducts 500 points from A (hold — refund if rejected)
4. Server creates row with status `pending`
5. Server notifies B (push + socket)
6. B accepts → status `active`, server generates Agora/Daily token for both
7. Both users join video room in the app
8. After 5 minutes OR manual end → status `completed`
9. Award +100 points to both users for completing call

### Rules

- Only **mutual connections** can request a guided intro (not strangers)
- Caller pays, callee joins free
- Max **2 intros per day** per user
- Refund points if rejected, cancelled, or missed
- Auto-end call at time limit (server cron or Agora webhook)
- Notification and API copy must say **"guided video intro"**, never "match" or "date"

### Prompt categories (server can return or app uses static list)

Prompts must be **community and interest-based**, not romantic:

| Category | Example prompts |
|----------|-----------------|
| Circle / interests | "What circle are you most active in?" / "Share a hobby you're exploring" |
| Local community | "What's your favorite spot in your city?" / "Any local events you recommend?" |
| Goals & growth | "What are you learning right now?" / "What project are you proud of?" |
| Conversation | "What's something that made you smile this week?" |

**Do not use** prompts like love language, perfect date, relationship goals, or "describe your ideal partner."

### Agora setup (backend)

- Create Agora project at agora.io
- Store `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in server env
- Generate RTC token on server when call is accepted
- Token expires after call duration + 5 minutes

---

## 8. Location

### What it does

Users share their **city name** (not exact GPS) so they can see local posts and nearby people.

### No new table needed

Just use `city`, `country`, `location_opt_in` on the `users` table.

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `PUT` | `/profile/location` | Save city and opt-in |
| `GET` | `/discover/local` | **Local posts and active circles** in same city (not a people-browse endpoint) |

### `GET /discover/local` response shape

Prioritize **content and communities**, not profile cards:

```json
{
  "local_posts": [...],
  "active_circles": [...],
  "recent_circle_activity": [...]
}
```

Optional: include `active_members` only as avatars inside a circle card (max 5), not a standalone "browse people" list.

### Request body

```json
{
  "city": "Lahore",
  "country": "Pakistan",
  "location_opt_in": true
}
```

### Rules

- If `location_opt_in` is false, do not show city on posts or in discover
- Never store or return exact latitude/longitude in API responses
- Local feed only works if user opted in
- **Do not** return a paginated list of users sorted for romantic discovery
- Sort local posts by recency and circle engagement

---

## 9. Circles (Communities)

### What it does

**Circles are the primary discovery surface.** Topic groups like "Fitness", "Food Lovers", "Book Club". Users join circles, read posts inside them, and meet people through shared interests — not through a swipe or match flow.

### Database: `circles`

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | string |
| `slug` | string | URL-friendly name |
| `description` | text |
| `icon_url` | string |
| `member_count` | int |
| `created_at` | datetime |

### Database: `circle_members`

| Field | Type |
|-------|------|
| `circle_id` | UUID |
| `user_id` | UUID |
| `role` | enum | `member` or `admin` |
| `joined_at` | datetime |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `GET` | `/circles` | List all circles (featured first) |
| `GET` | `/circles/featured` | Top circles for home/discover |
| `GET` | `/circles/:id` | Circle details + member count |
| `POST` | `/circles/:id/join` | Join a circle |
| `DELETE` | `/circles/:id/leave` | Leave a circle |
| `GET` | `/circles/:id/posts` | Posts in this circle |
| `GET` | `/circles/:id/members` | Members (for circle detail only — not global browse) |

### Seed data (create on server — required for App Review)

Start with 5–10 circles, each with **at least 3 seed posts** from demo accounts:

- Fitness & Health
- Food & Cooking
- Books & Reading
- Travel
- Faith & Values
- Music & Arts
- Career & Growth

Seed posts should look like real community content (tips, questions, photos) — not dating profiles.

### Rules

- Award +30 points on first join per circle
- Award +40 points for posting in a circle (max 2/day)
- User must be a member to post in a circle
- Feed default for new users: **posts from joined circles** before global "all" feed

---

## 10. Social Graph (Follow / Connections)

### What it does

Keep the existing follow system. Rename "match" language everywhere in API responses:

- **Follow** = see their posts in your feed
- **Mutual follow** = **connection** (can chat and request guided video intro)

### Endpoints

| Method | URL | Notes |
|--------|-----|-------|
| `POST` | `/follows/:id` | Send follow request |
| `GET` | `/follows/pending` | Pending requests |
| `POST` | `/follows/:id/accept` | Accept request |
| `DELETE` | `/follows/:id` | Unfollow / cancel |
| `GET` | `/follows/connections` | **New name** — list mutual connections |

### Deprecate old endpoint

| Old | New |
|-----|-----|
| `GET /follows/matches` | `GET /follows/connections` |

Keep `/follows/matches` as an alias for 30 days if needed, but mobile app must call `/follows/connections` only.

### New rules

- When follow becomes mutual → award +50 points to both users (once per pair)
- **No** endpoint that ranks users by compatibility, relationship goals, or gender preference
- **No** "who liked your profile" discovery API — profile likes are legacy only

---

## 11. Chat (Keep Existing)

### What it does

Real-time text chat stays the same. No changes needed for version 1.

### Optional small update

- Only allow chat between **connections** (mutual follow)
- Block chat if either user blocked the other
- Chat is secondary to posts and circles — no changes to message schema needed

Existing socket events and message APIs stay as they are.

---

## 12. Notifications

### What it does

Send push notifications (FCM) and socket events for new social activity.

### New notification types

| Type | When | Message example |
|------|------|-----------------|
| `post_liked` | Someone liked your post | "Sara liked your post" |
| `post_commented` | Someone commented | "Ali commented on your post" |
| `points_earned` | Big point milestone | "You earned 150 points!" |
| `video_call_request` | Incoming intro request | "Sara wants a guided video intro" |
| `video_call_accepted` | Intro accepted | "Ali accepted your video intro" |
| `video_call_rejected` | Intro rejected | "Ali declined your video intro" |
| `mutual_follow` | New connection | "You and Sara are now connected!" |
| `circle_join` | Welcome to circle | "Welcome to Fitness circle!" |

### Socket events (real-time)

| Event name | Payload |
|------------|---------|
| `post_liked` | `{ post_id, user_id, user_name }` |
| `post_commented` | `{ post_id, comment_id, user_id }` |
| `video_call_request` | `{ call_id, caller_id, caller_name }` |
| `video_call_accepted` | `{ call_id, token }` |
| `points_updated` | `{ balance }` |

Keep existing chat socket events.

---

## 13. Safety (Block & Report)

### Block

### Database: `user_blocks`

| Field | Type |
|-------|------|
| `blocker_id` | UUID |
| `blocked_id` | UUID |
| `created_at` | datetime |

### API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| `POST` | `/users/:id/block` | Block a user |
| `DELETE` | `/users/:id/block` | Unblock |
| `GET` | `/users/blocked` | List blocked users |

### Rules when blocked

- Blocked user's posts hidden from feed
- Cannot send follow request, chat, or guided video intro
- Cannot like or comment on each other's posts

### Report

Keep existing `reportUser` endpoint. Post and comment reports are defined in [Content Moderation](#15-content-moderation).

---

## 14. Auth, Profile & Onboarding

### Keep all existing auth

- Login, register, forgot password, refresh token — no changes

### New community onboarding API

Replace dating wizard payload with community-focused fields.

| Method | URL | What it does |
|--------|-----|------------|
| `POST` | `/onboarding/community` | Save new onboarding answers |
| `GET` | `/onboarding/status` | Returns `completed`, `suggested_circles` |

### `POST /onboarding/community` body

```json
{
  "interests": ["Hiking", "Cooking"],
  "conversation_style": "Quality Time",
  "humor_type": "Witty",
  "city": "Lahore",
  "country": "Pakistan",
  "location_opt_in": true,
  "suggested_circle_ids": ["circle-fitness", "circle-food"]
}
```

**Do not accept** in new onboarding: `seeking_relation`, `interested_in`, `relationship_goals`, `date_you_reason`, partner qualities.

### Profile API response (public)

```json
{
  "id": "user-1",
  "full_name": "Sara",
  "profile_picture": "https://...",
  "city": "Lahore",
  "country": "Pakistan",
  "location_opt_in": true,
  "points_balance": 350,
  "interests": ["Hiking", "Photography"],
  "conversation_style": "Quality Time",
  "humor_type": "Witty",
  "post_count": 5,
  "circles": [
    { "id": "...", "name": "Fitness & Health" }
  ],
  "connection_status": "none | pending | following | connected"
}
```

**Never return** in profile or feed APIs: `seeking_relation`, `interested_in`, `relationship_goals`, `date_you_reason`, partner qualities, profile-like counts as a discovery signal.

### Legacy users

- Existing dating wizard data stays in DB but is **hidden** from all client responses
- On next app open, prompt user to complete **community onboarding** (one time)

---

## 15. Content Moderation

Community apps with user posts **must** have moderation. Required for Apple review confidence.

### Database: `content_reports`

| Field | Type |
|-------|------|
| `id` | UUID |
| `reporter_id` | UUID |
| `target_type` | enum | `post`, `comment`, `user` |
| `target_id` | UUID |
| `reason` | enum | `spam`, `harassment`, `inappropriate`, `other` |
| `details` | text (optional) |
| `status` | enum | `open`, `reviewed`, `action_taken`, `dismissed` |
| `created_at` | datetime |

### Database: `moderation_actions`

| Field | Type |
|-------|------|
| `id` | UUID |
| `report_id` | UUID |
| `moderator_id` | UUID |
| `action` | enum | `hide_content`, `warn_user`, `suspend_user`, `dismiss` |
| `created_at` | datetime |

### API Endpoints

| Method | URL | Who |
|--------|-----|-----|
| `POST` | `/posts/:id/report` | Any logged-in user |
| `POST` | `/comments/:id/report` | Any logged-in user |
| `POST` | `/users/:id/report` | Existing — keep |
| `GET` | `/admin/reports` | Admin only |
| `POST` | `/admin/reports/:id/action` | Admin only |

### Auto-moderation rules (v1)

- New posts with blocked words list → flag for review (do not hard-block yet)
- Posts from reported users (3+ open reports) → hide from public feed until reviewed
- Soft-deleted posts/comments stay hidden; do not return in feed

### Admin

- Simple admin auth (existing or env-based admin user IDs)
- Email or dashboard alert when report count > 0 (optional v1)

---

## 16. Demo Account & Seed Data

Apple reviewers need a **working demo** with visible community content on first login.

### Demo account

Create a fixed reviewer account:

| Field | Value |
|-------|-------|
| Email | `review@anchorheart.app` (or your chosen address) |
| Password | Set a strong password — put in App Store Review Notes only |
| Points balance | **600** (enough to test guided video intro) |
| Joined circles | At least 3 |
| Own posts | At least 2 |
| Connections | 1 other demo user for chat + video intro test |

### Seed script

Create `scripts/seed-community.ts` (or SQL migration) that:

1. Creates 8–10 demo users with community profiles (no dating fields in display data)
2. Creates all circles with icons and descriptions
3. Adds 3+ posts per circle from different demo users
4. Pre-connects demo reviewer with one other demo user
5. Adds sample point transactions on demo account

Run seed on staging and production before resubmission.

---

## 17. What NOT to Build

- No subscription plans
- No in-app purchases (for now)
- No payment / Stripe
- No swipe/match algorithm API
- No "browse singles" or compatibility ranking API
- No profile-like discovery feed
- No exact GPS tracking API
- No group video calls (version 2)
- No stories (24-hour posts)
- **Do not** expose dating onboarding fields in any new API

---

## 18. Build Order

Build in this order. Each step unlocks the next.

| Step | What to build | Why first |
|------|---------------|-----------|
| 1 | Hide dating fields from profile APIs | Stops dating signals immediately |
| 2 | `user_points` + `point_transactions` + award helper | Core differentiator |
| 3 | `circles` + seed data + join/leave | Primary discovery |
| 4 | `posts` CRUD + feed API (circle-first default) | Core content |
| 5 | `post_likes` + `post_comments` | Engagement |
| 6 | Community onboarding API | Replaces dating wizard |
| 7 | Location fields + local posts discover | Secondary discovery |
| 8 | `video_calls` + Agora token API | Flagship spend flow |
| 9 | Rename `/follows/connections` + connection rules | Social graph cleanup |
| 10 | `user_blocks` + `content_reports` + moderation | Safety for UGC |
| 11 | Demo account seed script | App Review ready |
| 12 | New notification types + socket events | Polish |

### Testing checklist

- [ ] Profile API does **not** return dating fields
- [ ] Community onboarding saves interests + circles only
- [ ] Create post → points added
- [ ] Circle join → points + feed shows circle posts
- [ ] Like post → owner gets points + notification
- [ ] Comment → both users get points
- [ ] Balance cannot go negative
- [ ] Guided video intro deducts 500, refunds on reject
- [ ] Video token works in Agora
- [ ] Blocked user hidden everywhere
- [ ] Report post creates `content_reports` row
- [ ] Demo account has posts, circles, 600 points, 1 connection
- [ ] `/discover/local` returns posts/circles — not a people-browse list

---

## 19. App Store Resubmission (Backend)

Provide this to the mobile team for **App Store Review Notes**:

### Review notes template

```
Anchor Heart v2 is a topic-based community app (not a dating app).

Demo login:
Email: review@anchorheart.app
Password: [provided separately]

What to test:
1. Open app → Feed shows community posts (not swipe profiles)
2. Tap Circles → join "Fitness & Health" → earn points
3. Create a post → earn Anchor Points
4. Open Points wallet → balance visible
5. Open Connections → message or request "Guided Video Intro" (600 points pre-loaded)

Unique features vs. standard social apps:
- Topic Circles as primary discovery
- Anchor Points earned through community activity
- Guided video introductions with conversation prompts (mutual connections only)

We removed dating onboarding, swipe browsing, and compatibility matching.
```

### Backend checklist before resubmit

- [ ] Seed data live on production API
- [ ] Demo account works end-to-end
- [ ] No dating fields in any API response
- [ ] `/follows/matches` replaced or aliased to `/follows/connections`

---

## Environment Variables (Server)

```env
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
FCM_SERVER_KEY=existing
DATABASE_URL=existing
```

---

*Last updated: June 2026 — Anchor Heart community pivot (4.3(b) resubmission)*
