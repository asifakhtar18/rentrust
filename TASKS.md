# RentTrust — Build Task Tracker

> "Know the place before you rent it."
>
> Indian rental-property intelligence & resident-review platform.
> Modular NestJS monolith (Fastify + Prisma + PostgreSQL/PostGIS + Redis/BullMQ)
> with a Next.js frontend. Built in phases; each phase ends green on
> typecheck + lint + build + unit + e2e before moving on.

**Progress: 13 / 15 phases complete.**

Current test tally: **36 unit tests + 65 e2e tests (101 total)**, all passing.

Storage: Cloudflare R2 (S3-compatible) in production via the S3 driver; images
are compressed and EXIF-stripped server-side (`sharp`, re-encoded to WebP)
before storage. Documents (PDFs) use presigned direct-to-storage uploads.

Deployment target: frontend on Vercel; backend (API + BullMQ worker) on a
container host (Render/Railway/Fly) with managed Postgres/PostGIS, Redis, and
S3-compatible object storage.

---

## Completed

### [x] Phase 1 — Project foundation
- npm-workspaces monorepo; `apps/api` NestJS 10 on Fastify, TypeScript strict.
- ESLint + Prettier, Jest, `tsconfig` strict flags.
- Typed `AppConfig` config module (env-driven, single source of truth).
- Common infra: error codes, typed `AppException`s, global exception filter,
  response envelope interceptor (`{ success, data, meta }`), cursor-pagination
  helpers, `@Public()` decorator.
- Pino structured logging with request IDs and secret redaction.
- Global rate limiting (Throttler), Helmet, CORS, URI versioning (`/api/v1`),
  Swagger at `/api/docs`.
- Health (`/health`) and readiness (`/ready`) probes.
- `.env.example` documenting every variable.

### [x] Phase 2 — Database
- Full Prisma schema: 36 app tables (users, sessions, resident profiles,
  geography, properties + aliases/canonical, reviews + answers, verification,
  claims, scores + config, moderation, owner responses, saved properties,
  notifications, audit logs, analytics events).
- UUID PKs, soft-delete, enums, FKs, unique + check constraints.
- PostGIS geometry columns (trigger-maintained), GiST spatial indexes,
  pg_trgm trigram indexes, full-text `search_vector`.
- Two migrations; reproducible from scratch via `prisma migrate reset`.

### [x] Phase 3 — Authentication & Authorization
- Email/password with argon2id hashing.
- JWT access tokens + opaque refresh tokens with rotation and reuse detection.
- Register, login, logout, refresh, email verification, password reset
  (enumeration-safe).
- RBAC: `USER / OWNER / MANAGER / MODERATOR / ADMIN`; global JWT + roles guards;
  `@Roles()`, `@CurrentUser()`, `@OptionalAuth()`.
- Mailer abstraction (console driver for dev, SMTP seam).

### [x] Phase 4 — Properties + locations
- Canonical property entities with aliases and duplicate detection.
- Countries / states / cities / localities / addresses.
- PostGIS radius / nearest search (parameterised, index-backed).
- Cursor pagination; admin-only writes, public reads.

### [x] Phase 5 — Reviews
- Structured 17-question review submission (no free-text-only reviews).
- Review state lifecycle (`DRAFT → PENDING_MODERATION → PUBLISHED → ...`).
- Per-review scoring helper (shared with trust score).
- Anonymous public rendering — reviewer identity never exposed (privacy
  invariant covered by tests).

### [x] Phase 6 — Verification
- Object-storage abstraction: mock driver (dev/test) + real S3/MinIO/R2 driver.
- Signed upload + download URLs; file bytes never proxied through the API.
- Verification requests/documents, admin decision flow; approval flips the
  linked review to verified.
- Documents are private — never returned on public APIs. Audit-logged.

### [x] Phase 7 — Trust score
- Configurable weighted scoring (weights stored as data, not code).
- Confidence scales with sample size; transparent per-category breakdown.
- Internal event bus + BullMQ async recalculation (publishing never blocks on
  scoring).
- Bootstrap reference data (categories + default score config) seeded on start.

### [x] Phase 8 — Search
- `SearchProvider` abstraction (swappable for Elasticsearch later).
- PostgreSQL implementation: full-text + trigram fuzzy + alias + PostGIS geo.
- Unified `/api/v1/search` across properties, landlords, localities.

### [x] Phase 9 — Moderation
- Review reporting (anonymous allowed), moderator queue with heuristic PII /
  abuse content flags (triage aid, never auto-censor).
- State-machine moderation decisions with recorded history (from/to + internal
  notes that never surface publicly).
- Appeals flow. Negative reviews are never auto-removed. Audit-logged.

### [x] Phase 10 — Owner claims & responses
- Property claim flow: upload evidence → request → admin approval grants the
  OWNER/MANAGER role and marks the property claimed.
- Owner responses to reviews: public and clearly labelled.
- Owners cannot edit, delete, suppress reviews, or see reviewer identity
  (enforced + tested).

### [x] Phase 11 — Admin
- Dashboard metrics (users, verified residents, reviews, verified reviews,
  properties, claimed properties, pending moderation, pending verification,
  open reports, active cities).
- Management: users (roles + suspend/activate), landlords, managers,
  landlord↔property linking, reports, analytics summary.
- CSV property import with per-row validation and dry-run mode.
- Score-weight settings (create/activate configurations; single-active upheld).
- All admin routes are ADMIN-only and namespaced under `/api/v1/admin`.

### [x] Phase 12 — Analytics, notifications, observability
- Analytics abstraction (DB provider now; Segment/PostHog swap-in later);
  public event-tracking endpoint (anonymous allowed).
- Notification service: in-app + email, driven by domain events
  (review published/removed/verified, claim approved).
- Saved properties, property comparison (2–4), and locality intelligence
  endpoints (closes spec sections 20–22).
- Observability: structured logs with request IDs and health/readiness probes
  already in place.

### [x] Phase 13 — Testing
- 10 e2e suites (65 tests) + unit tests (36) covering auth, authz, search,
  properties, reviews, verification, moderation, anonymity, owner response,
  claims, trust score, geo, pagination.
- Added isolated unit tests for the trust-score engine math (weighting,
  confidence curve, no-data path).

---

## Not completed

### [ ] Phase 14 — Deployment & docs  *(next)*
- Multi-stage `Dockerfile` for API + separate worker process.
- `docker-compose` for local Postgres/PostGIS + Redis + MinIO (present; finalize).
- Seed data: 20 properties, 10 landlords, 5 managers, 100 fictional reviews,
  multiple localities (clearly marked development data).
- OpenAPI/Swagger (live at `/api/docs`), `README`, `docs/architecture.md`,
  9 ADRs, GitHub Actions CI pipeline.

### [ ] Frontend — Next.js app (Apple-inspired design system)
- Customer pages: home, search, property, landlord, locality, compare, saved,
  multi-step review flow, profile.
- Admin pages: properties, reviews, moderation, verifications, claims, users.
- Modern, minimal, trustworthy, mobile-first.

---

## Known gaps to close (tracked)

- SMTP mailer is implemented as a clean adapter but exercised with the console
  driver in dev and tests; wire a real transport (nodemailer/SES/Resend) before
  production email.
- S3/R2 storage and image compression run against the mock storage driver in
  dev and tests; point `STORAGE_DRIVER=s3` at a real R2 bucket for production.
