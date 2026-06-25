# Anchor Backend — Deployment Guide

Production API: **https://app.anchorworld.org/api**  
Swagger: **https://app.anchorworld.org/api/docs**

This guide covers deploying Phases 0–3 (community profile, points, circles, posts) using **TypeORM migrations** (Option A).

You can deploy with **Docker** (recommended for consistency) or **PM2/systemd** (direct Node on the host).

---

## Choose a deploy method

| Method | Best for | Compose file |
|--------|----------|--------------|
| **Docker (API only)** | Production server with existing MySQL on host | `docker-compose.prod.yml` |
| **Docker (full stack)** | New server / staging (API + MySQL in Docker) | `docker-compose.full.yml` |
| **PM2 / systemd** | Current setup without Docker for the API | manual `npm run build` |

---

## Docker deployment (recommended)

### Option 1 — API container + host MySQL (your current production setup)

MySQL stays on the server (`127.0.0.1:3306`). Only the API runs in Docker.

**1. On the server, set in `.env`:**

```env
NODE_ENV=production
DB_HOST=host.docker.internal
DB_PORT=3306
# ... keep your existing DB_USERNAME, DB_PASSWORD, JWT secrets, etc.
RUN_SEED_ON_START=true
```

`host.docker.internal` lets the container reach MySQL on the host (Linux: via `extra_hosts` in compose).

**2. Stop PM2 if it is still running the old API** (avoid port 3000 conflict):

```bash
pm2 stop anchor-api
```

**3. Build and start:**

```bash
cd backend
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The container **automatically** runs migrations and seeds circles on start (`docker-entrypoint.sh`).

**4. Logs and health:**

```bash
docker compose -f docker-compose.prod.yml logs -f api
curl http://127.0.0.1:3000/health
```

**5. Redeploy after code changes:**

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Uploads persist in Docker volume `anchor_uploads`. For nginx to serve files from disk, bind-mount instead:

```yaml
# in docker-compose.prod.yml, replace the uploads volume with:
volumes:
  - ./uploads:/app/uploads
```

---

### Option 2 — Full stack (API + MySQL in Docker)

For a fresh server or staging environment.

```bash
cd backend
cp .env.docker.example .env    # edit secrets first
docker compose -f docker-compose.full.yml up -d --build
```

MySQL and API start together. `DB_HOST=mysql` is set automatically.

---

### Docker files reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (compile → slim production image) |
| `docker-entrypoint.sh` | Runs `migrate:prod` + seed, then starts server |
| `docker-compose.yml` | Local dev — **MySQL only** |
| `docker-compose.prod.yml` | Production API container |
| `docker-compose.full.yml` | API + MySQL |
| `.env.docker.example` | Template for full-stack `.env` |

### Docker NPM scripts

```bash
npm run docker:build      # build production image
npm run docker:up         # start API container (prod compose)
npm run docker:down       # stop API container
npm run docker:logs       # tail API logs
npm run docker:full:up    # full stack (API + MySQL)
```

### Docker troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED` to DB | Use `DB_HOST=host.docker.internal` (prod compose), not `127.0.0.1` |
| Port 3000 in use | Stop PM2: `pm2 stop anchor-api` |
| Uploads missing after recreate | Use bind mount `./uploads:/app/uploads` or backup volume |
| Skip seed on restart | Set `RUN_SEED_ON_START=false` in `.env` |

---

## PM2 / systemd deployment (without Docker)

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| Node.js 20+ | Same major version as local dev |
| MySQL 8 | Production DB (`anchor_db`) |
| `.env` on server | **Never** commit production secrets to git |
| Process manager | PM2 or systemd |
| nginx (optional) | Reverse proxy + `client_max_body_size 25M` for post videos |

---

## Local development (quick reference)

```bash
cd backend
docker compose up -d          # MySQL on port 3307 (see docker-compose.yml)
cp .env.example .env          # adjust DB_PORT=3307 if using Docker
npm install
npm run migrate               # apply migrations
npm run seed:circles          # seed 7 circles
npm run dev
```

Local API: `http://localhost:3000/api/docs`

---

## Production deploy checklist

Run these on the **server** from the `backend/` directory:

```
[ ] Backup MySQL
[ ] git pull
[ ] npm install
[ ] npm run build
[ ] npm run migrate:prod
[ ] npm run seed:circles
[ ] mkdir -p uploads/posts
[ ] Restart API process
[ ] Smoke-test /health and /api/docs
```

---

## Step-by-step (production)

### 1. SSH into the server

```bash
ssh user@your-server
cd /path/to/Anchor/backend
```

### 2. Backup the database

**Always do this before migrations.**

```bash
mysqldump -u YOUR_DB_USER -p anchor_db > backup-$(date +%F-%H%M).sql
```

Store the dump somewhere safe (not only on the same disk).

### 3. Pull latest code

```bash
git pull origin main   # or your deploy branch
```

### 4. Install dependencies and build

```bash
npm install
npm run build
```

`build` compiles TypeScript to `dist/` and copies Swagger files.

### 5. Run database migrations

Production uses `synchronize: false`. Schema changes **must** go through migrations.

