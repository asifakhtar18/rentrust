# RentTrust — Architecture

This document describes the system, module, and data architecture of the
RentTrust backend, plus the key lifecycles, security posture, and scaling and
failure-handling considerations.

---

## 1. System architecture

```
                 ┌───────────────────────────┐
   Browser  ───► │  Next.js frontend (Vercel) │
                 └─────────────┬─────────────┘
                               │ HTTPS (REST, /api/v1)
                 ┌─────────────▼─────────────┐        ┌──────────────┐
                 │   NestJS API (Fastify)    │  jobs  │  BullMQ       │
                 │   modular monolith        ├───────►│  worker       │
                 └───┬──────────┬────────┬───┘        └──────┬───────┘
                     │          │        │                   │
          ┌──────────▼──┐  ┌────▼────┐  ┌▼────────────┐  ┌───▼────────┐
          │ PostgreSQL  │  │  Redis  │  │ Object store │  │  (same DB) │
          │ + PostGIS   │  │ (cache, │  │  R2 / S3     │  └────────────┘
          └─────────────┘  │  queues)│  └──────────────┘
                           └─────────┘
```

- The **API** handles all synchronous request/response work.
- Heavy or deferrable work (trust-score recalculation, future email/indexing)
  is enqueued to **BullMQ** and processed by a **worker** running the same
  application wiring in a separate process.
- **PostgreSQL + PostGIS** is the system of record and also powers search and
  geospatial queries.
- **Redis** backs caching, rate limiting, and queues.
- **Object storage** (Cloudflare R2 in production) holds private verification
  and claim documents; the API never serves file bytes, only signed URLs.

## 2. Module architecture

A modular monolith (see ADR-001). Each domain is a NestJS module exposing a
service; controllers hold only HTTP concerns, services hold business logic, and
Prisma is the persistence layer. Cross-cutting infra is provided globally.

| Module          | Responsibility                                               |
| --------------- | ------------------------------------------------------------ |
| `config`        | Typed, env-driven configuration (single source of truth)     |
| `common`        | Guards, interceptors, filter, decorators, errors, pagination |
| `database`      | Prisma + Redis clients (global)                              |
| `events`        | In-process domain event bus (global)                         |
| `queue`         | BullMQ queues + connection (global)                          |
| `auth`          | Email/password auth, JWT, refresh rotation, RBAC             |
| `users`         | User persistence, resident profiles, data deletion           |
| `locations`     | Geography + locality intelligence                            |
| `properties`    | Canonical properties, aliases, PostGIS search                |
| `reviews`       | Structured reviews + lifecycle + anonymization               |
| `verification`  | Residency verification + documents                           |
| `trust-score`   | Scoring engine, worker, reference data                       |
| `search`        | Unified search behind a provider abstraction                 |
| `moderation`    | Reporting, queue, decisions, appeals, content flags          |
| `claims`        | Property claims + owner responses                            |
| `engagement`    | Saved properties + comparison                                |
| `analytics`     | Product analytics abstraction                                |
| `notifications` | In-app + email, mailer abstraction                           |
| `files`         | Storage abstraction + image compression                      |
| `audit`         | Append-only audit log (global)                               |
| `admin`         | Admin APIs + CSV import                                      |

**Dependency rules:** no circular dependencies; no business logic in
controllers or DTOs; repositories are not leaked between modules; shared
behaviour lives in the owning domain, not a generic "utils" dumping ground.

## 3. Database architecture

- **PostgreSQL** with the **PostGIS**, **pg_trgm**, and **uuid-ossp**
  extensions.
- **UUID** primary keys everywhere; `created_at` / `updated_at` on mutable
  tables; `deleted_at` soft-delete on entities that must be retained
  (users, properties, reviews).
- **Geometry**: `properties`, `localities`, and `addresses` carry a
  `geometry(Point,4326)` column maintained by triggers (constructor functions
  are not `IMMUTABLE` on all PostGIS builds, so generated columns are avoided),
  indexed with **GiST**.
- **Search**: `properties.search_vector` (trigger-maintained `tsvector`, GIN
  index) plus **trigram GIN** indexes on names and GIN indexes on alias arrays.
- **Integrity**: foreign keys, unique constraints, `CHECK` constraints
  (rating 1–5, score 0–100, confidence 0–1, sane `year_built`), and **partial
  unique indexes** (one active review per author+property; one active claim per
  claimant+role; a single active score configuration).
- Indexes mirror real query patterns: property location, canonical name,
  aliases, review `(property_id, status)` and `created_at`, user email,
  verification/claim status.

## 4. Authentication

- Email + password; passwords hashed with **argon2id**.
- **Access token**: short-lived JWT with `sub`, `email`, `roles`,
  `emailVerified`.
