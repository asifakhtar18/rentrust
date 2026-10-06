# ADR-009: Trust score calculation

- **Status:** Accepted
- **Context:** The Resident Trust Score is the product's core signal. It must be
  **transparent** (not a black box), resistant to tiny-sample distortion,
  tunable without code changes, and computed without blocking review
  submission.
- **Decision:**
  - Score = **weighted mean of per-category averages** across a property's
    `PUBLISHED` reviews, scaled to 0–100. Categories: management (25%),
    maintenance (15%), deposit (10%), communication (10%), safety (10%),
    condition (10%), rules (10%), experience (10%).
  - **Weights are data**, stored in an active `ScoreConfiguration` (a single
    active config enforced by a partial unique index); they can change without a
    deploy, and the breakdown is exposed per category with sample sizes.
  - **Confidence** = `1 − e^(−n/k)`, `k = TRUST_SCORE_MIN_REVIEWS/3`, so a
    1-review property is low-confidence and a property at/above the threshold is
    high-confidence. The API surfaces "Not enough verified resident data yet"
    when there is no score.
  - Recalculation is **event-driven, asynchronous (BullMQ), and idempotent**;
    the denormalised `PropertyScore` is read by property/locality endpoints.
- **Consequences:**
  - ✅ Explainable scores; tunable policy; no tiny-sample over-claiming.
  - ✅ Submission latency is independent of scoring; retries are safe.
  - ⚠️ Scores are eventually consistent (seconds) after a review change —
    acceptable and expected for this domain.
- **Alternatives considered:** Simple star average (opaque, sample-blind);
  synchronous scoring (couples latency to review volume); ML "AI score"
  (rejected — not transparent).
