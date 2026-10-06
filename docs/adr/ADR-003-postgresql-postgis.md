# ADR-003: PostgreSQL + PostGIS

- **Status:** Accepted
- **Context:** The product is inherently geospatial (radius/nearby/bounding-box
  queries over properties and localities) and relational (properties,
  landlords, reviews, claims). We also want full-text and fuzzy search without
  immediately adding a search cluster.
- **Decision:** Use **PostgreSQL** with the **PostGIS**, **pg_trgm**, and
  **uuid-ossp** extensions.
- **Consequences:**
  - ✅ One datastore serves relational data, geospatial queries (GiST indexes,
    `ST_DWithin`/`ST_Distance`), full-text (`tsvector`), and fuzzy search
    (trigram) — no premature Elasticsearch.
  - ✅ Strong consistency and transactions for review/score/claim workflows.
  - ⚠️ PostGIS constructor functions are not `IMMUTABLE` on all builds, so
    geometry columns are trigger-maintained rather than generated.
- **Alternatives considered:** MySQL (weaker geo/FTS); MongoDB (no native geo
  joins/transactions fit); Postgres + external search (deferred, see search
  abstraction).
