# Anchor Backend — Production Deploy

**API:** https://app.anchorworld.org/api  
**Swagger:** https://app.anchorworld.org/api/docs  
**Server path:** `~/repositories/anchor-backend`  
**Git repo:** `https://github.com/fayzan101/anchorbackend.git`  
**Branch:** `master`  
**PM2 process:** `anchor-backend`

---

## 1. SSH into server

```bash
ssh root@72.61.74.165
cd ~/repositories/anchor-backend
```

---

## 2. Backup database

Credentials are in `.env` on the server (not `.env.production`).

```bash
cd ~/repositories/anchor-backend

export $(grep -E '^DB_' .env | grep -v '^#' | xargs)
mysqldump --no-tablespaces -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > backup-$(date +%F-%H%M).sql

ls -lh backup-*.sql
```

---

## 3. Pull latest code

```bash
cd ~/repositories/anchor-backend

git remote set-url origin https://github.com/fayzan101/anchorbackend.git
git fetch origin
git checkout master
git reset --hard origin/master
```

If `git fetch` asks for credentials:

- **Username:** `fayzan101`
- **Password:** GitHub Personal Access Token (not account password)

```bash
git config --global credential.helper store
```

---

## 4. Deploy

```bash
cd ~/repositories/anchor-backend

cp .env ~/.env.backup

mkdir -p uploads/posts
chmod -R 755 uploads

npm install
npm run build
npm run migrate:prod
npm run seed:circles

pm2 restart anchor-backend
```

---

## 5. Verify

```bash
pm2 list
pm2 logs anchor-backend --lines 30

curl http://127.0.0.1:3000/health
curl https://app.anchorworld.org/health

npm run migration:show
```

Browser: https://app.anchorworld.org/api/docs

---

## First-time PM2 setup (only if process does not exist)

```bash
cd ~/repositories/anchor-backend

npm install
npm run build
npm run migrate:prod
npm run seed:circles

pm2 start dist/server.js --name anchor-backend
pm2 save
pm2 startup
```

---

## Future deploys (same server)

```bash
cd ~/repositories/anchor-backend

export $(grep -E '^DB_' .env | grep -v '^#' | xargs)
mysqldump --no-tablespaces -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > backup-$(date +%F-%H%M).sql

git fetch origin
git reset --hard origin/master

mkdir -p uploads/posts
npm install
npm run build
npm run migrate:prod
npm run seed:circles

pm2 restart anchor-backend
curl http://127.0.0.1:3000/health
```

---

## Push from local PC (before server pull)

```bash
cd f:\Desktop\Projects\Backend\Anchor\backend

git add .
git commit -m "Your message"
git push origin master
```

---

## Notes

- Run `npm run build` before `npm run migrate:prod` (migrations use `dist/`).
- Do not commit or overwrite server `.env` — it has production DB credentials.
- PM2 process name is `anchor-backend`, not `anchor-api`.
- Local MySQL: `npm run db:up` (port **3307**). Copy `.env.example` → `.env`.

---

## GitHub Actions CI/CD

Workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| **CI** | Push / PR to `master` | `npm ci` → lint → typecheck → unit tests → build → integration tests (MySQL) |
| **Deploy** | After CI succeeds on `master`, or manual | SSH deploy → build → migrate → seed circles → `pm2 restart` |

### One-time: GitHub secrets

In **GitHub → anchorbackend → Settings → Secrets and variables → Actions**, add:

| Secret | Example | Required |
|--------|---------|----------|
| `DEPLOY_HOST` | `72.61.74.165` | Yes (for CD) |
| `DEPLOY_USER` | `root` | Yes |
| `DEPLOY_SSH_KEY` | Private key (PEM) | Yes |
| `DEPLOY_PATH` | `~/repositories/anchor-backend` | Optional |
| `DEPLOY_PORT` | `22` | Optional |

Create **environment** `production` (Settings → Environments) if you want deploy approval gates.

### Manual deploy trigger

**Actions → Deploy → Run workflow**

### CI only (no deploy)

Open a PR to `master` — CI runs automatically; deploy does not run until merge.

