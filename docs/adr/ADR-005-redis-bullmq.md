# ADR-005: Redis + BullMQ

- **Status:** Accepted
- **Context:** Trust-score recalculation (and future email, search indexing,
  aggregation) must not block user-facing requests, and must be retriable and
  idempotent.
- **Decision:** Use **Redis** with **BullMQ** for background jobs and an
  **in-process event bus** for domain-event fan-out. No Kafka in the MVP.
- **Consequences:**
  - ✅ Review publishing emits an event that enqueues a recalculation; the API
    returns immediately.
  - ✅ Jobs retry with exponential backoff and bounded attempts; idempotent jobs
    make retries safe; per-property `jobId` dedupes.
  - ✅ The worker runs in-process in dev and as a separate, independently-scaled
    process in production (same image/wiring).
  - ⚠️ Redis is a new operational dependency (also used for cache + rate limit).
- **Alternatives considered:** Kafka (overkill for MVP throughput); DB-backed
  queue (reinvents BullMQ); synchronous scoring (couples latency to review
  volume).
