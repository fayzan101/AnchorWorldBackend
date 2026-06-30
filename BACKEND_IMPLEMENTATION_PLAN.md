# Anchor Heart — Backend Implementation Plan

Phased rollout for the community pivot ([BACKEND_PLAN.md](./BACKEND_PLAN.md)), mapped to the **existing** Express + TypeORM codebase in `backend/`.

**Current stack:** Express 4, TypeORM 0.3, MySQL, Socket.IO, Firebase FCM  
**Entry:** `backend/src/server.ts`  
**Pattern:** `routes → controllers → services → repositories → entities`

---

## Current State (What Exists Today)

| Area | Status | Key files |
|------|--------|-----------|
| Auth (JWT + refresh) | Done | `auth.routes.ts`, `auth.service.ts` |
| Profile CRUD + picture | Done | `profile.routes.ts`, `user.service.ts` |
| User list / discovery | Done (dating-shaped) | `GET /api/users`, `user.repository.ts` |
| Follow / mutual friends | Done | `follow.routes.ts`, `follow.service.ts` |
| Profile likes | Done | `like.routes.ts`, `like.service.ts` |
| Chat REST + Socket.IO | Done | `message.routes.ts`, `socket.handler.ts` |
| Notifications (FCM) | Partial | `notification.service.ts` — 4 types only |
| User report counter | Minimal | `PUT /api/users/:userId` increments `report_count` |
| Posts, Points, Circles, Video, Blocks, Moderation | **Not built** | — |

### Existing endpoints (unchanged unless noted below)

```
POST   /api/auth/register | login | refresh-token | forgot-password | reset-password | logout
GET    /api/profile
PUT    /api/profile
POST   /api/profile/picture
GET    /api/users
GET    /api/users/:userId
PUT    /api/users/:userId          ← report user (legacy)
POST   /api/follows/:userId
PUT    /api/follows/:followId/accept
DELETE /api/follows/:followId
GET    /api/follows/pending
GET    /api/follows/matches        ← rename in Phase 1
GET    /api/messages/...
POST   /api/likes/:userId          ← legacy profile likes
GET    /api/notifications/...
GET    /api/hobbies
GET    /api/relationship-goals     ← deprecate from mobile, keep for now
GET    /api/partner-qualities      ← deprecate from mobile, keep for now
```

---

## Phase Overview

| Phase | Focus | New APIs | Existing API changes |
|-------|--------|----------|----------------------|
| **0** | Foundation + dating field removal | Shared DTO mapper | Profile, users, validation |
| **1** | Anchor Points | 2 | Login hook, follow accept |
| **2** | Circles | 7 | — |
| **3** | Posts + feed | 9 | Upload middleware |
| **4** | Community onboarding + location | 4 | Profile update rules |
| **5** | Connections + chat hardening | 1 alias | Follows, messages, user list |
| **6** | Guided video intros | 6 | Points spend/refund |
| **7** | Blocks + moderation | 7 | Feed/post/chat filters |
| **8** | Notifications + sockets | — | `notification.service.ts`, `socket.handler.ts` |
| **9** | Seed data + App Review | Admin seed script | — |

**Estimated new files per layer (all phases):**

- **Entities:** 10 new (`Post`, `PostLike`, `PostComment`, `UserPoints`, `PointTransaction`, `Circle`, `CircleMember`, `VideoCall`, `UserBlock`, `ContentReport`, `ModerationAction`)
- **Routes:** `points`, `circles`, `posts`, `onboarding`, `discover`, `video-calls`, `blocks`, `admin` (+ comment sub-routes on posts)
- **Register in** `server.ts` after each phase

---

## Phase 0 — Foundation & Stop Dating Signals

**Goal:** Apple can no longer read dating data from profile/user APIs. No new product features yet.

### 0.1 New shared utility

| File | Purpose |
|------|---------|
| `src/utils/user-response.mapper.ts` | Single `toPublicUser(user, options)` — strips dating fields, maps `love_language` → `conversation_style`, `hobbies` → `interests[]` |
| `src/types/community.types.ts` | `PublicUser`, `ConnectionStatus`, community profile DTOs |

### 0.2 Entity changes (`User.entity.ts`)

