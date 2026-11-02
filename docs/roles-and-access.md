# RenTrust — Roles, Accounts & Access Model

This document explains **how roles work**, **how each kind of account comes to
exist**, **where the routes live**, and **what each role can do** — grounded in
how the system is actually built in this repository.

---

## 1. The core principle: one signup, roles granted later

There is exactly **one** registration endpoint — `POST /api/v1/auth/register` —
and it is **public**. In `AuthService.register()` every new account is created
with the default role array `[USER]` (the Prisma `User.roles` column defaults to
`[USER]`).

**Nobody chooses their role at signup.** You cannot register "as an admin,"
"as a moderator," or "as an owner." Everyone becomes a plain `USER` first.
Higher roles are *granted afterward* through controlled paths.

This is deliberate security design: if signup let you pick your role, anyone
could self-appoint as admin. So the answer to *"how does an admin / moderator /
owner create an account?"* is always the same:

> They register a **normal account** exactly like everyone else, and then their
> account is **elevated** to the higher role through a controlled process.

The five roles (`UserRole` enum): `USER`, `OWNER`, `MANAGER`, `MODERATOR`,
`ADMIN`. Roles are stored as an **array**, so one account can hold several
(e.g. the seeded staff account holds `[USER, MODERATOR, ADMIN]`).

---

## 2. One application, not many

A frequent assumption is that admins/owners use a *different* app. They do not.

- **One frontend** (`apps/web`, Next.js) and **one backend** (`apps/api`,
  NestJS). There is **no** separate "admin app" or "owner portal" codebase.
- **Everyone logs in through the same `/login`**, with the same JWT and the same
  `/auth/me`.
- What differs is **what you can see and do after login**, gated by your roles.

Two layers enforce this:

1. **UI gating (convenience).** The `/admin/*` section is wrapped in an
   `AdminShell` that reads `user.roles`. Non-staff see a "Staff access only"
   screen; anonymous users are redirected to `/login` by middleware. Within the
   console, some sections are ADMIN-only (Claims, Users, Properties) and some
   are open to MODERATOR too (Moderation, Verifications).
2. **API gating (the real enforcement).** Every protected endpoint carries a
   `@Roles(...)` guard server-side (e.g. `@Roles(UserRole.ADMIN)` on property
   creation). Even if someone bypassed the UI, the API rejects them.

So it is **role-based views inside one application**, not multiple apps.
(Splitting the admin console into its own deployment is a possible future step,
but it is not how the system is built today.)

---

## 3. How each account/role is created

### 3.1 USER — the default
- **Route:** `POST /api/v1/auth/register` → the public `/register` page.
- **Result:** `roles: [USER]`.
- Everyone starts here: residents, future owners, and future staff alike.

### 3.2 OWNER / MANAGER — self-initiated, with proof + admin approval
This is the **only** elevation a user can start themselves, because it reflects
a real-world relationship (you own or manage a property):

1. Register as a normal USER.
2. Open the property in the catalogue and submit a **claim**
   (`POST /api/v1/properties/:id/claim`) with uploaded evidence
   (ownership / management documents).
3. An **admin reviews and approves** the claim in the admin console
   (`/admin/claims`).
4. On approval, `ClaimsService.decide()`:
   - grants the matching role (`OWNER` or `MANAGER`) by adding it to the user's
     `roles` array,
   - marks the property `isClaimed`,
   - links the user to the property.

An "owner account" is therefore just a USER account whose claim was approved.
There is **no** separate owner signup.

### 3.3 MODERATOR / ADMIN — granted by an existing admin only
- **Route:** an existing admin calls `PUT /api/v1/admin/users/:id/roles`
  (`AdminService.setUserRoles`), which sets the user's `roles` array.
- There is **no self-service path** to become staff. Signup can't grant it, and
  you can't "claim" your way to admin.

**The bootstrap problem:** because only an admin can create another admin, the
*very first* admin cannot be made through the app. It is created by registering
a normal account and then promoting it **directly in the database**:

```sql
UPDATE users
SET roles = ARRAY['USER','MODERATOR','ADMIN']::"UserRole"[]
WHERE email = 'admin@rentrust.local';
```

After that first admin exists, every subsequent moderator/admin is promoted
through the UI/API by that admin — no more direct DB edits needed.

---

## 4. Who can add a property?

