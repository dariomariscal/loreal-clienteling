# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the L'Oreal Clienteling NestJS API.
# Build context must be the repo root (pnpm workspaces).
#   docker build -f apps/api/Dockerfile -t loreal-api .

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=10.8.0

# -----------------------------------------------------------------------------
# 1) base: enable corepack + pnpm, shared across stages
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# 2) deps: install full workspace deps (cached on lockfile changes)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/utils/package.json ./packages/utils/
COPY tooling ./tooling
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# 3) build: compile the NestJS app
# -----------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tooling ./tooling
COPY packages ./packages
COPY apps/api ./apps/api
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm --filter @loreal/api build

# -----------------------------------------------------------------------------
# 4) prod-deps: install only production deps for the API
# -----------------------------------------------------------------------------
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/utils/package.json ./packages/utils/
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile --prod --filter @loreal/api...

# -----------------------------------------------------------------------------
# 5) runtime: minimal image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Workspace layout preserved so symlinked workspace:* deps resolve at runtime.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /repo/packages ./packages
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Compiled output + drizzle migrations (needed if release_command runs in-image).
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY packages/database/migrations ./packages/database/migrations
COPY packages/database/migrate.ts ./packages/database/migrate.ts
COPY packages/database/drizzle.config.ts ./packages/database/drizzle.config.ts

# tsx is needed for the migrate runner (release_command). It lives in the
# packages/database devDependencies, so include it in the runtime image.
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate && \
    npm install -g tsx@4.19.0

EXPOSE 3001
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