Add columns:

```ts
city: string | null
country: string | null
location_opt_in: boolean (default false)
onboarding_completed_at: Date | null
intro_video_url: string | null
```

**Migration:** Add `src/migrations/XXXX-add-community-user-fields.ts` — do not rely on `synchronize` in production.

Register new entities in `src/config/database.ts` as they are added in later phases.

### 0.3 Changes to existing APIs

| Endpoint | File(s) | Change |
|----------|---------|--------|
| `GET /api/profile` | `user.service.ts` → `getProfile` | Return community shape only: `interests`, `conversation_style`, `humor_type`, `city`, `country`, `location_opt_in`, `points_balance` (0 until Phase 1), `post_count` (0), `circles` ([]). **Remove:** `seeking_relation`, `interested_in`, `relationship_goals`, `partner_qualities`, `date_you_reason`, `have_kids`, `kids`, `height` from response |
| `PUT /api/profile` | `user.service.ts` → `updateProfile` | Stop accepting dating fields in v2 body; keep backward compat by ignoring unknown dating keys with deprecation log. Prefer new onboarding endpoint for interests |
| `GET /api/users/:userId` | `user.service.ts` → `getUserById` | Same public mapper + `connection_status` vs viewer |
| `GET /api/users` | `user.service.ts` + `user.repository.ts` | Remove from list response: `seeking_relation`, `interested_in`, `looking_for`, `their_qualities`, `total_likes` as discovery signal. Rename `relationship_status: "friends"` → `"connected"` in JSON |
| `PUT /api/users/:userId` | `user.controller.ts` | Keep report behavior; document as legacy until Phase 7 |

### 0.4 Validation

| File | Change |
|------|--------|
| `validation.util.ts` | Add `validateCommunityProfileUpdate`; stop requiring `seeking_relation` / `relationship_goals` for new clients |

### 0.5 Deprecate reference routes (soft)

| Endpoint | Action |
|----------|--------|
| `GET /api/relationship-goals` | Keep live; add `X-Deprecated: true` header |
| `GET /api/partner-qualities` | Same |
| `GET /api/hobbies` | Keep — used for interests |

### Phase 0 exit criteria

- [ ] No dating fields in `GET /api/profile` or `GET /api/users/:id`
- [ ] User list no longer returns `total_likes` / relationship goals
- [ ] Migration applied for new user columns

---

## Phase 1 — Anchor Points

**Goal:** Server-side wallet + helpers used by all later features.

### 1.1 New entities

| Entity | Table |
|--------|-------|
| `UserPoints` | `user_points` |
| `PointTransaction` | `point_transactions` |

### 1.2 New files

```
src/entities/UserPoints.entity.ts
src/entities/PointTransaction.entity.ts
src/repositories/points.repository.ts
src/services/points.service.ts      ← awardPoints(), spendPoints(), getDailyEarned()
src/controllers/points.controller.ts
src/routes/points.routes.ts
```

### 1.3 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/points/balance` | `{ balance, lifetime_earned }` |
| `GET` | `/api/points/transactions?page&limit` | Paginated history |

### 1.4 `points.service.ts` internals

- `awardPoints(userId, amount, type, referenceId?, description?)` — row lock on `user_points`
- `spendPoints(...)` — fail with `402` if insufficient balance
- `getDailyEarned(userId, type)` — enforce daily caps from BACKEND_PLAN
- Point type constants: `profile_complete`, `first_post`, `post_created`, `post_liked_received`, `comment_created`, `comment_received`, `connection_made`, `circle_joined`, `circle_post`, `daily_login`, `video_intro_completed`, `video_intro_spent`, `video_intro_refund`

### 1.5 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `POST /api/auth/login` | After successful login → `awardPoints(userId, 10, 'daily_login')` if not already today |
| `PUT /api/profile` | On first `profile_completed` → `+100` once |
| `GET /api/profile` | Include `points_balance` from `user_points` |

### 1.6 Register route

`server.ts`: `app.use(\`${apiPrefix}/points\`, pointsRoutes)`

### Phase 1 exit criteria

- [ ] Balance never goes negative under concurrent spend
- [ ] Every award/spend creates `point_transactions` row
- [ ] Daily login awards once per calendar day

