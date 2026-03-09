# HxRoom

White-Label Videocall-Plattform für Coaches im DACH-Markt.

## Voraussetzungen

- **Node.js** >= 20
- **pnpm** >= 10 (`corepack enable && corepack prepare pnpm@10.10.0 --activate`)
- **Docker & Docker Compose** (für PostgreSQL, Redis, LiveKit, Whisper)

## Setup

```bash
# Repository klonen
git clone <repo-url> && cd hxroom

# Dependencies installieren
pnpm install

# Umgebungsvariablen anlegen
cp .env.example .env

# Infrastruktur starten (PostgreSQL, Redis, etc.)
docker compose -f infra/docker-compose.dev.yml up -d

# Datenbank-Migrationen ausführen
pnpm db:generate && pnpm db:migrate
```

## Entwicklung starten

### Alles gleichzeitig

```bash
pnpm dev
```

Startet alle Apps parallel (API + alle Frontends).

### Einzelne Apps starten

```bash
# Backend API (NestJS) – http://localhost:3000
pnpm --filter api dev

# Coach-Backoffice – http://localhost:5173
pnpm --filter web dev

# Klienten-Subdomain – http://localhost:5174
pnpm --filter client dev

# Betreiber-Backoffice – http://localhost:5175
pnpm --filter admin dev

# Landingpage – http://localhost:5176
pnpm --filter landing dev
```

### Shared Packages

```bash
# Types & Schemas einmalig bauen
pnpm build:types

# Watch-Modus (bei aktiver Entwicklung an Shared-Types)
pnpm --filter @hxroom/shared dev
```

`@hxroom/ui` benötigt keinen Build-Schritt – Vite importiert die Quelldateien direkt aus dem Workspace.

## Build

```bash
# Alles bauen
pnpm build

# Einzelne App bauen
pnpm --filter api build
pnpm --filter web build
```

## Datenbank

```bash
# Schema ändern → Migration generieren
pnpm db:generate

# Migrationen ausführen
pnpm db:migrate
```

Das Drizzle-Schema liegt in `apps/api/src/db/schema.ts`.

## Projektstruktur

```
hxroom/
├── apps/
│   ├── api/            NestJS Backend          → api.hxroom.io
│   ├── web/            Coach-Backoffice        → app.hxroom.io
│   ├── client/         Klienten-Subdomain      → [slug].hxroom.io
│   ├── admin/          Betreiber-Backoffice    → admin.hxroom.io
│   └── landing/        Landingpage             → hxroom.io
├── packages/
│   ├── shared/         Gemeinsame Types & Zod-Schemas
│   └── ui/             Shared Theme, Nuxt UI Config & Vue-Komponenten
├── infra/
│   ├── docker-compose.yml        Produktion
│   ├── docker-compose.dev.yml    Lokale Entwicklung
│   ├── livekit/                  LiveKit-Konfiguration
│   ├── whisper/                  Whisper-Service
│   └── caddy/                    Reverse Proxy
└── doc/                Projektdokumentation
```

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Backend | NestJS, PostgreSQL, Drizzle ORM |
| Auth | better-auth + Organization Plugin |
| Frontend | Vue 3, Nuxt UI (Vue), Pinia |
| Video | LiveKit (self-hosted) |
| Speech2Text | Whisper / faster-whisper (self-hosted) |
| Monorepo | pnpm Workspaces |
| Deployment | Docker Compose auf Hetzner DE |