```bash
# See which migrations are pending
npm run migration:show

# Apply pending migrations (compiled JS)
npm run migrate:prod
```

Migrations included (Phases 0–3):

| Migration | What it adds |
|-----------|----------------|
| `1719000000001-CommunityUserFields` | `users` community columns (`city`, `country`, etc.) |
| `1719000000002-PointsTables` | `user_points`, `point_transactions` |
| `1719000000003-CirclesTables` | `circles`, `circle_members` |
| `1719000000004-PostsTables` | `posts`, `post_likes`, `post_comments` |

Migrations are **idempotent** — safe to re-run; already-applied ones are skipped.

### 6. Seed circles

Required for App Review / discover surfaces. Idempotent (upserts by slug).

```bash
npm run seed:circles
```

### 7. Ensure upload directories exist

```bash
mkdir -p uploads/posts
chmod -R 755 uploads
```

Post media is stored under `uploads/posts/`. Profile pictures use `uploads/`.

### 8. Restart the API

**PM2:**

```bash
pm2 restart anchor-api    # use your actual process name
pm2 logs anchor-api --lines 50
```

**systemd:**

```bash
sudo systemctl restart anchor-backend
sudo systemctl status anchor-backend
```

**Manual (not recommended for production):**

```bash
NODE_ENV=production npm start
```

---

## Verify deployment

```bash
# HTTP health (no /api prefix)
curl https://app.anchorworld.org/health

# Migrations all applied — each line should show [X]
npm run migration:show
```

In a browser or with a JWT:

- Swagger: https://app.anchorworld.org/api/docs
- `GET /api/circles` — should return 7 seeded circles
- `GET /api/points/balance` — authenticated
- `POST /api/circles/:id/join` → `GET /api/posts/feed?filter=circles`

---

## Production `.env` checklist

On the server, confirm these are set (do **not** use local Docker credentials):

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (or behind nginx) |
| `API_PREFIX` | `/api` |
| `DB_HOST` | `127.0.0.1` (PM2) or `host.docker.internal` (Docker) |
| `DB_PORT` | `3306` |
| `DB_USERNAME` | production MySQL user |
| `DB_PASSWORD` | production password |
| `DB_DATABASE` | `anchor_db` |
| `JWT_ACCESS_SECRET` | strong random secret |
| `JWT_REFRESH_SECRET` | strong random secret |
| `CORS_ORIGIN` | `https://app.anchorworld.org` |
| `SOCKET_CORS_ORIGIN` | `https://app.anchorworld.org` |
| `UPLOAD_DIR` | `uploads` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | path to JSON on server |

Keep production `.env` only on the server — never commit it.

---

## nginx (if used)

For post uploads with video (up to 20 MB):

```nginx
client_max_body_size 25M;
```

Proxy to Node:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Serve uploads statically (optional):

```nginx
location /uploads/ {
    alias /path/to/Anchor/backend/uploads/;
}
```

---

## Rollback

### Revert last migration

```bash
npm run build
npm run migration:revert -d src/config/data-source.ts
```

For production compiled path:

```bash
node ./node_modules/typeorm/cli.js migration:revert -d dist/config/data-source.js
```

### Restore database from backup

```bash
mysql -u YOUR_DB_USER -p anchor_db < backup-YYYY-MM-DD-HHMM.sql
```

Then redeploy the previous git commit and restart the API.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|----------------|-----|
| `ECONNREFUSED` on DB | Wrong `DB_HOST` / MySQL down | Check `.env`, `systemctl status mysql` |
| Migration fails mid-way | Partial apply | Restore backup, fix migration, retry |
| `migrate:prod` not found | Forgot `npm run build` | Run `npm run build` first |
| Empty `/api/circles` | Seed not run | `npm run seed:circles` |
| 413 on post upload | nginx body limit | Increase `client_max_body_size` |
| Swagger 404 | Build didn't copy swagger | Re-run `npm run build` |
| Old API behavior | Process not restarted | `pm2 restart` / `systemctl restart` |

---

## NPM scripts reference

| Script | When to use |
|--------|-------------|
| `npm run dev` | Local development only |
| `npm run build` | **Required** before production start / `migrate:prod` |
| `npm run start` | Run compiled server (`dist/server.js`) |
| `npm run migrate` | Local migrations (ts-node) |
| `npm run migrate:prod` | **Production migrations** (after build) |
| `npm run migration:show` | List applied / pending migrations |
| `npm run seed:circles` | Seed or refresh 7 circles |
| `npm run docker:up` | Docker production API (build + start) |
| `npm run docker:full:up` | Docker full stack (API + MySQL) |
| `npm test` | Unit tests (local / CI) |

---

## Future deploys (Phase 4+)

When new phases add tables or columns:

1. Add a new file under `src/migrations/`
2. Register it in `src/config/data-source.ts`
3. Test locally: `npm run migrate`
4. On server: backup → `git pull` → `npm run build` → `npm run migrate:prod` → restart

Do **not** enable `synchronize: true` in production.

---

## Mobile app

The Flutter app points at `https://app.anchorworld.org/api`. Backend-only deploys do **not** require an app store release unless you change the API URL or ship new client features.