---

## Phase 2 — Circles

**Goal:** Primary discovery surface + seed content container.

### 2.1 New entities

| Entity | Table |
|--------|-------|
| `Circle` | `circles` |
| `CircleMember` | `circle_members` |

### 2.2 New files

```
src/entities/Circle.entity.ts
src/entities/CircleMember.entity.ts
src/repositories/circle.repository.ts
src/services/circle.service.ts
src/controllers/circle.controller.ts
src/routes/circle.routes.ts
src/scripts/seed-circles.ts          ← 7 circles (Phase 9 expands)
```

### 2.3 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/circles` | All circles, featured first; include `is_joined`, `member_count` |
| `GET` | `/api/circles/featured` | Top 5 for discover/home |
| `GET` | `/api/circles/:id` | Detail + `is_joined` |
| `POST` | `/api/circles/:id/join` | Join → `+30` points once per circle |
| `DELETE` | `/api/circles/:id/leave` | Leave |
| `GET` | `/api/circles/:id/members?page&limit` | Members for circle detail only |
| `GET` | `/api/circles/:id/posts` | Delegates to post feed (Phase 3) — stub until then |

**Route order:** Register `GET /featured` **before** `GET /:id` in `circle.routes.ts`.

### 2.4 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `GET /api/profile` | Include `circles: [{ id, name }]` for joined circles |
| `GET /api/users/:userId` | Include public `circles` list |

### Phase 2 exit criteria

- [ ] 7 seed circles exist
- [ ] Join awards points once per user per circle
- [ ] Non-member cannot post in circle (enforced in Phase 3)

---

## Phase 3 — Posts, Feed, Likes, Comments

**Goal:** UGC core + engagement points.

### 3.1 New entities

| Entity | Table |
|--------|-------|
| `Post` | `posts` |
| `PostLike` | `post_likes` |
| `PostComment` | `post_comments` |

### 3.2 New files

```
src/entities/Post.entity.ts
src/entities/PostLike.entity.ts
src/entities/PostComment.entity.ts
src/repositories/post.repository.ts
src/repositories/post-like.repository.ts
src/repositories/post-comment.repository.ts
src/services/post.service.ts
src/controllers/post.controller.ts
src/routes/post.routes.ts
src/middleware/post-upload.middleware.ts   ← image 5MB, video 20MB
```

### 3.3 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/posts/feed?filter&page&limit&circle_id` | `filter`: `circles` (default), `following`, `local`, `all` |
| `GET` | `/api/posts/:id` | Single post + `is_liked_by_me` |
| `POST` | `/api/posts` | Create (multipart: `content`, `media`, `circle_id?`) |
| `DELETE` | `/api/posts/:id` | Soft delete own post |
| `GET` | `/api/users/:userId/posts` | User's posts grid |
| `POST` | `/api/posts/:id/like` | Like → owner `+5` (cap 50/day) |
| `DELETE` | `/api/posts/:id/like` | Unlike |
| `GET` | `/api/posts/:id/comments` | Paginated comments |
| `POST` | `/api/posts/:id/comments` | Create → commenter `+15`, owner `+10` |
| `DELETE` | `/api/comments/:id` | Soft delete own comment |

**Route order:** `GET /feed` before `GET /:id`.

### 3.4 Feed rules (`post.service.ts`)

- Default `filter=circles` → posts where `circle_id IN (user's joined circles)`
- `filter=local` → requires `location_opt_in`; match `posts.city` to viewer's `city`
- `filter=following` → posts from accepted follows
- Exclude posts from blocked users (no-op until Phase 7, add hook now)
- On create: copy `city`/`country` from user if `location_opt_in`
- Points: `+25` post (max 3/day), `+150` first post ever, `+40` circle post (max 2/day)
- Circle post requires membership

### 3.5 Wire circle posts endpoint

`GET /api/circles/:id/posts` → call `postService.getCirclePosts(circleId, userId, page)`

### 3.6 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `GET /api/profile` | `post_count` from DB |
| `POST /api/profile/picture` | Unchanged |
| Upload static | Store post media under `uploads/posts/` |

