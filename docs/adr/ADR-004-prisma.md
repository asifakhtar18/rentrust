# ADR-004: Prisma

- **Status:** Accepted
- **Context:** We want a strongly-typed data layer with first-class migrations
  and good DX, while retaining the ability to drop to raw SQL for PostGIS and
  full-text queries.
- **Decision:** Use **Prisma** as the ORM, with **raw parameterised SQL**
  (`$queryRaw` with `Prisma.sql`) for geospatial and search queries.
- **Consequences:**
  - ✅ Type-safe models and queries; declarative schema; reliable migrations.
  - ✅ Raw SQL escape hatch covers PostGIS/`tsvector`/trigram where Prisma lacks
    native support — with bound parameters (injection-safe).
  - ⚠️ `$queryRaw` cannot deserialise `geometry`/`tsvector` columns, so geo/search
    queries select explicit columns and cast distances to `float8`.
  - ⚠️ On this Windows/Docker setup `prisma migrate dev` can hang on shadow-DB
    creation; migrations are generated with `migrate diff` and applied with
    `migrate deploy`.
- **Alternatives considered:** TypeORM (weaker type-safety/migrations); Drizzle
  (less mature at decision time); Knex (no model types).
