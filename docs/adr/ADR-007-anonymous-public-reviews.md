# ADR-007: Anonymous public reviews

- **Status:** Accepted
- **Context:** Reviews concern real people and businesses. Residents must be
  able to review honestly without exposing their identity, while the platform
  still attributes reviews internally for moderation, verification, and abuse
  handling.
- **Decision:** Reviews are **publicly anonymous**. Every account has a
  non-identifying `publicAlias` ("Verified Resident #…"). A single
  anonymisation boundary (`ReviewsService.toPublic`) is the only shape returned
  on public surfaces; it emits alias, tenure, scores, tags, text, and dates —
  **never** `authorId`, email, phone, exact unit, or any identity field.
- **Consequences:**
  - ✅ Protects residents and encourages candid reviews.
  - ✅ Internal attribution is preserved for moderation/verification/audit;
    admins see identity only per role and audit controls.
  - ✅ Enforced by a test invariant: serialized public reviews must not contain
    the author id or email.
  - ⚠️ Any new public review field must pass through the same boundary; raw
    model objects must never be returned to the public.
- **Alternatives considered:** Real-name reviews (chills honesty, privacy risk);
  fully anonymous with no internal link (defeats verification/abuse handling).