### Phase 3 exit criteria

- [ ] Feed defaults to joined circles
- [ ] Like/comment points respect daily caps
- [ ] Post response uses `toPublicUser` mapper
- [ ] `GET /api/circles/:id/posts` works

---

## Phase 4 — Community Onboarding & Location

**Goal:** Replace dating wizard API; city-based discover without people browse.

### 4.1 New files

```
src/services/onboarding.service.ts
src/controllers/onboarding.controller.ts
src/routes/onboarding.routes.ts
src/controllers/discover.controller.ts
src/routes/discover.routes.ts
```

### 4.2 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/onboarding/community` | Save interests, conversation_style, humor_type, city, join circles |
| `GET` | `/api/onboarding/status` | `{ completed, suggested_circles }` |
| `PUT` | `/api/profile/location` | `{ city, country, location_opt_in }` |
| `GET` | `/api/discover/local` | `{ local_posts, active_circles, recent_circle_activity }` |

### 4.3 `POST /api/onboarding/community` behavior

1. Update user: hobbies (from `interests` ids or names), `humor_type`, `conversation_style` (maps to `love_language` column), `city`, `country`, `location_opt_in`
2. Join `suggested_circle_ids` (min 2)
3. Set `onboarding_completed_at = now()`, `profile_completed = true`
4. Award onboarding points if first time
5. **Reject** body fields: `seeking_relation`, `interested_in`, `relationship_goals`, `date_you_reason`, `partner_qualities`

### 4.4 `GET /api/discover/local` behavior

- Requires viewer `location_opt_in` and `city` set; else `400` or empty arrays
- `local_posts` — recent posts where `posts.city = user.city`
- `active_circles` — circles with most posts/members in that city
- `recent_circle_activity` — latest posts grouped by circle
- **Do not** return standalone user browse list

### 4.5 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `PUT /api/profile` | Do not set `profile_completed` from dating fields; direct clients to `/onboarding/community` |
| `GET /api/users` | Optional: deprioritize or add query flag `?purpose=search` only (name search), remove gender filter from default discover |

### Phase 4 exit criteria

- [ ] New user can complete onboarding without dating fields
- [ ] `/discover/local` returns posts + circles only
- [ ] Location opt-out hides city on posts

---

## Phase 5 — Connections, Follows & Chat Hardening

**Goal:** Rename match language; enforce connection-only chat; connection points.

### 5.1 Changes to existing APIs

| Endpoint | File | Change |
|----------|------|--------|
| `GET /api/follows/connections` | `follow.routes.ts`, `follow.controller.ts` | **New** — same handler as `getMatches`, response key `connections` not `matches` |
| `GET /api/follows/matches` | `follow.routes.ts` | Keep as alias → calls same service, add deprecation header |
| `POST /api/follows/:userId` | `follow.service.ts` | Check `user_blocks` (Phase 7 stub OK); on mutual → `awardPoints` `+50` both, once per pair (track via `point_transactions` type `connection_made`) |
| `PUT /api/follows/:followId/accept` | `follow.service.ts` | Same connection points when mutual created |
| Notification copy | `notification.service.ts` | "friend" → "connection" in titles where applicable |
| `GET /api/users` | `user.repository.ts` | `relationship_status` values: `none`, `pending_sent`, `pending_received`, `connected` |
| `POST /api/messages/:userId` | `message.service.ts` | Already mutual-follow gated — verify + add block check |
| Socket `send_message` | `socket.handler.ts` | Reject if not mutual connection or blocked |

### 5.2 Profile connection status

`GET /api/users/:userId` adds `connection_status` for viewer: `none | pending | following | connected`

### 5.3 Legacy profile likes

| Endpoint | Action |
|----------|--------|
| `POST/DELETE /api/likes/:userId` | **Keep** for backward compat; do not add notifications; document deprecated |
| `GET /api/likes/*` | Keep; mobile will remove |

### Phase 5 exit criteria

- [ ] `/follows/connections` returns mutual follows
- [ ] Mutual follow awards +50 once per pair
- [ ] Chat blocked between non-connections

---

## Phase 6 — Guided Video Intros (Agora)

**Goal:** Points spend flow + Agora tokens.

