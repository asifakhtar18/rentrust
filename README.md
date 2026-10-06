# RentTrust

> **Know the place before you rent it.**

RentTrust is an Indian rental-property **intelligence and resident-review**
platform. A renter can research a property, building, landlord, PG, co-living
space, or locality _before_ deciding to rent — combining property information,
structured resident reviews, verification, transparent property-level trust
scores, and locality intelligence.

The MVP is **SEARCH → RESEARCH → TRUST → DECIDE**. It is _not_ a rental
marketplace: no rent collection, bookings, broker marketplace, agreements, or
payments.

> ⚠️ The name "RentTrust" is provisional and easy to replace.

---

## Table of contents

- [Product](#product)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Database, migrations, seed](#database-migrations-seed)
- [Running locally](#running-locally)
- [Testing](#testing)
- [API documentation](#api-documentation)
- [Docker](#docker)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Architecture decisions](#architecture-decisions)

---

## Product

- **Search** properties, landlords, PGs, co-living spaces, buildings, localities.
- **Property profiles** with a transparent **Resident Trust Score** (per-category
  breakdown, sample size, confidence), positive/negative themes, and reviews.
- **Structured reviews** (17 questions, not free-text-only) with a clear
  lifecycle and **anonymous public rendering** — reviewer identity is never
  exposed.
- **Verification** of residency via private documents (object storage; signed
  URLs; never public).
- **Moderation** with reporting, a moderator queue, heuristic PII/abuse flags,
  decision history, and appeals. Negative reviews are never auto-removed.
- **Property claims** and **owner responses** (clearly labelled; owners cannot
  edit/delete reviews or see reviewer identity).
- **Saved properties**, **comparison**, and **locality intelligence**.
- **Admin** dashboard, management, and CSV import.

Initial geography: Bengaluru (HSR Layout, Koramangala, Bellandur, Whitefield,
Marathahalli). Multi-city/state/country ready — nothing is hard-coded to one
city.

## Architecture

A **modular monolith** (NestJS) with clear domain modules, backed by PostgreSQL
+ PostGIS and Redis/BullMQ for background work. A Next.js frontend consumes the
REST API. See [`docs/architecture.md`](docs/architecture.md) for the full
picture and [`docs/adr`](docs/adr) for decision records.

```
apps/
  api/   NestJS API + BullMQ worker (this repo's backend)
  web/   Next.js frontend (Apple-inspired design)   ← built last
docs/
  architecture.md
  adr/   ADR-001 … ADR-009
```

## Tech stack

| Area            | Choice                                             |
| --------------- | -------------------------------------------------- |
| Language        | TypeScript (strict)                                |
| API framework   | NestJS on **Fastify**                              |
| Database        | PostgreSQL + **PostGIS**                           |
| ORM             | **Prisma**                                         |
| Cache / queues  | Redis + **BullMQ**                                 |
| Auth            | JWT access + rotating refresh, **argon2** hashing  |
| Object storage  | S3-compatible — **Cloudflare R2** (prod) / MinIO   |
| Images          | Server-side compression via **sharp** (WebP, EXIF-stripped) |
| Search          | PostgreSQL full-text + pg_trgm + PostGIS           |
| Docs            | OpenAPI / Swagger                                  |
| Tests           | Jest (unit + e2e)                                  |
| Frontend        | Next.js (App Router) + Tailwind — deployed to Vercel |

## Prerequisites

- **Node.js ≥ 20**
- **Docker** (for local PostgreSQL/PostGIS, Redis, MinIO)
- npm (repo uses npm workspaces)

## Installation

```bash
git clone <repo-url> rentrust
cd rentrust
npm install
cp .env.example .env   # adjust as needed
```

## Environment variables

All variables are documented in [`.env.example`](.env.example). Key ones:

| Variable                                   | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL/PostGIS connection string     |
| `REDIS_URL`                                | Redis connection (cache + BullMQ)        |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets (required in prod)   |
| `STORAGE_DRIVER`                           | `mock` (dev) or `s3` (R2/S3/MinIO)       |
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` …    | Object storage (see R2 block in example) |
| `EMAIL_DRIVER`                             | `console` (dev) or `smtp`                |
| `IMAGE_COMPRESSION_*`                      | Image downscale/quality settings         |
| `TRUST_SCORE_MIN_REVIEWS`                  | Sample size for full score confidence    |

Secrets are **never** committed. In production, strong secrets are **required**
(the app refuses to boot with dev defaults when `NODE_ENV=production`).

## Database, migrations, seed

Start infra and apply the schema:

```bash
docker compose up -d postgres redis        # (+ minio if using s3 locally)
npm run db:generate                        # generate Prisma client
npm run db:migrate:deploy                  # apply migrations
npm run db:seed                            # OPTIONAL: fictional dev data
```

> The seed inserts **clearly fictional** development data (20 properties, 10
> landlords, 5 managers, 100 reviews, 5 localities) and computes trust scores.
> Never run it against production.

## Running locally

```bash
# Terminal 1 — infra
docker compose up -d postgres redis

# Terminal 2 — API (http://localhost:4000, docs at /api/docs)
npm run api
```

The trust-score **worker** runs in-process in development. In production it runs
as a separate process (`node dist/worker.js`).

## Testing

```bash
npm run test                 # unit tests (all workspaces)
# e2e needs infra + env:
cd apps/api
DATABASE_URL=postgresql://rentrust:rentrust@localhost:5432/rentrust?schema=public \
REDIS_URL=redis://localhost:6379 \
JWT_ACCESS_SECRET=test-access JWT_REFRESH_SECRET=test-refresh NODE_ENV=test \
npm run test:e2e
```

Current coverage: **36 unit + 65 e2e tests** across auth, authorization, search,
properties, reviews, verification, moderation, review anonymity, owner
responses, claims, trust score, geospatial queries, and pagination.

## API documentation

With the API running, open **`http://localhost:4000/api/docs`** for interactive
Swagger/OpenAPI docs generated from the DTOs and decorators. All endpoints are
versioned under `/api/v1`.

Every response uses a consistent envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ }, "meta": { "requestId": "…" } }
// error
{ "success": false, "error": { "code": "PROPERTY_NOT_FOUND", "message": "…" } }
```

## Docker

```bash
# Infra only (recommended for local dev)
docker compose up -d

# Full stack (infra + API + worker) via the "app" profile
docker compose --profile app up -d --build
```

The API image is multi-stage and runs as a non-root user. The **same image**
runs the worker with `command: ["node", "dist/worker.js"]`.

## Deployment

- **Frontend → Vercel** (`apps/web`).
- **Backend → container host** (Render / Railway / Fly / ECS): run the API and a
  separate **worker** process from the same image.
- **Managed services**: PostgreSQL + PostGIS (e.g. Neon/Supabase/RDS), Redis
  (e.g. Upstash), object storage (**Cloudflare R2**).
- CI (GitHub Actions) lints, typechecks, tests, builds, and produces a
  deploy-ready Docker image on `main`. It does **not** auto-deploy.

## Project structure

```
apps/api/src/
  common/        guards, interceptors, filters, decorators, errors, pagination
  config/        typed configuration
  database/      Prisma + Redis services
  events/        in-process domain event bus
  queue/         BullMQ queues
  auth/          authentication + RBAC
  users/ residents/
  locations/     countries/states/cities/localities (+ locality intelligence)
  properties/    canonical properties, aliases, PostGIS search
  reviews/       structured reviews + lifecycle
  verification/  residency verification + documents
  trust-score/   scoring engine + worker + reference data
  search/        unified search (provider abstraction)
  moderation/    reporting, queue, decisions, appeals
  claims/        property claims + owner responses
  engagement/    saved properties + comparison
  analytics/     product analytics abstraction
  notifications/ in-app + email + mailer abstraction
  files/         storage abstraction (mock / S3-R2) + image compression
  audit/         append-only audit log
  admin/         admin APIs + CSV import
```

## Architecture decisions

See [`docs/adr`](docs/adr):

- ADR-001 Modular monolith
- ADR-002 NestJS + Fastify
- ADR-003 PostgreSQL + PostGIS
- ADR-004 Prisma
- ADR-005 Redis + BullMQ
- ADR-006 REST API
- ADR-007 Anonymous public reviews
- ADR-008 Verification model
- ADR-009 Trust score calculation
