# Lab Storage Manager — Deployment Guide

> **Target environment:** On-premises Linux server, Visteon corporate network.
> **Access:** Web browser (Firefox/Chrome/Edge) + Android 2D barcode scanners.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Layout](#2-repository-layout)
3. [Server Preparation](#3-server-preparation)
4. [Environment Configuration](#4-environment-configuration)
5. [First-Time Deployment](#5-first-time-deployment)
6. [Database Seeding (Initial Data)](#6-database-seeding-initial-data)
7. [Verifying the Stack](#7-verifying-the-stack)
8. [Routine Operations](#8-routine-operations)
9. [Updating the Application](#9-updating-the-application)
10. [Backup & Restore](#10-backup--restore)
11. [Local Development Setup](#11-local-development-setup)
12. [Architecture Reference](#12-architecture-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS |
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB |
| Network | LAN access to AD/LDAP server | — |

### Required Software (on the server)

```bash
# Docker Engine (not Docker Desktop)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out and back in after this

# Docker Compose plugin (bundled with modern Docker Engine)
docker compose version           # should print 2.x.x

# Git
sudo apt install git -y
```

### Required on Developer Machine (for Prisma CLI operations)

```bash
node --version    # 20.x LTS recommended
npm --version     # 10.x+
```

---

## 2. Repository Layout

```
Lab Storage Manager/
├── docker-compose.yml          ← orchestrates all 4 services
├── .env                        ← secrets & config (never commit real values)
├── .env.example                ← template — copy to .env and fill in
├── nginx/
│   └── nginx.conf              ← reverse proxy: routes /api/ → backend, / → frontend
├── frontend/
│   ├── Dockerfile              ← build: Vite → dist; serve: nginx:alpine
│   ├── nginx.conf              ← SPA config inside the frontend container
│   └── src/
│       ├── api/                ← API client modules (one file per domain)
│       ├── pages/              ← all page components
│       ├── types/index.ts      ← shared TypeScript types
│       └── mock/data.ts        ← mock data (used when VITE_USE_MOCKS=true)
└── backend/
    ├── Dockerfile              ← build: tsc; run: node + prisma migrate deploy
    ├── .env                    ← DATABASE_URL for local Prisma CLI use only
    ├── prisma/
    │   ├── schema.prisma       ← database schema (source of truth)
    │   ├── migrations/         ← Prisma migration history
    │   ├── migration_init.sql  ← reference copy of the initial SQL migration
    │   └── seed.ts             ← seed script for initial data
    └── src/
        ├── index.ts            ← entry point (port 3001)
        ├── app.ts              ← Fastify app factory
        ├── plugins/            ← auth (JWT + LDAP), requireRole
        └── routes/             ← one file per resource
            ├── auth.ts
            ├── items.ts
            ├── operations.ts
            ├── sites.ts
            ├── containers.ts
            ├── external-locations.ts
            ├── users.ts
            ├── reports.ts
            └── health.ts
```

---

## 3. Server Preparation

```bash
# 1. Clone the repository
git clone <repo-url> /opt/lab-storage
cd /opt/lab-storage

# 2. Set ownership (replace 'labadmin' with your server user)
sudo chown -R labadmin:labadmin /opt/lab-storage
```

---

## 4. Environment Configuration

### 4.1 Root `.env` (Docker Compose secrets)

Copy the example file and fill in real values:

```bash
cp .env.example .env
nano .env
```

```dotenv
# ─── Database ─────────────────────────────────────────────────────────────────
POSTGRES_DB=lab_storage
POSTGRES_USER=lab_user
POSTGRES_PASSWORD=<strong-password>          # change this

# ─── JWT ──────────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_ACCESS_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<different-64-char-random-hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── LDAP / Active Directory ──────────────────────────────────────────────────
LDAP_URL=ldap://ad-server.visteon.com:389
LDAP_BASE_DN=dc=visteon,dc=com
LDAP_BIND_DN=cn=svc-labstorage,ou=ServiceAccounts,dc=visteon,dc=com
LDAP_BIND_PASSWORD=<service-account-password>

# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV=production
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# run twice — one for ACCESS, one for REFRESH
```

### 4.2 Backend `.env` (Prisma CLI only — local dev)

Used only when running `npx prisma` commands directly from your dev machine (not in Docker):

```bash
# backend/.env
DATABASE_URL="postgresql://lab_user:<password>@<server-ip>:5432/lab_storage"
```

> **Note:** In Docker, `DATABASE_URL` is assembled automatically by `docker-compose.yml` using the values from the root `.env`. The `backend/.env` file is only for local Prisma CLI usage.

### 4.3 LDAP Service Account Requirements

The bind account (`svc-labstorage`) needs:
- Read access to the OU containing lab users
- Permission to search `userPrincipalName`, `sAMAccountName`, `displayName`, `mail`
- No password expiry (service account)

---

## 5. First-Time Deployment

```bash
cd /opt/lab-storage

# Pull/build all images and start the stack
docker compose up --build -d

# Watch logs during startup (Ctrl+C to stop watching, containers keep running)
docker compose logs -f
```

### What happens automatically on first start:

1. **PostgreSQL** starts and creates the `lab_storage` database.
2. **Backend** waits for Postgres health check, then runs `prisma migrate deploy` — this applies all migrations and creates the schema.
3. **Frontend** is served as a static build by nginx inside its container.
4. **Nginx** (reverse proxy) starts and routes traffic.

### Expected startup order and timing:

```
postgres    → healthy in ~10s
backend     → migrations run, listening on :3001 in ~20–30s
frontend    → serving on :80 immediately
nginx       → routing on :80 in ~5s after deps are ready
```

---

## 6. Database Seeding (Initial Data)

The seed script creates:
- 3 sites (Sofia, Munich, Paris) with buildings and storage areas
- Sample storage locations
- 3 external locations (BMW, IDIADA, TÜV)
- An initial admin user

**Run seed after first deployment:**

```bash
# Option A: via Docker exec (no local Node needed)
docker compose exec backend npx prisma db seed

# Option B: from dev machine with backend/.env configured
cd backend
npx prisma db seed
```

> Seeding is **idempotent** — safe to run again if interrupted. It uses `upsert` operations.

---

## 7. Verifying the Stack

### Service health checks

```bash
# All containers should show "Up" or "Up (healthy)"
docker compose ps

# Backend health endpoint (no auth required)
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}

# Through nginx (as a browser would see it)
curl http://localhost/api/v1/health

# Frontend reachable
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK
```

### Port map

| Port | Service | Description |
|---|---|---|
| `80` | nginx (reverse proxy) | Main entry point for browsers |
| `3001` | backend (Fastify) | Direct API access (dev/debug) |
| `5173` | frontend container | Direct frontend access (dev/debug) |
| `5432` | PostgreSQL | Database (keep firewalled in production) |

> In production, only port `80` (or `443` with TLS) should be exposed to users. Ports `3001`, `5173`, `5432` should be firewalled.

### Log inspection

```bash
docker compose logs backend      # backend logs
docker compose logs postgres     # database logs
docker compose logs nginx        # proxy access logs
docker compose logs frontend     # nginx static server logs
```

---

## 8. Routine Operations

### Start / Stop / Restart

```bash
docker compose start             # start stopped containers
docker compose stop              # stop without removing containers
docker compose restart           # restart all services
docker compose restart backend   # restart only the backend
```

### Shutdown (preserves data)

```bash
docker compose down              # stops and removes containers; volumes persist
```

### Full teardown including data (DANGER)

```bash
docker compose down -v           # removes containers AND the postgres_data volume
```

### View live logs

```bash
docker compose logs -f backend
docker compose logs -f --tail=100 nginx
```

---

## 9. Updating the Application

```bash
cd /opt/lab-storage

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart (zero-downtime not configured — brief outage expected)
docker compose up --build -d

# Compose will only rebuild changed services.
# New database migrations (if any) run automatically on backend startup.
```

---

## 10. Backup & Restore

### Backup the database

```bash
# Dump to a compressed SQL file
docker compose exec postgres pg_dump \
  -U lab_user \
  -d lab_storage \
  -F c \
  -f /tmp/lab_storage_$(date +%Y%m%d_%H%M%S).dump

# Copy out of the container
docker cp lab-storage-db:/tmp/lab_storage_*.dump ./backups/
```

**Automate with cron (on the server):**

```bash
# /etc/cron.d/lab-storage-backup
0 2 * * * root docker compose -f /opt/lab-storage/docker-compose.yml exec -T postgres \
  pg_dump -U lab_user -d lab_storage -F c \
  > /opt/lab-storage/backups/lab_$(date +\%Y\%m\%d).dump
```

### Restore the database

```bash
# Stop the backend first (prevent writes during restore)
docker compose stop backend

# Restore
docker compose exec -T postgres pg_restore \
  -U lab_user \
  -d lab_storage \
  --clean \
  < ./backups/lab_storage_20260310_020000.dump

# Restart
docker compose start backend
```

---

## 11. Local Development Setup

### Run frontend only (mock data, no backend needed)

```bash
cd frontend
echo "VITE_USE_MOCKS=true" > .env.local
npm install
npm run dev
# → http://localhost:5173
```

### Run full stack locally

**Terminal 1 — Database:**
```bash
# Start only Postgres in Docker
docker compose up postgres -d
```

**Terminal 2 — Backend:**
```bash
cd backend
# Ensure backend/.env has DATABASE_URL pointing to localhost:5432
npm install
npx prisma migrate deploy      # apply migrations
npx prisma db seed             # seed initial data (first time only)
npm run dev                    # tsx watch — auto-reloads on file change
# → http://localhost:3001
```

**Terminal 3 — Frontend:**
```bash
cd frontend
# Vite proxies /api/* → localhost:3001 (configured in vite.config.ts)
npm install
npm run dev
# → http://localhost:5173
```

### Useful development commands

```bash
# Backend
cd backend
npm run typecheck              # TypeScript check without building
npm run db:studio              # Prisma Studio visual DB browser at :5555
npx prisma migrate dev         # create a new migration after schema changes
npx prisma generate            # regenerate Prisma client after schema changes

# Frontend
cd frontend
npx tsc --noEmit               # TypeScript check
npm run build                  # production build into dist/
npm run preview                # preview the production build locally
```

---

## 12. Architecture Reference

```
Browser / Android Scanner
        │
        ▼  :80
┌────────────────┐
│  nginx         │  ← reverse proxy (nginx:alpine)
│  (container)   │
└────┬───────────┘
     │  /api/*                      /
     ▼  :3001                       ▼  :80
┌─────────────┐             ┌──────────────────┐
│  Backend    │             │  Frontend        │
│  Fastify    │             │  React + Vite    │
│  Node 20    │             │  (nginx:alpine)  │
│  (container)│             │  (container)     │
└──────┬──────┘             └──────────────────┘
       │
       ▼  :5432
┌─────────────┐     ┌─────────────────────┐
│  PostgreSQL │     │  Active Directory   │
│  16-alpine  │     │  LDAP server        │
│  (container)│     │  (external / corp)  │
└─────────────┘     └─────────────────────┘
```

### Auth flow

```
User enters AD credentials
      │
      ▼
POST /api/v1/auth/login
      │
      ▼
Backend binds to LDAP with service account
      │  searches for user by sAMAccountName
      ▼
Backend authenticates user credentials against LDAP
      │  on success: looks up or creates User record in PostgreSQL
      ▼
Backend issues JWT access token (15m) + refresh token (7d)
      │
      ▼
Frontend stores tokens → attaches Bearer on every API request
```

### API base URL

All API routes are prefixed: `/api/v1/`

| Route group | Prefix |
|---|---|
| Auth | `/api/v1/auth/` |
| Items | `/api/v1/items/` |
| Operations | `/api/v1/operations/` |
| Sites / Locations | `/api/v1/sites/`, `/api/v1/locations/` |
| Containers | `/api/v1/containers/` |
| External Locations | `/api/v1/external-locations/` |
| Users | `/api/v1/users/` |
| Reports | `/api/v1/reports/` |
| Health | `/api/v1/health` |

---

## 13. Troubleshooting

### Backend fails to start — "can't connect to postgres"

```bash
docker compose logs postgres
# Check if postgres is healthy:
docker compose ps postgres
# If unhealthy, inspect:
docker compose exec postgres pg_isready -U lab_user -d lab_storage
```

The backend waits for Postgres `healthcheck` to pass before starting. If Postgres takes longer than expected on a slow disk, increase `retries` in `docker-compose.yml`.

### Backend fails to start — "migration failed"

```bash
docker compose logs backend
```

Common causes:
- `DATABASE_URL` misconfigured in root `.env`
- Migration conflict — run `npx prisma migrate status` from dev machine with `backend/.env` configured to diagnose

### LDAP authentication fails — users can't log in

```bash
docker compose logs backend | grep -i ldap
```

Check:
- `LDAP_URL` is reachable from the server: `nc -zv ad-server.visteon.com 389`
- Service account password hasn't expired
- `LDAP_BASE_DN` matches the AD domain structure
- The user account exists and is not locked in AD

### Frontend shows blank page / 404 on refresh

The `frontend/nginx.conf` SPA fallback (`try_files $uri /index.html`) handles React Router paths. If you're seeing 404s, check that the frontend container is running:

```bash
docker compose logs frontend
docker compose exec frontend nginx -t    # test nginx config
```

### Containers restart in a loop

```bash
docker compose ps                         # check restart count
docker compose logs --tail=50 <service>  # inspect last 50 lines
```

Common cause: bad `.env` values (missing secrets, wrong DB credentials).

### Database: check what's in it

```bash
# Open psql inside the postgres container
docker compose exec postgres psql -U lab_user -d lab_storage

# Useful queries:
\dt                          -- list all tables
SELECT count(*) FROM "Item"; -- count items
SELECT * FROM "User";        -- list users
\q                           -- quit
```

### Reset everything and start fresh

```bash
docker compose down -v          # destroy containers + postgres_data volume
docker compose up --build -d    # rebuild and restart
docker compose exec backend npx prisma db seed   # re-seed
```
