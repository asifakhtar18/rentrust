# RenTrust go-live readiness

**Assessment date:** 4 November 2026  
**Decision:** **Not ready for a public launch.** A controlled internal preview is appropriate after the database migration and environment checks below.

## What the product does

RenTrust is a resident-informed rental property directory for India. Renters search properties, landlords, and localities; read moderated resident reviews; and compare living details. The current stack is a Next.js frontend and NestJS API, PostgreSQL/PostGIS, Upstash Redis, and optional private document storage through the S3-compatible R2 adapter.

## Readiness by area

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Core renter experience | Partial | Account, property, review, moderation, and comparison flows exist. Run a production-like browser walkthrough with real roles and realistic data before launch. |
| Search | Improved in code | Search already used PostgreSQL full text and `pg_trgm`; live suggestions now call it while typing and ranking also considers trigram word similarity. Confirm `pg_trgm` is installed in the target database and tune against a representative India names/typos dataset. |
| Nearby discovery | Improved in code | Browser location is requested only after a user action; PostGIS nearby results are displayed with locality and distance. Verify coordinates and PostGIS indexes on the target database. |
| Locality coverage | In progress | A crowd suggestion form and moderator queue now exist. The new `LocalitySuggestion` migration is pending; deploy it before using the workflow. Seed a pilot city, watch duplicate/incorrect suggestions, and establish moderation response ownership. Do not try to load every Indian locality before launch. |
| Staff access | Partial | Admin and moderator roles are role-gated; the user screen now makes staff access explicit and saves deliberately. Assign a second trusted admin and verify that moderator access cannot reach admin-only screens/API routes. |
| Google Maps entry | Partial | The app parses coordinates and a place label already embedded in a secure Google Maps URL without an API key. Short links may not expose coordinates, and the app does not call Places/Geocoding APIs or fetch addresses/business details. Verify the pin before saving. |
| Email | Blocked pending configuration | Verification and password reset need a real SMTP/API provider and verified sender/domain. Add secrets only to deployment environment settings; confirm delivery, bounce handling, and reset links on the production domain. |
| Private documents | Held by the ₹0 requirement | R2 is optional in code, but its free allowance has no hard billable-overage cap. Keep document upload and deployment disabled until the owner accepts a capped/billable storage plan or chooses a provider with an enforceable spend cap. |
| Production deployment | Not verified | No production/preview end-to-end deployment was performed for this change. Confirm Vercel project roots/build commands, runtime compatibility, environment variables, CORS, domain, and API health/readiness endpoints. |
| Database history/connectivity | Blocked pending reconciliation | A read-only `prisma migrate status` attempt failed with a schema engine error. The configured `POSTGRES_URL_NON_POOLING` hostname reported by Prisma is a Supabase pooler host. Starting the API also failed with Prisma `P1001` against the configured Supabase pooler on port 6543. The checkout contains 13 untracked migrations with `worker_*` names plus the new locality migration. Correct/verify the direct and runtime connection strings, then reconcile every migration against Supabase `_prisma_migrations` and current schema before running deploy. Do not blindly apply/reset a production database. |
| Privacy and operations | Incomplete | Review consent/location copy, retention/deletion workflows, moderation appeals, incident contacts, backups/restore, and a privacy/legal policy for India before public onboarding. Location is currently sent to the API only for the explicit nearby request and is not retained by this UI. |

## Launch gates

1. Configure a real direct (non-pooler) Supabase connection for migrations, reconcile migration history against the real schema, and apply pending migrations through a reviewed release.
2. Configure production database/pooled URLs, Redis, JWT/session secrets, app origin, CORS, and email sender. Rotate any database credential previously exposed in local logs before production use.
3. Keep uploads off while the hard ₹0 storage requirement remains. Do not add a production R2 binding/credentials until the cost condition changes.
4. Populate one pilot city with verified properties/localities and operationalize the moderator queue. Expand city by city using community submissions and audited imports.
5. Complete role-based flows, search typo cases, nearby permission denial/empty states, email links, abuse/rate-limit checks, and database backup/restore on a preview deployment.
6. Obtain privacy/legal review and an incident/support owner before inviting the public.

## Suggested rollout

Start with a staff-only preview in one city. Invite a small resident group after the launch gates pass, measure locality coverage and moderation backlog, and add more cities when the catalogue and review team can support them. This keeps the directory useful without pretending a static list can enumerate every neighbourhood in India.
