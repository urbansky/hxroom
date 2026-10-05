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
COPY packages/livekit/package.json packages/livekit/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
# VITE_* werden zur Build-Zeit ins SPA-Bundle eingebettet
ARG VITE_API_URL=https://api.hxroom.de
ENV VITE_API_URL=$VITE_API_URL
# Fehlerüberwachung: DSN des GlitchTip-Projekts (öffentlich, keine Zugangsdaten) und Release
# für die Source Maps. Ohne DSN ist sie aus. Gesetzt von der CI.
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_RELEASE=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
# Seit B4 hängt die Klientenseite an der Call-Mechanik. Das Paket liefert TypeScript-
# Quelle, wird also nicht gebaut, muss aber im Kontext liegen.
COPY packages/livekit/ packages/livekit/
COPY packages/ui/ packages/ui/
COPY apps/bookingpage/ apps/bookingpage/
RUN pnpm --filter @hxroom/shared build
# Das GlitchTip-Token kommt als BuildKit-Secret (CI: secrets: sentry_auth_token) und landet weder
# in einer Image-Schicht noch in der History. Ohne Secret – lokaler Build – keine Source Maps.
ARG SENTRY_URL=https://errors.hxcode.io
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    SENTRY_URL="$SENTRY_URL" \
    pnpm --filter bookingpage build

# ---- Production ----
FROM nginx:alpine
COPY --from=build /app/apps/bookingpage/dist /usr/share/nginx/html
COPY apps/bookingpage/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

LABEL org.opencontainers.image.source="https://github.com/urbansky/hxroom"
LABEL org.opencontainers.image.description="HxRoom Klient-App (Buchung, Warteraum, Videocall)"
