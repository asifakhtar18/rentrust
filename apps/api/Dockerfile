# syntax=docker/dockerfile:1
# Multi-stage build for the RenTrust API. Produces a lean production image.

# ---- Base -------------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app
# OpenSSL is required by Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependencies (full, incl. dev) for building ----------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

# ---- Build ------------------------------------------------------------------
FROM deps AS build
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ---- Production dependencies only -------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev
# Prisma client must be generated against the installed client in prod-deps.
COPY apps/api/prisma apps/api/prisma
WORKDIR /app/apps/api
RUN npx prisma generate

# ---- Runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Run as the non-root node user.
WORKDIR /app/apps/api

# npm workspaces hoist dependencies to the root node_modules (including the
# generated Prisma client), so we copy that single tree.
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY apps/api/package.json ./package.json

USER node
EXPOSE 4000

# Start the API. Run migrations as a release/pre-deploy step on the host:
#   npx prisma migrate deploy   (the prisma CLI ships in node_modules/.bin)
CMD ["node", "dist/main.js"]
