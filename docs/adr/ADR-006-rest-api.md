# ADR-006: REST API

- **Status:** Accepted
- **Context:** The API is consumed by a Next.js web frontend (and potentially
  mobile later). We want a predictable, documented, versioned contract.
- **Decision:** Expose a **REST API** versioned under `/api/v1`, documented with
  **OpenAPI/Swagger** generated from DTOs and decorators. Use a consistent
  response envelope and **cursor pagination** for large lists (offset only for
  bounded admin tables, documented).
- **Consequences:**
  - ✅ Simple, cacheable, broadly understood; auto-generated docs stay in sync.
  - ✅ Consistent `{ success, data, meta }` / `{ success, error }` envelope and
    stable machine-readable error codes.
  - ✅ URI versioning allows evolving the contract without breaking clients.
  - ⚠️ Over/under-fetching is managed per-endpoint (acceptable at MVP scope).
- **Alternatives considered:** GraphQL (added complexity, caching nuance not
  justified yet); tRPC (couples client to server types; weaker for public API).
- **Companion decision:** search is accessed via REST but implemented behind a
  `SearchProvider` abstraction so the engine can change without contract change.
