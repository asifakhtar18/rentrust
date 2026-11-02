# ADR-001: Modular monolith

- **Status:** Accepted
- **Context:** RenTrust is an early-stage MVP with several cohesive domains
  (properties, reviews, verification, trust score, moderation, claims). We need
  clear boundaries without the operational cost of microservices.
- **Decision:** Build a **modular monolith** in NestJS. Each domain is a module
  exposing a service with a clear interface; controllers handle only HTTP,
  services hold business logic, Prisma handles persistence. Communication
  between domains uses direct service calls and an in-process event bus.
- **Consequences:**
  - ✅ Fast to build, test, and deploy as one unit; easy local development.
  - ✅ Strong internal boundaries make a future extraction to services feasible.
  - ✅ One database and transaction scope simplifies consistency.
  - ⚠️ Must enforce discipline (no circular deps, no repository leakage) to keep
    boundaries meaningful.
- **Alternatives considered:** Microservices (rejected: premature operational
  overhead for an MVP).
