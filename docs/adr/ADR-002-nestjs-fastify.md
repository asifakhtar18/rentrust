# ADR-002: NestJS + Fastify

- **Status:** Accepted
- **Context:** We need a TypeScript backend framework with first-class DI,
  modular structure, validation, and OpenAPI support, plus good throughput.
- **Decision:** Use **NestJS** with the **Fastify** adapter.
- **Consequences:**
  - ✅ NestJS gives DI, modules, guards/interceptors/pipes, and
    `@nestjs/swagger` doc generation that match our modular-monolith design.
  - ✅ Fastify offers higher throughput and lower overhead than Express, with a
    mature plugin ecosystem (helmet, cookie, multipart).
  - ⚠️ A few integrations are Express-first; we use Fastify-native plugins and
    typed request handling to avoid friction.
- **Alternatives considered:** NestJS + Express (lower throughput); bare Fastify
  (loses DI/module ergonomics); tRPC/Express (less structure for a multi-domain
  app).
