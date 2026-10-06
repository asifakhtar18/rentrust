# ADR-008: Verification model

- **Status:** Accepted
- **Context:** Residency verification requires handling sensitive documents
  (rental agreements, rent receipts, utility bills, IDs). These must be stored
  securely, never exposed publicly, and accessible only to authorised
  moderators under audit.
- **Decision:** Model verification as `VerificationRequest` (status
  `PENDING/VERIFIED/REJECTED/EXPIRED`) with `VerificationDocument` rows that
  store only a **storage key** (never a URL). Files live in **private object
  storage** (Cloudflare R2 / S3; MinIO locally). Documents and PDFs are
  uploaded via **presigned direct-to-storage** URLs; images are **proxied
  through the API** solely to compress and EXIF-strip them before storage.
  Moderators get **short-lived signed download URLs**, and every access and
  decision is **audit-logged**. Approval flips the linked review's verified
  badge without exposing evidence.
- **Consequences:**
  - ✅ Minimal data retention; sensitive files never traverse public APIs.
  - ✅ Signed URLs + RBAC + audit give controlled, traceable access.
  - ✅ Image compression reduces storage and strips location metadata (privacy).
  - ⚠️ Image uploads cost some API bandwidth; documents avoid this via presign.
- **Alternatives considered:** Storing files in Postgres (bloat, no CDN);
  public buckets (unacceptable); proxying all uploads (unnecessary bandwidth for
  documents).
