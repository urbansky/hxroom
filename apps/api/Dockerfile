# ---- Base ----
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/client/package.json apps/client/
COPY apps/admin/package.json apps/admin/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
RUN pnpm --filter @hxroom/shared build
RUN pnpm --filter api build

# ---- Production ----
FROM base AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/client/package.json apps/client/
COPY apps/admin/package.json apps/admin/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/shared/dist packages/shared/dist/
COPY --from=build /app/apps/api/dist apps/api/dist/
WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "dist/main"]

LABEL org.opencontainers.image.source="https://github.com/hxroom/hxroom"
LABEL org.opencontainers.image.description="HxRoom API Server"