**Property creation is ADMIN-only.** Owners do **not** create listings.

- `POST /api/v1/properties` (single) → `@Roles(UserRole.ADMIN)`
- `PATCH /api/v1/properties/:id`, `DELETE /api/v1/properties/:id` → ADMIN
- `POST /api/v1/admin/properties/import` (bulk CSV) → ADMIN

**Why owners can't self-list:** RenTrust is a trust/intelligence layer, not a
marketplace. The catalogue is **canonical and curated** so properties are
objective, deduplicated records that residents review. If owners could freely
create listings, the catalogue would fill with spam, duplicates, and
self-serving entries — poisoning the trust data that is the platform's whole
value.

### How an owner "gets" a property (flow is inverted from a listing site)
1. The property **already exists** in the catalogue (an admin added it,
   individually or via CSV import).
2. The owner **claims** that existing property with evidence.
3. Once approved, the owner can **respond to reviews** on it — a strictly
   bounded power: add a clearly-labelled public response only. Owners can
   **never** edit, delete, hide, or de-anonymise a review.
4. If a property isn't in the catalogue yet, the model is that it gets added by
   admin/ops — there is no owner-facing "create a listing" feature.

---

## 5. Feature matrix by role

Each row is a capability; ✅ = allowed, — = not available to that role.
Higher roles also inherit everything a plain USER can do (search, save, etc.).

| Capability | Anonymous | USER | OWNER / MANAGER | MODERATOR | ADMIN |
| --- | :---: | :---: | :---: | :---: | :---: |
| Search properties / landlords / localities | ✅ | ✅ | ✅ | ✅ | ✅ |
| View property profiles, trust scores, reviews | ✅ | ✅ | ✅ | ✅ | ✅ |
| View locality intelligence | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / log in | ✅ | — | — | — | — |
| Save properties | — | ✅ | ✅ | ✅ | ✅ |
| Compare properties | ✅ | ✅ | ✅ | ✅ | ✅ |
| Write a structured review | — | ✅ | ✅ | ✅ | ✅ |
| Submit residency verification | — | ✅ | ✅ | ✅ | ✅ |
| Claim a property (request OWNER/MANAGER) | — | ✅ | ✅ | ✅ | ✅ |
| Respond publicly to a review | — | — | ✅ (own property, approved claim) | — | ✅ |
| Moderation queue: publish/hide/reject reviews | — | — | — | ✅ | ✅ |
| Handle reports & appeals | — | — | — | ✅ | ✅ |
| Approve / reject residency verifications | — | — | — | ✅ | ✅ |
| Approve / reject property claims | — | — | — | — | ✅ |
| Create / edit / delete properties | — | — | — | — | ✅ |
| Bulk CSV property import | — | — | — | — | ✅ |
| View users table / search users | — | — | — | — | ✅ |
| Set a user's roles | — | — | — | — | ✅ |
| Activate / suspend a user | — | — | — | — | ✅ |
| Create landlords / managers, link to property | — | — | — | — | ✅ |
| Admin dashboard & analytics | — | — | — | ✅ (moderation views) | ✅ (full) |
| Configure trust-score weights | — | — | — | — | ✅ |

> **Hard invariant:** owners can respond but can **never** edit, delete,
> suppress, or de-anonymise a review, and can never buy or alter a trust score.
> Reviewer identity is never exposed to anyone outside trust & safety staff.

---

## 6. Route map

### 6.1 Public auth routes (`apps/api`, all `@Public()`)
| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account (always role USER) |
| POST | `/api/v1/auth/login` | Log in |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke a session |
| POST | `/api/v1/auth/verify-email` | Verify email with a token |
| POST | `/api/v1/auth/password-reset/request` | Request reset token |
| POST | `/api/v1/auth/password-reset/confirm` | Set new password |
| GET | `/api/v1/auth/me` | Current user (requires auth) |

### 6.2 Resident routes (require USER)
| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/me/saved` | List saved properties |
| POST/DELETE | `/api/v1/properties/:id/save` | Save / unsave |
| POST | `/api/v1/reviews` | Submit a structured review |
| GET | `/api/v1/me/reviews` | Own reviews (any status) |
| POST | `/api/v1/properties/:id/claim` | Claim a property |
| GET | `/api/v1/claims/mine` | Own claims |
| POST | `/api/v1/verifications` | Submit residency verification |
| GET | `/api/v1/verifications/mine` | Own verifications |

### 6.3 Owner / Manager routes
| Method | Route | Guard | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/reviews/:reviewId/owner-response` | OWNER / MANAGER / ADMIN + approved claim | Add/update a labelled public response |

