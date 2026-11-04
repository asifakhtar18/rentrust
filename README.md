# RenTrust

> **Know the place before you rent it.**

RenTrust is an Indian rental-property intelligence and resident-review platform.
Renters can research properties, buildings, landlords, PGs, co-living spaces,
and localities using structured resident reviews, verification, transparent
trust scores, and locality intelligence.

The MVP is **SEARCH → RESEARCH → TRUST → DECIDE**. It is not a rental
marketplace: there are no rent collections, bookings, agreements, or payments.

## Product capabilities

- Search properties, landlords, PGs, co-living spaces, buildings, and localities.
- Review property profiles, trust scores, confidence, category breakdowns, and
  positive or negative themes.
- Submit structured reviews with a lifecycle and anonymous public rendering.
- Verify residency using private documents and moderator decisions.
- Report reviews, moderate content, appeal decisions, and audit actions.
- Support property claims and clearly labelled owner responses.
- Save and compare properties, and explore locality intelligence.
- Provide an admin dashboard, catalogue management, CSV import, and location
  setup.

## Architecture

- **Frontend:** Next.js App Router on Vercel (`apps/web`).
- **API:** NestJS + Fastify on Vercel Functions (`apps/api`).
- **Database:** Supabase PostgreSQL with PostGIS, provisioned through Vercel.
- **Redis:** Upstash Redis, provisioned through Vercel.
- **Private files:** Cloudflare R2 through its S3-compatible API. R2 is used
  only for file storage.
- **Trust-score recalculation:** inline on Vercel Functions; BullMQ remains
  available for long-running Node deployments.

See [`docs/architecture.md`](docs/architecture.md) for domain and data details.

## Prerequisites

- Node.js 22 or newer and npm.
- Optional Docker Desktop for local PostgreSQL/PostGIS and Redis.
- Vercel projects for `rentrust-web` and `rentrust-api`, with the Supabase and
  Upstash integrations connected to the API project.
- Cloudflare R2 credentials for private uploads and downloads.

## Install and run locally

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run db:generate
npm run db:migrate:deploy:local
npm run api
```

In a second terminal:

```powershell
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
npm run web
```

The API runs at `http://localhost:4000`; Swagger is at
`http://localhost:4000/api/docs`. The web app runs at `http://localhost:3000`.
Start the database and Redis before the migration/API commands. For local
infrastructure, `docker compose up -d postgres redis` is optional if you have
configured Supabase and Upstash in `.env.local`.

## Environment configuration

Copy `.env.example` to `.env.local` for local API development. Never commit
secret values. Vercel supplies the corresponding values through project
environment variables.

The API uses:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PRISMA_URL` or `DATABASE_URL` | Supabase pooled PostgreSQL URL |
| `POSTGRES_URL_NON_POOLING` | Direct URL for migrations and administrative database operations |
| `REDIS_URL` | Upstash Redis connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Production token signing secrets |
| `APP_URL`, `CORS_ORIGINS` | Public web origin and allowed browser origins |
| `STORAGE_DRIVER=s3` | Enable Cloudflare R2 file storage |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | R2 S3-compatible connection details |
| `EMAIL_DRIVER=smtp` and `SMTP_*` | Email verification, password reset, and notifications |
| `TRUST_SCORE_QUEUE_DRIVER=inline` | Recalculate scores within Vercel requests |

For production, configure R2 with a private bucket and short-lived presigned
URLs. Configure bucket CORS for the deployed web origin and the API methods
used for browser uploads. Do not expose R2 access keys to the frontend.
Cloudflare R2's free allowance can be exceeded and billed; it does not provide
a documented hard zero-charge cap. Keep document uploads and deployment on hold
while a hard zero-charge limit is required.

The local `.env.local` already contains `EMAIL_DRIVER`, `EMAIL_FROM`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`. Fill
the blank SMTP values there; the sender address key is `EMAIL_FROM`.

## Database

Generate Prisma Client and apply migrations with the direct Supabase URL from
`POSTGRES_URL_NON_POOLING` in `.env.local` (or `DATABASE_URL` for local Postgres):

```powershell
npm run db:generate
npm run db:migrate:status:local
npm run db:migrate:deploy:local
```

The local migration commands reject a direct URL that points to a different
Supabase project than `POSTGRES_PRISMA_URL`. The API uses the pooled URL for
requests. Apply migrations before starting the API on a new database.

The development seed creates fictional data. Never run it against a production
database.

## Vercel deployment

Use two Vercel projects:

1. `rentrust-web` with root directory `apps/web`.
2. `rentrust-api` with root directory `apps/api`, Node.js 22, and the API
   project's Supabase and Upstash integrations. Vercel recognizes the NestJS
   entrypoint at `src/main.ts` and runs the API as a Vercel Function.

The NestJS API entrypoint is `apps/api/src/app.ts`. Set
`NEXT_PUBLIC_API_BASE_URL` in the web project to the API deployment URL followed
by `/api/v1`. Set the API's `APP_URL` and `CORS_ORIGINS` to the exact web
origin. Configure the Supabase database, Redis, JWT, email, and R2 variables in
the API project before deploying a preview. Apply migrations before enabling
traffic. Keep Preview and Production secrets separate.

Vercel Hobby is intended for personal, non-commercial use. Supabase, Upstash,
and R2 have their own quotas and usage limits; review those limits before
launch.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Database-backed end-to-end tests require PostgreSQL/PostGIS, Redis, and the
environment variables described in `.env.example`.

## Repository layout

```text
apps/api/   NestJS API, Prisma schema/migrations, and domain modules
apps/web/   Next.js frontend
docs/       Architecture, ADRs, business model, and access model
```
