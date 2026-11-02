# ADR-008: Verification model

- **Status:** Accepted
- **Context:** Residency verification requires handling sensitive documents
  (rental agreements, rent receipts, utility bills, IDs). These must be stored
  securely, never exposed publicly, and accessible only to authorised
  moderators under audit.
- **Decision:** Model verification as `VerificationRequest` (status
  `PENDING/VERIFIED/REJECTED/EXPIRED`) with `VerificationDocument` rows that
  store only a **storage key** (never a URL). Files live in **private object
  storage** (Cloudflare R2 in production; mock storage for dev). Files are
  uploaded via **presigned direct-to-storage** URLs. The web app resizes and
  re-encodes images in the browser to strip metadata before upload.
  Moderators get **short-lived signed download URLs**, and every access and
  decision is **audit-logged**. Approval flips the linked review's verified
  badge without exposing evidence.
- **Consequences:**
  - ✅ Minimal data retention; sensitive files never traverse public APIs.
  - ✅ Signed URLs + RBAC + audit give controlled, traceable access.
  - ✅ Image compression reduces storage and strips location metadata (privacy).
  - ⚠️ Browser image processing must succeed before upload; direct API clients
    are responsible for stripping metadata from their own images.
- **Alternatives considered:** Storing files in Postgres (bloat, no CDN);
  public buckets (unacceptable); proxying all uploads (unnecessary bandwidth for
  documents).