### 6.4 Moderator / Admin routes
| Method | Route | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/moderation/queue` | MODERATOR / ADMIN | Reviews needing attention |
| GET | `/api/v1/moderation/reviews/:id` | MODERATOR / ADMIN | Full moderation view |
| POST | `/api/v1/moderation/reviews/:id/decision` | MODERATOR / ADMIN | Publish/hide/reject/etc. |
| POST | `/api/v1/moderation/reviews/:id/appeal-decision` | MODERATOR / ADMIN | Grant/deny appeal |
| GET | `/api/v1/verifications/admin/queue` | MODERATOR / ADMIN | Pending verifications |
| POST | `/api/v1/verifications/:id/decision` | MODERATOR / ADMIN | Verify / reject |

### 6.5 Admin-only routes
| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/dashboard` | Aggregated metrics |
| GET | `/api/v1/admin/users` | List / search users |
| PUT | `/api/v1/admin/users/:id/roles` | **Set a user's roles** |
| PUT | `/api/v1/admin/users/:id/status` | Activate / suspend |
| GET/POST | `/api/v1/admin/landlords`, `/api/v1/admin/managers` | List / create |
| POST | `/api/v1/admin/properties/import` | Bulk CSV import |
| POST | `/api/v1/properties` | Create a property |
| PATCH/DELETE | `/api/v1/properties/:id` | Edit / delete |
| GET | `/api/v1/claims/admin/queue` | Pending claims |
| POST | `/api/v1/claims/:claimId/decision` | Approve / reject claim |
| PUT | `/api/v1/admin/settings/score-weights` | Configure scoring |

### 6.6 Frontend routes (`apps/web`)
| Path | Access | Notes |
| --- | --- | --- |
| `/` | public | Home |
| `/search`, `/properties/[id]`, `/localities/[id]`, `/compare` | public | Research surfaces |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | public | Auth |
| `/saved`, `/profile` | USER (cookie-gated by middleware) | Resident surfaces |
| `/reviews/new?propertyId=…` | USER | Review wizard |
| `/admin`, `/admin/moderation`, `/admin/verifications` | MODERATOR / ADMIN | Role-gated by `AdminShell` |
| `/admin/claims`, `/admin/users`, `/admin/properties` | ADMIN | Role-gated by `AdminShell` |

> Route protection is layered: `src/middleware.ts` redirects anonymous visitors
> away from `/saved`, `/profile`, `/reviews/new`, `/admin`; the pages/`AdminShell`
> do role checks client-side; and the API enforces `@Roles(...)` regardless.

---

## 7. Lifecycle walkthroughs

### 7.1 Becoming an owner (end to end)
```
register (USER)
   → open property → submit claim with documents  (POST /properties/:id/claim)
   → admin reviews in /admin/claims
   → admin approves  (POST /claims/:claimId/decision { decision: APPROVED })
   → role OWNER/MANAGER granted, property marked claimed & linked
   → owner can now POST /reviews/:reviewId/owner-response on that property
```

### 7.2 Becoming a moderator or admin
```
register (USER)
   → an existing ADMIN opens /admin/users
   → admin sets roles  (PUT /admin/users/:id/roles { roles: [...] })
   → user now has MODERATOR / ADMIN access on next login/token refresh
```
First admin only: register, then promote via the SQL in §3.3.

### 7.3 A review from write to public
```
USER writes review  (POST /reviews)  → status PENDING_MODERATION (not public)
   → MODERATOR opens /admin/moderation
   → decision PUBLISH  (POST /moderation/reviews/:id/decision)
   → review goes public, trust-score engine recomputes the property score
```

---

## 8. Known gap (as currently built)

The backend endpoint to change a user's roles (`PUT /admin/users/:id/roles`)
**exists and works**, but the admin **Users** page (`/admin/users`) currently
only *displays* roles — it does not yet expose a UI control to change them. So
promoting a moderator/admin today is done via the API (or, for the first admin,
via the DB). Adding an inline role-editor to the Users page is a
straightforward follow-up.