- **Refresh token**: opaque, random, stored only as a SHA-256 **hash**. Each
  use **rotates** it; presenting a replaced/revoked token (replay) revokes the
  entire session lineage.
- Email verification and password reset use single-use hashed tokens.
- Login and password-reset responses are **enumeration-safe**.
- Provider seams exist for OAuth (Google/Apple) and phone OTP (future).

## 5. Authorization

- **RBAC** with roles `USER / OWNER / MANAGER / MODERATOR / ADMIN`.
- Global `JwtAuthGuard` (honours `@Public()` / `@OptionalAuth()`) and
  `RolesGuard` (`@Roles(...)`, `ADMIN` satisfies any requirement).
- **Object-level** checks in services (e.g. you may only edit your own review;
  only an approved claimant may respond on a property).
- Authorization is always enforced server-side; the frontend never decides
  access.

## 6. Review lifecycle

```
DRAFT ──► PENDING_MODERATION ──► PUBLISHED ──► (HIDDEN | REMOVED)
                 │                   ▲   │
                 └──► REJECTED       └───┘ UNHIDE / RESTORE
UNDER_REVIEW is entered on report or appeal.
```

- Submission creates a `Review` + structured `ReviewAnswer` and goes to
  `PENDING_MODERATION` (or `DRAFT`).
- A moderator decision transitions state via an explicit table, records a
  `ModerationAction` (from/to + internal note), and resolves open reports.
- `PUBLISHED` computes the per-review overall and emits `REVIEW_PUBLISHED`
  (→ score recalculation + author notification).
- Public rendering exposes only a non-identifying alias, tenure, and dates.

## 7. Verification lifecycle

```
Client requests upload URL ─► uploads to object storage (or compressed image
proxied via API) ─► creates VerificationRequest (PENDING) with document keys
─► moderator reviews (signed download) ─► VERIFIED | REJECTED | EXPIRED
```

- Document bytes never pass through public APIs; only authorised roles get
  short-lived signed URLs, and access is audit-logged.
- On `VERIFIED`, the linked review is flagged verified (badge only — evidence
  stays private).

## 8. Trust score lifecycle

```
review published/removed/verified ─► DomainEvent ─► enqueue (BullMQ)
   ─► worker: TrustScoreEngine.recalculate(propertyId) ─► upsert PropertyScore
   ─► emit TRUST_SCORE_UPDATED
```

- Transparent, **weighted** mean of per-category averages across published
  reviews; weights are stored as data in an active `ScoreConfiguration`
  (changeable without a deploy).
- **Confidence** scales with sample size (`1 − e^(−n/k)`, `k = threshold/3`) so
  tiny samples are never presented as authoritative.
- Recalculation is **idempotent** and runs **asynchronously** — submitting or
  publishing a review never blocks on scoring.

## 9. Search architecture

- Behind a `SearchProvider` abstraction (ADR-006 companion). The PostgreSQL
  implementation blends full-text (`search_vector`), trigram similarity (fuzzy
  / prefix / typo tolerance), alias matching, and optional PostGIS geo
  distance.
- Swapping to Elasticsearch/OpenSearch later is a provider change, not a
  caller change.

## 10. Queue architecture

- BullMQ on a dedicated Redis connection. Jobs are **idempotent**, retried with
  exponential backoff (5 attempts), and cleaned up on completion/failure.
- Trust-score jobs are deduplicated per property via a stable `jobId`.
- The worker runs in-process in development and as a separate process in
  production.

## 11. Security

- Helmet security headers, configurable CORS, global rate limiting.
- Global validation (`whitelist` + `forbidNonWhitelisted` + transform);
  parameterised queries (Prisma + bound raw SQL) prevent SQL injection.
- File upload MIME + size validation; images re-encoded and EXIF-stripped.
- Secrets never logged (pino redaction); audit log never stores secrets,
  tokens, passwords, or document contents.
- Client-supplied `userId`, `role`, ownership, and verification status are
  never trusted.

## 12. Scaling

- The API is stateless → scale horizontally behind a load balancer.
- Workers scale independently of the API.
- Reads dominate; property pages and scores are cacheable (denormalised
  `PropertyScore`); Redis is used selectively, not as a blanket cache.
- Geospatial and search work is pushed into indexed SQL, never into app memory.

## 13. Failure handling

- Standardised error envelope; internal details and stack traces are never
  returned to clients.
- Readiness probe (`/ready`) gates traffic on DB + Redis health; liveness
  (`/health`) does not depend on downstream systems.
- Analytics and audit writes are best-effort and never break the primary
  operation.
- Queue retries with backoff and bounded attempts; idempotent jobs make retries
  safe. Dead-letter handling is a natural extension of the bounded-attempts
  policy.