### 6.1 New entity

`VideoCall` → `video_calls`

### 6.2 New files

```
src/entities/VideoCall.entity.ts
src/repositories/video-call.repository.ts
src/services/video-call.service.ts
src/services/agora.service.ts           ← RTC token generation
src/controllers/video-call.controller.ts
src/routes/video-call.routes.ts
```

### 6.3 Env vars

```
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
```

### 6.4 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/video-calls/request` | Body: `{ callee_id, duration_minutes: 5\|10 }` — spend 500/800 |
| `POST` | `/api/video-calls/:id/accept` | Callee accepts → status `active`, generate tokens |
| `POST` | `/api/video-calls/:id/reject` | Refund caller |
| `POST` | `/api/video-calls/:id/cancel` | Caller cancel before answer → refund |
| `POST` | `/api/video-calls/:id/end` | End call → `completed`, award +100 both if duration > 30s |
| `GET` | `/api/video-calls/:id/token` | Agora RTC token for caller/callee |
| `GET` | `/api/video-calls/history` | Past intros for user |

### 6.5 Business rules

- Caller must be mutual connection with callee
- Neither blocked (Phase 7)
- Max 2 intro requests per user per day
- `pending` expires after 60s → `missed` + refund (cron or `setTimeout` job)
- `points.service.spendPoints` on request; `awardPoints` refund on reject/cancel/miss

### 6.6 Changes to existing APIs

None required beyond points integration.

### Phase 6 exit criteria

- [ ] 500 points deducted on request, refunded on reject
- [ ] Agora token works for both participants
- [ ] +100 completion points for both users

---

## Phase 7 — Blocks & Content Moderation

**Goal:** Safety for UGC + enforce across all modules.

### 7.1 New entities

| Entity | Table |
|--------|-------|
| `UserBlock` | `user_blocks` |
| `ContentReport` | `content_reports` |
| `ModerationAction` | `moderation_actions` |

### 7.2 New files

```
src/entities/UserBlock.entity.ts
src/entities/ContentReport.entity.ts
src/entities/ModerationAction.entity.ts
src/repositories/block.repository.ts
src/repositories/content-report.repository.ts
src/services/block.service.ts
src/services/moderation.service.ts
src/controllers/block.controller.ts
src/controllers/moderation.controller.ts
src/routes/block.routes.ts
src/routes/admin.routes.ts
src/middleware/admin.middleware.ts     ← check ADMIN_USER_IDS env
```

### 7.3 New APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users/:id/block` | Block user |
| `DELETE` | `/api/users/:id/block` | Unblock |
| `GET` | `/api/users/blocked` | List blocked |
| `POST` | `/api/posts/:id/report` | Report post |
| `POST` | `/api/comments/:id/report` | Report comment |
| `GET` | `/api/admin/reports?status=open` | Admin list |
| `POST` | `/api/admin/reports/:id/action` | `{ action: hide_content\|dismiss\|... }` |

### 7.4 Enforce blocks in existing services

| Service | Filter |
|---------|--------|
| `post.service.ts` | Exclude blocked users from feed; deny like/comment |
| `follow.service.ts` | Deny follow if blocked |
| `message.service.ts` | Deny send if blocked |
| `video-call.service.ts` | Deny request if blocked |
| `user.service.ts` | Hide blocked from `GET /api/users` |

### 7.5 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `PUT /api/users/:userId` (report) | Also create `content_reports` row `target_type=user`; keep `report_count` increment |

### Phase 7 exit criteria

- [ ] Blocked user invisible in feed and chat
- [ ] Post report creates moderation row
- [ ] Admin can dismiss or hide content

---

## Phase 8 — Notifications & Socket Events

**Goal:** Real-time + push for community activity.

### 8.1 Extend `NotificationType` enum (`notification.service.ts`)

Add:

```
post_liked
post_commented
points_earned
video_call_request
video_call_accepted
video_call_rejected
mutual_follow          ← rename usage to connection_made
circle_join
```

### 8.2 New notification methods

