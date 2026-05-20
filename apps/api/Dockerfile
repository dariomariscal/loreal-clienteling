# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the L'Oreal Clienteling NestJS API.
# Build context must be the repo root (pnpm workspaces).
#   docker build -f apps/api/Dockerfile -t loreal-api .

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=10.8.0

# -----------------------------------------------------------------------------
# 1) base: enable corepack + pnpm
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# 2) build: install workspace deps, compile internal packages, then the API.
#    All in one stage so workspace node_modules (apps/api/node_modules and
#    packages/*/node_modules) are present when `tsc` / `nest build` run.
# -----------------------------------------------------------------------------
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/utils/package.json ./packages/utils/
COPY tooling ./tooling
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api

# Compile every internal package to dist/ so Node can resolve them in prod
# (their package.json `main` points to dist/index.js).
RUN pnpm -r --filter "./packages/*" run build

# Build the API (emits apps/api/dist/main.js).
RUN pnpm --filter @loreal/api build

# -----------------------------------------------------------------------------
# 3) prod-deps: install only production deps for the API + its workspace deps
# -----------------------------------------------------------------------------
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod --filter @loreal/api...

# -----------------------------------------------------------------------------
# 4) runtime: minimal image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Workspace layout preserved so symlinked workspace:* deps resolve at runtime.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Workspace packages: copy the compiled output (dist/) and package.json from
# the build stage so symlinks in node_modules resolve to real files.
COPY --from=build /repo/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /repo/packages/database/package.json ./packages/database/package.json
COPY --from=build /repo/packages/database/dist ./packages/database/dist
# node_modules so the release_command (tsx migrate.ts) can resolve drizzle-orm + pg.
COPY --from=prod-deps /repo/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /repo/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /repo/packages/domain/dist ./packages/domain/dist
COPY --from=build /repo/packages/utils/package.json ./packages/utils/package.json
COPY --from=build /repo/packages/utils/dist ./packages/utils/dist

# Compiled API output + drizzle migrations (needed by release_command).
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY packages/database/migrations ./packages/database/migrations
COPY packages/database/migrate.ts ./packages/database/migrate.ts
COPY packages/database/drizzle.config.ts ./packages/database/drizzle.config.ts

# Release-phase script (Fly release_command).
COPY apps/api/scripts/release.sh /usr/local/bin/release.sh
RUN chmod +x /usr/local/bin/release.sh

# tsx runs the migration script (release_command).
RUN npm install -g tsx@4.19.0

EXPOSE 3001
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
