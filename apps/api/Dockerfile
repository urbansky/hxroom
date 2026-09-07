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
COPY apps/coach/package.json apps/coach/
COPY apps/bookingpage/package.json apps/bookingpage/
COPY apps/admin/package.json apps/admin/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
# `--filter @hxroom/api...`: Gebaut wird nur die API samt @hxroom/shared, die
# Abhängigkeiten der vier Frontends braucht dieses Image nicht (406 statt 1481 Pakete).
#
# `--ignore-scripts`, weil better-sqlite3 sonst kompiliert wird: Es hängt als optionaler
# Peer an better-auth und landet deshalb auch ohne apps/landing im Baum. Unter Alpine
# findet prebuild-install nicht immer ein Binary und fällt auf node-gyp zurück, das ohne
# Python abbricht – daran ist der Build einmal gescheitert. Die API lädt better-sqlite3
# nie (sie spricht Postgres). Von den drei Paketen in `onlyBuiltDependencies` braucht
# hier keines seinen Build: esbuild wird nur von drizzle-kit und vitest benutzt, nicht
# von `nest build`, und das Skript von @nestjs/core ist ein reiner Spendenhinweis.
RUN --mount=type=cache,id=pnpm-api-deps,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --filter @hxroom/api...

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
COPY apps/coach/package.json apps/coach/
COPY apps/bookingpage/package.json apps/bookingpage/
COPY apps/admin/package.json apps/admin/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
# Eigene Cache-ID: deps- und production-Stage laufen unter BuildKit parallel und
# schrieben zuvor in denselben pnpm-Store, was sich in die Quere kommen kann.
RUN --mount=type=cache,id=pnpm-api-prod,target=/pnpm/store pnpm install --frozen-lockfile --prod --ignore-scripts --filter @hxroom/api...
COPY --from=build /app/packages/shared/dist packages/shared/dist/
COPY --from=build /app/apps/api/dist apps/api/dist/
COPY --from=build /app/apps/api/drizzle apps/api/drizzle/
WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "dist/main"]

LABEL org.opencontainers.image.source="https://github.com/urbansky/hxroom"
LABEL org.opencontainers.image.description="HxRoom API Server"