| Method | Trigger location |
|--------|------------------|
| `notifyPostLiked` | `post.service` like |
| `notifyPostCommented` | `post.service` comment |
| `notifyPointsMilestone` | `points.service` when balance crosses 500 |
| `notifyVideoIntroRequest` | `video-call.service` request |
| `notifyConnectionMade` | `follow.service` mutual |
| `notifyCircleJoin` | `circle.service` join |

### 8.3 Socket events (`socket.handler.ts`)

Emit to user rooms (pattern: `user:${userId}`):

| Event | Payload |
|-------|---------|
| `post_liked` | `{ post_id, user_id, user_name }` |
| `post_commented` | `{ post_id, comment_id, user_id }` |
| `video_call_request` | `{ call_id, caller_id, caller_name }` |
| `video_call_accepted` | `{ call_id }` |
| `points_updated` | `{ balance }` |

**Note:** Ensure clients join `user:${id}` room on socket connect (add to `socket.handler.ts` if missing).

### 8.4 Changes to existing APIs

| Endpoint | Change |
|----------|--------|
| `POST /api/notifications` | Ensure list returns new types with `data` payload for deep links |

### Phase 8 exit criteria

- [ ] Like triggers push + socket
- [ ] Video intro request high-priority FCM
- [ ] Points update socket on award

---

## Phase 9 — Seed Data & App Review

**Goal:** Demo account works for Apple reviewer on first login.

### 9.1 New script

`src/scripts/seed-community.ts`:

1. 8–10 demo users (community profiles)
2. 7 circles with descriptions/icons
3. 3+ posts per circle
4. Reviewer account `review@anchorheart.app` — 600 points, 3 circles, 2 posts, 1 connection
5. Sample `point_transactions` on reviewer account

### 9.2 package.json script

```json
"seed:community": "ts-node src/scripts/seed-community.ts"
```

### 9.3 Pre-production checklist

- [ ] Run seed on staging + production
- [ ] Verify `GET /api/posts/feed?filter=circles` non-empty for reviewer
- [ ] Verify guided intro E2E with demo connection
- [ ] All dating fields absent from API responses

---

## `server.ts` Registration Order (cumulative)

Add after Phase completion:

```ts
import pointsRoutes from "./routes/points.routes";
import circleRoutes from "./routes/circle.routes";
import postRoutes from "./routes/post.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import discoverRoutes from "./routes/discover.routes";
import videoCallRoutes from "./routes/video-call.routes";
import blockRoutes from "./routes/block.routes";
import adminRoutes from "./routes/admin.routes";

app.use(`${apiPrefix}/points`, pointsRoutes);
app.use(`${apiPrefix}/circles`, circleRoutes);
app.use(`${apiPrefix}/posts`, postRoutes);
app.use(`${apiPrefix}/onboarding`, onboardingRoutes);
app.use(`${apiPrefix}/discover`, discoverRoutes);
app.use(`${apiPrefix}/video-calls`, videoCallRoutes);
app.use(`${apiPrefix}`, blockRoutes);        // /users/:id/block
app.use(`${apiPrefix}/admin`, adminRoutes);
```

**Note:** `GET /api/users/:userId/posts` can live on `user.routes.ts` or `post.routes.ts` — pick one and stay consistent.

---

## Database Migration Strategy

Today: `synchronize: true` in dev only (`database.ts`).

**Required before production deploy:**

1. Create `src/migrations/` folder
2. One migration per phase (or combined 001–009)
3. Set `synchronize: false` in production
4. Run migrations in CI/CD before server start

Suggested migration files:

```
src/migrations/001-community-user-fields.ts
src/migrations/002-points-tables.ts
src/migrations/003-circles-tables.ts
src/migrations/004-posts-tables.ts
src/migrations/005-video-calls-table.ts
src/migrations/006-blocks-moderation-tables.ts
```

---

## API Summary — All New Endpoints

