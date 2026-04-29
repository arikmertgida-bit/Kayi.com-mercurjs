# Kayı.com — AI Operational Guide & Architecture Reference

> **IMPORTANT FOR AI ASSISTANT:** Read this file completely before writing any plan, any code, or making any architectural decision. Do NOT guess. Every operational detail you need is here. This file is your memory.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Map](#2-architecture-map)
3. [Service Details](#3-service-details)
4. [Databases](#4-databases)
5. [Package Manager Rules — CRITICAL](#5-package-manager-rules--critical)
6. [Build Sequences — EXACT COMMANDS](#6-build-sequences--exact-commands)
7. [Rebuild Decision Matrix](#7-rebuild-decision-matrix)
8. [Docker Cache Strategy](#8-docker-cache-strategy)
9. [Operational Commands](#9-operational-commands)
10. [Startup Order & Health Checks](#10-startup-order--health-checks)
11. [Error → Solution Table](#11-error--solution-table)
12. [Critical Warnings — Do NOT Ignore](#12-critical-warnings--do-not-ignore)
13. [Security Standards](#13-security-standards)
14. [Performance Standards — LCP / CLS / INP](#14-performance-standards--lcp--cls--inp)
15. [Code Quality Standards](#15-code-quality-standards)
16. [Environment Variables](#16-environment-variables)
17. [Technical Debt Backlog](#17-technical-debt-backlog)
18. [Quick Reference — Credentials & Endpoints](#18-quick-reference--credentials--endpoints)
19. [Completed Work](#19-completed-work)

---

## 1. Project Overview

Multi-vendor marketplace (B2C) built on MedusaJS v2 + MercurJS plugin ecosystem.

- **Market:** Turkey — Turkish language UI, TRY currency, `tr` region as default
- **Root directory:** `c:\Kayı.com\`
- **Orchestration:** Docker Compose (9 containers, all with healthchecks)
- **Messaging:** Custom `kayi-messenger` service (Express + Socket.io + Prisma) — TalkJS was completely removed and must never be referenced again
- **Search:** MeiliSearch with periodic backend sync job
- **Storage:** MinIO (S3-compatible object storage)

---

## 2. Architecture Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Compose                             │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │  storefront  │   │ vendor-panel │   │    admin-panel       │    │
│  │  Next.js 15  │   │  Vite+React  │   │    Vite+React        │    │
│  │  port :3000  │   │  port :7001  │   │    port :5173        │    │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘    │
│         │                  │                      │                │
│         └─────────────────┬┘──────────────────────┘                │
│                           │                                        │
│               ┌───────────▼────────────┐                          │
│               │        backend         │                          │
│               │  MedusaJS v2 :9000     │                          │
│               │  @mercurjs/b2c-core    │                          │
│               └────────────────────────┘                          │
│                           │                                        │
│          ┌────────────────┼──────────────────┐                    │
│          │                │                  │                    │
│  ┌───────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐          │
│  │  postgres    │  │    redis    │  │  meilisearch    │          │
│  │  :5432       │  │    :6380    │  │     :7700       │          │
│  │  2 databases │  └─────────────┘  └─────────────────┘          │
│  └──────────────┘                                                  │
│                                                                     │
│  ┌────────────────────────┐   ┌───────────────────────────┐        │
│  │    kayi-messenger      │   │           minio           │        │
│  │  Express + Socket.io   │   │   Object Storage          │        │
│  │  Prisma + PostgreSQL   │   │   :9001 (console)         │        │
│  │  port :4000            │   │   :9002 (API)             │        │
│  └────────────────────────┘   └───────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Details

### 3.1 Backend (`/backend`)
- **Framework:** MedusaJS v2
- **Build output:** `.medusa/server/`
- **Build command (local):** `pnpm build` → runs `medusa build`
- **Config file:** `backend/medusa-config.ts` — do not touch without careful review
- **tsconfig:** `module: Node16`, `moduleResolution: Node16` — important for import paths
- **MercurJS Plugins installed:**
  - `@mercurjs/b2c-core` — multi-vendor marketplace core
  - `@mercurjs/commission` — commission management
  - `@mercurjs/reviews` — product/seller reviews
  - `@mercurjs/requests` — seller/product approval workflow
  - `@mercurjs/resend` — email service
- **Custom Modules (`/src/modules`):**
  - `review-images` — review photo uploads
  - `review-image-reports` — photo abuse reporting
  - `review-likes` — review like/upvote system
  - `review-replies` — threaded review replies
  - `meilisearch` — search index module
  - `minio-file` — file storage provider
- **API Routes:**
  - `/store/*` — customer-facing API (used by storefront)
  - `/vendor/*` — seller API (used by vendor-panel)
  - `/admin/*` — admin API (used by admin-panel)
- **Subscribers:** seller approval, product approval, MeiliSearch sync, collection sync
- **Jobs:** MeiliSearch cron sync (periodic product index update)
- **DB connection pool:** `min: 2, max: 10, idleTimeoutMillis: 30000`

#### Backend Docker — Multi-Stage Build Architecture

> **CRITICAL:** The backend Docker image uses a two-stage build. Misunderstanding this will cause image bloat (2GB+) or broken containers.

**Stage 1 — Builder (`node:22-alpine`):**
1. Install ALL deps (dev + prod) with `pnpm install` — needed for `medusa build`
2. Run `pnpm build` → produces `.medusa/server/` (self-contained MedusaJS server with its own `package.json`)
3. `cd .medusa/server` → run `npm install --omit=dev --ignore-scripts --no-audit --no-fund --legacy-peer-deps`
   - This installs **only production** deps INTO the compiled output directory
   - Uses `npm` (not pnpm) because `.medusa/server/` has no lockfile
   - **`--legacy-peer-deps` is mandatory** — `@medusajs/ui` has a peer dep version conflict between `mercurjs` and `draft-order` packages (non-breaking, but npm strict mode rejects it)

**Stage 2 — Runtime (`node:22-alpine`):**
- Copies **only** `/app/.medusa/server/` from builder → `/app/`
- No root `node_modules`, no source files, no dev tools, no pnpm cache
- Result: **self-contained ~1GB image** (vs 2GB+ with root node_modules)

**What runs at container start (CMD):**
```
npx medusa db:migrate
node src/scripts/ensure-columns.js   (skipped gracefully if it fails)
npx medusa start
```

**Image size history:** 2.04GB (before) → **1.04GB** (after multi-stage refactor, 49% reduction)

### 3.2 Storefront (`/storefront`)
- **Framework:** Next.js 15.3.6 (App Router)
- **Package manager:** `pnpm` — NEVER use npm or yarn here
- **Build command (local):** `pnpm run launcher build`
- **Build command (Docker):** runs `pnpm run launcher build` → `launch-storefront build` → `next build`
- **`.npmrc` is MANDATORY:** contains `shamefully-hoist=true`
  - Without it: `@medusajs/ui` fails with `ENOENT: /app/browser/default-stylesheet.css` during SSR
  - The `storefront/Dockerfile` explicitly COPYs `.npmrc` — this line must never be removed
- **URL structure:** `/[locale]/(main|checkout|reset-password)/...`
  - `[locale]` segment = **country/region code** (e.g. `tr`, `us`) — NOT a language code
  - i18n/translation is NOT active — site runs in Turkish only
  - `next-intl` package is installed but never used (technical debt)
- **TalkJS:** completely removed — do not add back, do not reference it

#### Storefront Docker — Standalone Output + Edge Runtime Fix

> **CRITICAL:** Two separate architectural requirements must be maintained simultaneously. Removing either one breaks the storefront.

**Requirement 1 — `output: 'standalone'` in `next.config.ts`:**
- Next.js bundles a minimal server + required `node_modules` subset into `.next/standalone/`
- Docker Stage 2 copies ONLY this directory — no full `node_modules` install at runtime
- Without this: Docker Stage 2 would need to run `pnpm install` again (~400MB overhead)
- **Dockerfile copies 3 artifacts from builder:**
  ```
  .next/standalone  →  /app/               (server + minimal node_modules)
  .next/static      →  /app/.next/static   (CSS, JS, images — must be separate)
  public/           →  /app/public         (robots.txt, favicon, etc.)
  ```

**Requirement 2 — `MEDUSA_BACKEND_URL` baked into build in `next.config.ts`:**
- **Root cause of "No regions found" error:** Next.js middleware runs on the Edge Runtime. Edge Runtime **cannot** read standard `process.env` variables at runtime — they are undefined unless explicitly provided at build time.
- **Fix (both parts are required together):**

  Part A — `storefront/next.config.ts`:
  ```typescript
  env: {
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000',
  },
  ```
  This tells Next.js to inline the value into the bundle at build time.

  Part B — `storefront/Dockerfile` build stage:
  ```dockerfile
  ARG MEDUSA_BACKEND_URL=http://backend:9000
  ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
  ```
  Without this, `process.env.MEDUSA_BACKEND_URL` is `undefined` when `next.config.ts` is evaluated during `next build`, so the `env` block bakes in `undefined`.

  Part C — `docker-compose.yml` build args:
  ```yaml
  build:
    args:
      MEDUSA_BACKEND_URL: http://backend:9000
  ```

- **If you change `MEDUSA_BACKEND_URL`:** You MUST rebuild the storefront image — it is baked in, not a runtime variable.

### 3.3 Vendor Panel (`/vendor-panel`)
- **Framework:** Vite + React
- **Package manager:** `pnpm`
- **Build command (local):** `pnpm build:preview`
- Built on MercurJS vendor-panel extension system

### 3.4 Admin Panel (`/admin-panel`)
- **Framework:** Vite + React
- **Package manager:** `pnpm`
- MedusaJS admin panel extension

### 3.5 Kayi-Messenger (`/kayi-messenger`)
- **Framework:** Express.js + Socket.io
- **Package manager:** `npm` — NEVER use pnpm here (Docker uses `npm ci`)
- **Build command (local):** `npm run build` (pure `tsc`)
- **TypeScript:** `strict: true` — all types must be explicit
- **Database:** Prisma ORM → `kayi_messenger` database (separate from backend DB)
- **Prisma Models:** `Conversation`, `ConversationParticipant`, `Message`, `UserProfile`
- **Enums:** `UserType: CUSTOMER | SELLER | ADMIN`, `MessageType: TEXT | IMAGE | NOTIFICATION`
- **Routes:** `/conversations`, `/messages`, `/upload`, `/internal`
- **Key dependencies:** `zod` (validation), `express-rate-limit` (rate limiting)
- Replaces TalkJS completely — do NOT suggest TalkJS as an alternative

---

## 4. Databases

| Database | Used By | Notes |
|---|---|---|
| `mercurjs` | Backend (MedusaJS) | Main application database |
| `kayi_messenger` | kayi-messenger service | Separate DB, same PostgreSQL instance |

**Init script:** `postgres-init/01-create-messenger-db.sh`
- This script runs ONLY on first PostgreSQL container creation
- Changing it after initial setup has NO effect on existing containers
- To re-run: `docker compose down -v` then `docker compose up -d` (WARNING: destroys all data)

---

## 5. Package Manager Rules — CRITICAL

| Service | Package Manager | Lock File | Docker Install Command |
|---|---|---|---|
| `storefront` | `pnpm` | `pnpm-lock.yaml` | `pnpm install` |
| `vendor-panel` | `pnpm` | `pnpm-lock.yaml` | `pnpm install` |
| `admin-panel` | `pnpm` | `pnpm-lock.yaml` | `pnpm install` |
| `backend` | `pnpm` | `pnpm-lock.yaml` | `pnpm install` |
| `kayi-messenger` | `npm` | `package-lock.json` | `npm ci` |

**Rules:**
- Never run `npm install` in storefront, vendor-panel, admin-panel, or backend
- Never run `pnpm install` in kayi-messenger
- Always commit the lock file after adding/removing packages
- Docker builds read from the lock file — without it, builds fail or produce inconsistent results

**Adding packages:**
```bash
# storefront / vendor-panel / admin-panel / backend
pnpm add <package-name>

# kayi-messenger
npm install <package-name>
```

---

## 6. Build Sequences — EXACT COMMANDS

### Full system rebuild (all services)
```bash
cd "c:\Kayı.com"
docker compose build
docker compose up -d
```

### Rebuild single service
```bash
cd "c:\Kayı.com"
docker compose build storefront
docker compose up -d storefront
```

### Storefront — local dependency update then Docker build
```bash
# Step 1: Update dependencies locally (required when package.json changes)
cd "c:\Kayı.com\storefront"
pnpm install
# If pnpm asks to recreate node_modules due to hoisting change: answer Y

# Step 2: Build Docker image
cd "c:\Kayı.com"
docker compose build storefront

# Step 3: Restart container
docker compose up -d storefront
```

### Kayi-Messenger — local dependency update then Docker build
```bash
# Step 1: Update dependencies locally
cd "c:\Kayı.com\kayi-messenger"
npm install

# Step 2: Build Docker image
cd "c:\Kayı.com"
docker compose build kayi-messenger

# Step 3: Restart container
docker compose up -d kayi-messenger
```

### Backend — rebuild and restart
```bash
cd "c:\Kayı.com"
docker compose build backend
docker compose up -d backend
```

---

## 7. Rebuild Decision Matrix

When you change a file, use this table to decide what action is needed:

| Changed File(s) | Action Required |
|---|---|
| `storefront/package.json` or `storefront/pnpm-lock.yaml` | `pnpm install` locally → full Docker rebuild storefront |
| `storefront/.npmrc` | `pnpm install` locally (confirm node_modules recreation) → full Docker rebuild storefront → also verify `storefront/Dockerfile` still has `.npmrc` in COPY line |
| `storefront/Dockerfile` | Full Docker rebuild storefront |
| `storefront/src/**/*.tsx` or `*.ts` | Docker rebuild storefront (Next.js compiles at build time) |
| `storefront/next.config.ts` | Docker rebuild storefront |
| `storefront/next.config.ts` → `env` block changes | **Must rebuild** — env values are baked into JS bundle, not runtime |
| `backend/package.json` or `pnpm-lock.yaml` | `pnpm install` locally → full Docker rebuild backend |
| `backend/medusa-config.ts` | Docker rebuild backend |
| `backend/src/**/*.ts` | Docker rebuild backend |
| `backend/Dockerfile` | Full Docker rebuild backend |
| `kayi-messenger/package.json` or `package-lock.json` | `npm install` locally → full Docker rebuild kayi-messenger |
| `kayi-messenger/prisma/schema.prisma` | `npx prisma migrate dev` locally → Docker rebuild kayi-messenger (migration runs on container start) |
| `kayi-messenger/src/**/*.ts` | Docker rebuild kayi-messenger |
| `vendor-panel/src/**` | Docker rebuild vendor-panel |
| `admin-panel/src/**` | Docker rebuild admin-panel |
| `docker-compose.yml` (env vars only) | `docker compose up -d` (no rebuild needed unless image changed) |
| `docker-compose.yml` (build args added/changed) | **Must rebuild** the affected service — build args are consumed at image build time |

### ⚠️ Build Args vs Runtime Env — Critical Distinction

```
docker-compose.yml
├── build.args.*     → consumed at IMAGE BUILD TIME → must docker compose build
└── environment.*    → injected at CONTAINER START TIME → docker compose up -d is enough
```

- `MEDUSA_BACKEND_URL` is a **build arg** for storefront (baked into Next.js bundle)
- `DATABASE_URL`, `REDIS_URL` etc. are **runtime env vars** for backend (read at startup)

---

## 8. Docker Cache Strategy

Docker builds layers in order. Each `COPY` or `RUN` instruction is a layer. If a layer changes, all subsequent layers rebuild.

### Backend Dockerfile — Layer Order

```
Stage 1 (builder):
  Layer 1:  FROM node:22-alpine AS builder
  Layer 2:  RUN corepack enable + pnpm@10.33.0       (CACHED — never changes)
  Layer 3:  WORKDIR /app
  Layer 4:  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json
            ↑ Any of these change → layers 5,6,7,8 all rebuild
  Layer 5:  RUN pnpm install                          (slow — full dev+prod install)
  Layer 6:  COPY . .                                  (copies all source)
  Layer 7:  RUN pnpm build                            (medusa build → .medusa/server/)
  Layer 8:  WORKDIR /app/.medusa/server
            RUN npm install --omit=dev --legacy-peer-deps  (prod-only install)

Stage 2 (runtime):
  Layer 9:  FROM node:22-alpine                       (CACHED base image)
  Layer 10: RUN addgroup/adduser                      (CACHED)
  Layer 11: COPY --from=builder .medusa/server → /app (rebuilds only if stage 1 changed)
```

**Key insight:** Layer 8 (`npm install --omit=dev`) runs INSIDE `.medusa/server/` which is the output dir, not the source root. This is what makes the runtime image self-contained without root-level `node_modules`.

**Why `--legacy-peer-deps` on Layer 8:**
`@medusajs/ui` has a peer dependency conflict between the versions pulled by `mercurjs` (4.0.25) and `draft-order` (4.0.27). It is non-breaking but npm strict mode exits with `ERESOLVE`. This flag must stay or the build fails.

### Storefront Dockerfile — Layer Order

```
Stage 1 (builder):
  Layer 1:  FROM node:22-alpine AS builder
  Layer 2:  RUN corepack enable + pnpm@10.33.0       (CACHED)
  Layer 3:  WORKDIR /app
  Layer 4:  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
            ↑ If ANY of these 4 files change → layers 5,6,7 all rebuild
  Layer 5:  RUN pnpm install --prefer-frozen-lockfile (slow — downloads all packages)
  Layer 6:  COPY . .                                  (copies source code)
  Layer 7:  RUN pnpm next build                       (Next.js build — slow, bakes env vars)

Stage 2 (runtime):
  Layer 8:  FROM node:22-alpine                       (CACHED base image)
  Layer 9:  COPY --from=builder .next/standalone ./
  Layer 10: COPY --from=builder .next/static ./.next/static
  Layer 11: COPY --from=builder public ./public
  Layer 12: RUN addgroup/adduser + chown              (CACHED)
```

**Rule:** If only source `.tsx`/`.ts` files changed (not package.json or .npmrc), layers 4 and 5 stay cached. Layer 6 onward rebuilds.

**If you see `RUN pnpm install — CACHED` but the build still fails:** Force a clean build:
```bash
docker compose build --no-cache storefront
```

---

## 9. Operational Commands

### Start / Stop
```bash
# Start all containers (detached)
docker compose up -d

# Stop all containers (keep data volumes)
docker compose down

# Stop all containers AND remove volumes (WARNING: destroys database data)
docker compose down -v

# Restart single container (no rebuild)
docker compose restart storefront
docker compose restart kayi-messenger
docker compose restart backend
```

### Check Status
```bash
# All containers with health status and ports
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Quick health check
docker compose ps
```

### Log Monitoring
```bash
# Follow logs for specific service
docker compose logs -f storefront
docker compose logs -f backend
docker compose logs -f kayi-messenger

# Last N lines from multiple services
docker compose logs --tail=50 storefront kayi-messenger backend

# All services, last 30 lines
docker compose logs --tail=30
```

### Rebuild & Restart Sequence
```bash
# Safe rebuild
docker compose build storefront
docker compose up -d storefront

# If container is stuck or in bad state
docker compose stop storefront
docker compose rm -f storefront
docker compose up -d storefront
```

### Direct Container Access
```bash
docker exec -it kaycom-backend-1 sh
docker exec -it kaycom-storefront-1 sh
docker exec -it kaycom-kayi-messenger-1 sh
docker exec -it kaycom-postgres-1 psql -U postgres
```

---

## 10. Startup Order & Health Checks

**Dependency chain (Docker Compose handles via `depends_on`):**
```
PostgreSQL + Redis + MinIO + MeiliSearch  (infrastructure layer)
                    ↓
             Backend (waits for all infra healthy)
                    ↓
   Storefront + Vendor Panel + Admin Panel + Kayi-Messenger
   (wait for backend healthy)
```

**CRITICAL: `Running` status does NOT mean `Ready`**

| Container | Ready When | Healthcheck Command |
|---|---|---|
| `kaycom-postgres-1` | `pg_isready` responds | `pg_isready -U postgres` |
| `kaycom-redis-1` | `redis-cli ping` responds | `redis-cli ping` |
| `kaycom-minio-1` | HTTP `/minio/health/live` returns 200 | `curl -sf http://localhost:9000/minio/health/live` |
| `kaycom-meilisearch-1` | HTTP `/health` responds | `curl -sf http://localhost:7700/health` |
| `kaycom-backend-1` | `/health` returns 200 (startup: 30-60s) | `wget -qO- http://localhost:9000/health` |
| `kaycom-admin-panel-1` | nginx root responds | `wget -qO- http://127.0.0.1/` |
| `kaycom-vendor-panel-1` | nginx root responds | `wget -qO- http://127.0.0.1/` |
| `kaycom-storefront-1` | Next.js `✓ Ready` in logs | `wget -qO /dev/null http://127.0.0.1:8000/` |
| `kaycom-kayi-messenger-1` | `/health` returns 200 | `node -e "require('http').get('http://localhost:4000/health', ...)"` |

### Healthcheck Commands — BusyBox wget Limitations

> **WARNING:** Alpine-based containers use BusyBox wget, not GNU wget. BusyBox wget does NOT support `--max-redirect`, `-T` (timeout), or long-form options beyond what's listed below.

**BusyBox wget supported flags:**
```
-q          Quiet
-O FILE     Save to file ('-' or /dev/null for discard)
--spider    Only check URL existence (exit 0 if exists)
-T SEC      Network read timeout
-S          Show server response
```

**CORRECT storefront healthcheck** (redirect-friendly):
```bash
wget -qO /dev/null http://127.0.0.1:8000/ 2>&1 || exit 1
```

**WRONG** (will fail on all Alpine containers):
```bash
wget --spider --max-redirect=10 -q http://127.0.0.1:8000/  # --max-redirect NOT supported
```

### Admin/Vendor Panel Healthcheck — localhost vs 127.0.0.1

> **WARNING:** On some Docker networking configurations, `localhost` resolves to IPv6 (`::1`). nginx listens only on IPv4. Always use `127.0.0.1` explicitly in healthcheck commands for nginx-based containers.

```bash
# CORRECT
wget -qO- http://127.0.0.1/ || exit 1

# WRONG — may fail with "Connection refused" if IPv6 resolves first
wget -qO- http://localhost/ || exit 1
```

**Verify all containers are ready:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
# All must show (healthy) before testing endpoints
```

---

## 11. Error → Solution Table

| Error Message | Root Cause | Solution |
|---|---|---|
| `ENOENT: no such file or directory, open '/app/browser/default-stylesheet.css'` | pnpm strict node_modules — `@medusajs/ui` CSS not hoisted | Ensure `storefront/.npmrc` has `shamefully-hoist=true` AND `storefront/Dockerfile` COPYs `.npmrc` before `pnpm install` |
| `[5/8] RUN pnpm install — CACHED` but build fails | Docker used old cached layer without `.npmrc` | Add `.npmrc` to the COPY line in Dockerfile: `COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./` |
| `Cannot find module '@mercurjs/reviews'` | Import from external package instead of local constant | Use `const REVIEW_MODULE_KEY = "review" as const` instead of importing |
| Wrong relative path in `review-replies/.../route.ts` | Incorrect `../` depth in import | Count directory levels from file location to module root |
| `zod is not defined` / `express-rate-limit not found` in kayi-messenger | Package not in `package.json` | `npm install zod express-rate-limit` in `/kayi-messenger`, commit `package-lock.json` |
| pnpm asks `The modules directory will be removed and reinstalled` | `.npmrc` hoisting setting changed | Answer `Y` — this is expected and correct behavior |
| Container shows `Up X seconds` but not `(healthy)` | Service still initializing | Wait — do not restart immediately. Check logs first |
| Backend `401` on `/store/customers/me` | Unauthenticated visitor request | This is NORMAL behavior, not an error |
| MeiliSearch sync errors at startup | Backend started before MeiliSearch was fully ready | Wait for all healthchecks to pass; sync job will retry |
| `npm install` ERESOLVE error in backend Docker build | `@medusajs/ui` peer dep version conflict (mercurjs vs draft-order) | Add `--legacy-peer-deps` flag — this is expected and non-breaking |
| Storefront shows "No regions found" / blank page | `MEDUSA_BACKEND_URL` is `undefined` in Edge Runtime middleware | Ensure: (1) `next.config.ts` has `env: { MEDUSA_BACKEND_URL: ... }` block, (2) `storefront/Dockerfile` has `ARG MEDUSA_BACKEND_URL` + `ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL`, (3) `docker-compose.yml` build args include it. Then **rebuild** storefront. |
| `wget: unrecognized option: max-redirect=10` in healthcheck | BusyBox wget (Alpine) does not support GNU wget's `--max-redirect` flag | Replace with `wget -qO /dev/null http://127.0.0.1:8000/ 2>&1 \|\| exit 1` |
| Admin/vendor panel healthcheck `Connection refused` | `localhost` resolving to IPv6 (`::1`), nginx only on IPv4 | Use `127.0.0.1` instead of `localhost` in healthcheck test command |
| Backend container named `51dc4a00f5d7_kaycom-backend-1` | Docker Compose orphan container from previous session | Run `docker compose down && docker compose up -d` to normalize (volumes are safe) |
| `[listProducts] fetch error: Publishable key needs to have a sales channel configured` | Backend publishable key has no sales channel assigned | In admin panel: Settings → API Keys → select the key → assign "Default Sales Channel" |

---

## 12. Critical Warnings — Do NOT Ignore

### NEVER DO THESE:

**1. TalkJS — PERMANENTLY REMOVED**
- `talkjs` and `@talkjs/react` packages have been removed from storefront
- `kayi-messenger` replaces TalkJS entirely
- Do NOT suggest TalkJS as a solution, do NOT add it back, do NOT reference it

**2. Algolia — NOT USED**
- This project uses MeiliSearch for search
- Do NOT suggest Algolia or add Algolia packages

**3. `storefront/src/lib/helpers/sort-productsMock.ts` — DO NOT DELETE**
- User explicitly decided to keep this file
- Even if it appears unused, leave it alone

**4. `storefront/.npmrc` — DO NOT DELETE**
- Contains `shamefully-hoist=true`
- Without it, Docker build fails with CSS file not found error

**5. `.npmrc` in Dockerfile COPY — DO NOT REMOVE**
- `storefront/Dockerfile` has: `COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./`
- If `.npmrc` is removed from this COPY line, Docker installs packages without hoisting → build fails

**6. Never mix package managers**
- `kayi-messenger` uses `npm` exclusively — never run `pnpm` there
- All other services use `pnpm` — never run `npm` there

**7. Raw SQL — STRICTLY FORBIDDEN**
- Use MedusaJS Query API or `remoteQueryObjectFromString`
- Never write raw SQL queries

**8. Hardcoded secrets — STRICTLY FORBIDDEN**
- All secrets via environment variables only
- JWT_SECRET, COOKIE_SECRET, API keys — all from `.env` or Docker env

**9. Backend `--legacy-peer-deps` — DO NOT REMOVE**
- `backend/Dockerfile` Stage 1 runs: `npm install --omit=dev --legacy-peer-deps` inside `.medusa/server/`
- This flag is required due to a non-breaking peer dependency conflict in `@medusajs/ui`
- Removing it causes `ERESOLVE` failure and the Docker build will exit with code 1
- The conflict is between `@mercurjs/mercur-draft-order` (needs `@medusajs/ui@4.0.27`) and other mercurjs packages (need `4.0.25`) — functionally harmless

**10. `MEDUSA_BACKEND_URL` is a BUILD-TIME variable for storefront — NOT runtime**
- It is baked into the Next.js JS bundle via `next.config.ts` `env` block
- If you change this URL, you MUST rebuild the storefront Docker image
- Simply updating `docker-compose.yml` environment block and restarting the container is NOT sufficient
- The value must flow: docker-compose build args → Dockerfile ARG/ENV → next build → JS bundle

**11. Backend `medusajs-launch-utils` — REMOVED**
- Previously in `backend/package.json` — was removed because the multi-stage build CMD directly calls `npx medusa` commands
- Do NOT add it back — it caused unnecessary overhead and was bypassed anyway

**12. Backend runtime directory is `/app` (was `.medusa/server` in builder)**
- In the builder stage, files live at `/app/.medusa/server/`
- In the runtime stage (Stage 2), they are copied to `/app/`
- When debugging inside the running container: files are at `/app/src/`, `/app/node_modules/`, etc.
- Do not look for `.medusa/server/` in the running container — it doesn't exist there

### Module Key Pattern (Backend)
When referencing `@mercurjs/reviews` module key in custom code:
```typescript
// CORRECT — use local constant
const REVIEW_MODULE_KEY = "review" as const

// WRONG — do not import from @mercurjs/reviews directly in custom routes
import { REVIEW_MODULE_KEY } from "@mercurjs/reviews"
```

### Operational Safety
```bash
# SAFE — keeps all data volumes
docker compose down
docker compose up -d

# DANGEROUS — destroys all database data (mercurjs + kayi_messenger)
docker compose down -v   # Only run if you intend to reset ALL data
```

---

## 13. Security Standards

### Every new API endpoint MUST have:

**1. Authentication check:**
```typescript
const actorId = (req as any).auth_context?.actor_id
if (!actorId) {
  return res.status(401).json({ message: "Authentication required." })
}
```

**2. Zod input validation:**
```typescript
import { z } from "zod"
const schema = z.object({ field: z.string().min(1).max(500) })
const result = schema.safeParse(req.body)
if (!result.success) {
  return res.status(400).json({ message: result.error.errors[0].message })
}
```

**3. Pagination on list endpoints:**
```typescript
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
const offset = parseInt(req.query.offset as string) || 0
```

**4. Ownership verification:** Never return data belonging to another user/seller

### XSS Protection
- User-provided text content → sanitize with `isomorphic-dompurify`
- Any `dangerouslySetInnerHTML` usage requires sanitization first

### Content Moderation
- Review system has OpenAI Moderation API integration (`backend/src/api/reviewValidationMiddleware.ts`)
- If `OPENAI_API_KEY` is not set, moderation is skipped silently (soft fail by design)

### Rate Limiting (kayi-messenger pattern)
```typescript
import rateLimit from "express-rate-limit"
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
```

---

## 14. Performance Standards — LCP / CLS / INP

Every feature must be evaluated against these metrics BEFORE implementation.

### LCP (Largest Contentful Paint) — Target: < 2.5s
- **Images:** Always use `next/image` with explicit `width` and `height` props
- **Above-the-fold images:** Add `priority` prop to `next/image`
- **TTFB:** Keep server response time low — avoid heavy computation in `generateMetadata` or page server components
- **Fonts:** Use `next/font` (already configured) — never load fonts from external CDN in `<head>`
- **Avoid:** Large synchronous data fetching that blocks initial HTML response

### CLS (Cumulative Layout Shift) — Target: < 0.1
- **Images:** Never render `<img>` without explicit dimensions — always use `next/image`
- **Dynamic content:** Reserve space with min-height before content loads (skeleton loaders)
- **Avoid:** Injecting banners or notification bars above existing content after page load

### INP (Interaction to Next Paint) — Target: < 200ms
- **Event handlers:** Never block the main thread — move heavy computation to `useEffect` or Web Workers
- **State updates:** Batch React state updates; avoid triggering multiple re-renders per interaction
- **Lists:** Virtualize long product listings — do not render 100+ DOM nodes at once
- **Debounce:** Search inputs and filter changes — minimum 300ms debounce
- **Avoid:** Synchronous localStorage access, large JSON parsing in click handlers

### Server-Side Efficiency
- **N+1 queries are forbidden.** Fetch related data in single queries using the `fields` parameter
- **Memory leaks:** Never create uncleared `Map`/`Set`/`Cache` in module scope without cleanup
- **Background processes:** Prefer event-driven (subscribers) over polling or `setInterval`
- **File uploads:** Current setup uses `multer.memoryStorage()` — be careful with large files (OOM risk)
- **DB connection pool:** Already configured (`min: 2, max: 10`) — do not override without reason

### Post-Change Verification Checklist
After every significant change, verify:
- [ ] `docker compose logs --tail=30 storefront` shows no errors after startup
- [ ] Backend returns HTTP 200 on `/store/regions`
- [ ] Storefront shows `✓ Ready in Xms` in logs
- [ ] No `ENOENT` or `Cannot find module` errors in any service
- [ ] `docker ps` shows all containers `(healthy)`
- [ ] Browser: page loads without console errors
- [ ] No new `any` types introduced in TypeScript files

---

## 15. Code Quality Standards

### TypeScript Rules
- `@ts-ignore` is **forbidden** — use `@ts-expect-error` with a comment explaining why
- `any` type should be avoided — use `unknown` and narrow with type guards
- `kayi-messenger` has `strict: true` — all types must be explicit, no implicit `any`
- Backend `tsconfig`: `module: Node16` / `moduleResolution: Node16` — use `.js` extensions in imports

### New Module Checklist (Backend)
1. Create under `backend/src/modules/`
2. Register in `backend/medusa-config.ts` under `modules` array
3. Add DB indexes for frequently queried fields
4. Write migration if schema changes required

### New Docker Service Checklist
1. Add to `docker-compose.yml` with:
   - `healthcheck` (required)
   - `mem_limit` (required)
   - `cpus` (required)
   - `restart: unless-stopped`
2. If separate DB needed: add init script to `postgres-init/`
3. Update startup order via `depends_on`

---

## 16. Environment Variables

### Backend (`backend/`)
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mercurjs
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong-secret>
COOKIE_SECRET=<strong-secret>
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:5173
VENDOR_CORS=http://localhost:7001
AUTH_CORS=http://localhost:3000,http://localhost:5173,http://localhost:7001
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=masterKey_kayicom
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=medusa-media
OPENAI_API_KEY=<optional — review moderation>
```

### Storefront (`storefront/`)
```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_DEFAULT_REGION=tr
MEDUSA_BACKEND_URL=http://backend:9000
NEXT_PUBLIC_MESSENGER_URL=http://localhost:4000
NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
NEXT_PUBLIC_SEARCH_API_KEY=masterKey_kayicom
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Kayi-Messenger (`kayi-messenger/`)
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/kayi_messenger
CORS_ORIGINS=http://localhost:3000,http://localhost:7001
MEDUSA_BACKEND_URL=http://backend:9000
MEDUSA_API_KEY=<internal-api-key>
PORT=4000
```

---

## 17. Technical Debt Backlog

### High Priority
- [ ] `next@15.3.6` has a known security vulnerability — upgrade to patched version when available upstream

### Medium Priority
- [ ] `next-intl` package installed but never used — remove from `storefront/package.json`
- [ ] `[locale]` URL segment name is misleading — it is a country/region code, not a language code. Consider renaming to `[countryCode]` in a future refactor (breaking change — requires full URL migration)
- [ ] Backend container may be named `51dc4a00f5d7_kaycom-backend-1` (orphan name from Docker Compose) — normalize with `docker compose down && docker compose up -d` (volumes are safe, no data loss)

### Low Priority
- [ ] `@medusajs/ui` peer dependency warning: requires `react@^18.3.1`, project uses `react@19.2.0` — functionally working, watch for upstream fix
- [ ] `multer@1.4.5-lts.2` deprecation warning in kayi-messenger — evaluate alternative (e.g. `busboy` or `formidable`)
- [ ] `@types/dompurify` stub warning — `dompurify` provides its own types, remove `@types/dompurify`

---

## 18. Quick Reference — Credentials & Endpoints

> These values are for local development. Change all secrets before any production deployment.

| Service | URL | Notes |
|---|---|---|
| Storefront | http://localhost:3000 | Mapped from container port 8000 |
| Admin Panel | http://localhost:5173 | |
| Vendor Panel | http://localhost:7001 | |
| Backend API | http://localhost:9000 | Container-internal: `http://backend:9000` |
| Kayi-Messenger | http://localhost:4000 | |
| MinIO Console | http://localhost:9001 | |
| MinIO API | http://localhost:9002 | |
| MeiliSearch | http://localhost:7700 | |
| PostgreSQL | localhost:5432 | user: postgres / pass: postgres |
| Redis | localhost:6380 | |

**Admin credentials:** `arikmertgida@gmail.com` / `19791979aa`

**Publishable key:** `pk_fb240b283e19519b1a6f3cb9b57f67442eaa1fcdb3ea77a24cad97e616727a84`

**Turkey region ID:** `reg_01KQBTE5Y6SFRQF29SDQWD6TQ5`

**MeiliSearch API key:** `masterKey_kayicom`

---

## 19. Completed Work
- [x] Auth bypass protection on all protected endpoints
- [x] Hardcoded secrets moved to environment variables
- [x] XSS sanitization with `isomorphic-dompurify`
- [x] Raw SQL queries replaced with MedusaJS Query API

### Phase 2 — Validation & Performance
- [x] Zod input validation on all mutation endpoints
- [x] N+1 query patterns fixed
- [x] Rate limiting added to critical endpoints
- [x] Pagination standardized across list endpoints

### Phase 3 — Code Quality
- [x] TypeScript `any` usage reduced
- [x] Duplicate code removed
- [x] Dead code audit completed

### TalkJS → Kayi-Messenger Migration
- [x] `talkjs` and `@talkjs/react` removed from storefront `package.json` and lockfile
- [x] `kayi-messenger` Express + Socket.io + Prisma service built
- [x] Storefront messaging components connected to kayi-messenger
- [x] All containers building and running healthy

### Build Infrastructure Fixes
- [x] `storefront/.npmrc` created with `shamefully-hoist=true`
- [x] `storefront/Dockerfile` updated to COPY `.npmrc` before `pnpm install`
- [x] `backend/src/api/reviewValidationMiddleware.ts` — removed broken `@mercurjs/reviews` import
- [x] `backend/src/api/store/review-replies/[id]/like/route.ts` — fixed incorrect relative import path
- [x] `kayi-messenger/package.json` — added missing `zod` and `express-rate-limit` dependencies

### Docker Optimization & Healthcheck Fixes (April 2026)
- [x] **Backend Dockerfile refactored to multi-stage build**
  - Before: 2.04GB image (root `node_modules` copied to runtime)
  - After: 1.04GB image (only `.medusa/server/` with prod deps)
  - `npm install --omit=dev --legacy-peer-deps` runs inside `.medusa/server/` in builder stage
- [x] **Removed `medusajs-launch-utils`** from `backend/package.json` (no longer needed)
- [x] **Storefront `output: 'standalone'`** added to `next.config.ts`
- [x] **Storefront Edge Runtime fix** — `MEDUSA_BACKEND_URL` baked into build:
  - `next.config.ts` `env` block added
  - `storefront/Dockerfile` `ARG MEDUSA_BACKEND_URL` + `ENV` added
  - `docker-compose.yml` build args updated
- [x] **Admin/vendor panel healthcheck fix** — `localhost` → `127.0.0.1` (IPv6 resolution issue)
- [x] **Storefront healthcheck fix** — removed unsupported `--max-redirect=10` flag, replaced with `wget -qO /dev/null`
- [x] **TRY currency + Türkiye region** created via `backend/src/scripts/add-try-currency.ts`
  - Region ID: `reg_01KQBTE5Y6SFRQF29SDQWD6TQ5`
  - All 9 containers confirmed `(healthy)`
