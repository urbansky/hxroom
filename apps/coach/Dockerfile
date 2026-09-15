# ---- Base ----
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache python3 make g++

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
# NUXT_PUBLIC_* werden zur Build-Zeit ins SPA-Bundle eingebettet
ARG NUXT_PUBLIC_API_URL=https://api.hxroom.de/api/v1
ARG NUXT_PUBLIC_AUTH_URL=https://api.hxroom.de
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL
ENV NUXT_PUBLIC_AUTH_URL=$NUXT_PUBLIC_AUTH_URL
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
# Seit B5 hängt der Call-Screen an der Call-Mechanik. Das Paket liefert TypeScript-Quelle
# und wird nicht gebaut, muss aber im Kontext liegen.
COPY packages/livekit/ packages/livekit/
COPY packages/ui/ packages/ui/
COPY apps/coach/ apps/coach/
RUN pnpm --filter @hxroom/shared build
RUN pnpm --filter @hxroom/coach build

# ---- Production ----
FROM nginx:alpine
COPY --from=build /app/apps/coach/.output/public /usr/share/nginx/html
COPY apps/coach/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

LABEL org.opencontainers.image.source="https://github.com/urbansky/hxroom"
LABEL org.opencontainers.image.description="HxRoom Coach Backoffice"