| Phase | Method | Path |
|-------|--------|------|
| 1 | GET | `/api/points/balance` |
| 1 | GET | `/api/points/transactions` |
| 2 | GET | `/api/circles` |
| 2 | GET | `/api/circles/featured` |
| 2 | GET | `/api/circles/:id` |
| 2 | POST | `/api/circles/:id/join` |
| 2 | DELETE | `/api/circles/:id/leave` |
| 2 | GET | `/api/circles/:id/members` |
| 2 | GET | `/api/circles/:id/posts` |
| 3 | GET | `/api/posts/feed` |
| 3 | GET | `/api/posts/:id` |
| 3 | POST | `/api/posts` |
| 3 | DELETE | `/api/posts/:id` |
| 3 | GET | `/api/users/:userId/posts` |
| 3 | POST | `/api/posts/:id/like` |
| 3 | DELETE | `/api/posts/:id/like` |
| 3 | GET | `/api/posts/:id/comments` |
| 3 | POST | `/api/posts/:id/comments` |
| 3 | DELETE | `/api/comments/:id` |
| 4 | POST | `/api/onboarding/community` |
| 4 | GET | `/api/onboarding/status` |
| 4 | PUT | `/api/profile/location` |
| 4 | GET | `/api/discover/local` |
| 5 | GET | `/api/follows/connections` |
| 6 | POST | `/api/video-calls/request` |
| 6 | POST | `/api/video-calls/:id/accept` |
| 6 | POST | `/api/video-calls/:id/reject` |
| 6 | POST | `/api/video-calls/:id/cancel` |
| 6 | POST | `/api/video-calls/:id/end` |
| 6 | GET | `/api/video-calls/:id/token` |
| 6 | GET | `/api/video-calls/history` |
| 7 | POST | `/api/users/:id/block` |
| 7 | DELETE | `/api/users/:id/block` |
| 7 | GET | `/api/users/blocked` |
| 7 | POST | `/api/posts/:id/report` |
| 7 | POST | `/api/comments/:id/report` |
| 7 | GET | `/api/admin/reports` |
| 7 | POST | `/api/admin/reports/:id/action` |

---

## Existing API Change Summary

| Endpoint | Phase | Summary |
|----------|-------|---------|
| `GET /api/profile` | 0,1,2,3 | Community shape, points, circles, post_count |
| `PUT /api/profile` | 0,4 | Stop dating fields; defer to onboarding |
| `GET /api/users/:userId` | 0,5 | Public mapper, connection_status, circles |
| `GET /api/users` | 0,5 | Remove dating discovery fields |
| `POST /api/auth/login` | 1 | Daily login points |
| `GET /api/follows/matches` | 5 | Deprecated alias |
| `GET /api/follows/connections` | 5 | New canonical endpoint |
| `POST /api/follows/:userId` | 5,7 | Connection points, block check |
| `PUT /api/follows/:followId/accept` | 5 | Connection points |
| `POST /api/messages/:userId` | 5,7 | Block check |
| Socket chat | 5,7,8 | Block + new events |
| `PUT /api/users/:userId` | 7 | Report → content_reports |
| `GET /api/relationship-goals` | 0 | Deprecated header |
| `GET /api/partner-qualities` | 0 | Deprecated header |
| Profile likes ` /api/likes/*` | 5 | Deprecated, kept for compat |

---

## Recommended Build Sequence (sprints)

| Sprint | Phases | Deliverable |
|--------|--------|-------------|
| Sprint 1 | 0 + 1 | No dating in API + points wallet |
| Sprint 2 | 2 + 3 | Circles + posts feed (MVP community) |
| Sprint 3 | 4 + 5 | Onboarding + connections rename |
| Sprint 4 | 6 | Guided video intros |
| Sprint 5 | 7 + 8 + 9 | Safety, notifications, seed for App Review |

---

## Dependencies Between Phases

```
Phase 0 (mapper + user columns)
    ↓
Phase 1 (points) ─────────────────────────────┐
    ↓                                          │
Phase 2 (circles)                              │
    ↓                                          │
Phase 3 (posts) ← needs points + circles       │
    ↓                                          │
Phase 4 (onboarding + discover) ← needs circles + posts
    ↓
Phase 5 (connections) ← needs points
    ↓
Phase 6 (video) ← needs points + connections
    ↓
Phase 7 (blocks) ← needs posts + chat + video
    ↓
Phase 8 (notifications) ← wire into 3,5,6
    ↓
Phase 9 (seed)
```

---

*Last updated: June 2026 — derived from BACKEND_PLAN.md + `backend/src` codebase audit*
