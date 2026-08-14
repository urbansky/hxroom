# HxRoom

White-Label Videocall-Plattform für Coaches im DACH-Markt.

## Voraussetzungen

- **Node.js** >= 20
- **pnpm** >= 10 (`corepack enable && corepack prepare pnpm@10.10.0 --activate`)
- **Docker & Docker Compose**

## Setup

```bash
# Repository klonen
git clone <repo-url> && cd hxroom

# Dependencies installieren
pnpm install

# Umgebungsvariablen anlegen
cp apps/api/.env.example apps/api/.env
cp apps/coach/.env.example apps/coach/.env
# .env-Dateien anpassen – insb. Secrets und gewünschte URLs (localhost vs. Caddy)

# Infrastruktur starten (PostgreSQL, Caddy, RustFS)
docker compose -f infra/docker-compose.dev.yml up -d

# Infrastruktur stoppen
docker compose -f infra/docker-compose.dev.yml down

# Datenbank-Migrationen ausführen
pnpm db:migrate
```

## Entwicklung starten

```bash
# Alle Apps gleichzeitig
pnpm dev

# Oder einzeln:
pnpm --filter @hxroom/api dev         # Backend API (NestJS)     → http://localhost:3000
pnpm --filter @hxroom/coach dev       # Coach-Backoffice         → http://localhost:5173
pnpm --filter @hxroom/bookingpage dev # Buchungsseite            → http://localhost:5174
pnpm --filter @hxroom/admin dev       # Betreiber-Backoffice     → http://localhost:5175
pnpm --filter @hxroom/landing dev     # Landingpage              → http://localhost:5176
```

### Lokaler Reverse Proxy (Caddy)

Caddy läuft im Dev-Container und routet `*.hxroom.localhost` auf die lokalen Ports:

| URL                             | App                  |
|---------------------------------|----------------------|
| http://hxroom.localhost         | Landingpage          |
| http://app.hxroom.localhost     | Coach-Backoffice     |
| http://anna.hxroom.localhost    | Buchungsseite        |
| http://api.hxroom.localhost     | Backend API          |
| http://admin.hxroom.localhost   | Betreiber-Backoffice |
| http://livekit.hxroom.localhost | LiveKit              |

`*.localhost`-Domains funktionieren auf macOS ohne `/etc/hosts`-Eintrag. Die Dev-Server müssen auf `0.0.0.0` lauschen (bereits in `nuxt.config.ts` konfiguriert).

### Objekt-Storage (RustFS)

RustFS ist der S3-kompatible Object Store für die lokale Entwicklung (siehe `doc/s3-verzeichnisschema.md`). Der Bucket `hxroom-files` wird beim Hochfahren automatisch angelegt.

- **Web-UI:** http://127.0.0.1:9001
- **Zugangsdaten:** `hxroom_dev` / `hxroom_dev_secret` (aus `infra/docker-compose.dev.yml`)
- **S3-API:** http://127.0.0.1:9000 (`S3_ENDPOINT` in `apps/api/.env`)

### Shared Packages

```bash
# Types & Schemas einmalig bauen
pnpm build:types

# Watch-Modus (bei aktiver Entwicklung an Shared-Types)
pnpm --filter @hxroom/shared dev
```

`@hxroom/ui` benötigt keinen Build-Schritt – Vite importiert die Quelldateien direkt aus dem Workspace.

## Datenbank

```bash
# Schema ändern → Migration generieren
pnpm db:generate

# Migrationen ausführen
pnpm db:migrate

# Drizzle Studio (lokale DB)
pnpm db:studio

# Testdaten für die lokale Entwicklung anlegen
pnpm db:seed
```

Das Drizzle-Schema liegt in `apps/api/src/db/schema.ts`.

### Testdaten (`pnpm db:seed`)

Legt zwei Demo-Coachs an, damit die Coach-App nicht leer startet – Passwort jeweils
`hxroom1234`:

| Coach | Login | Buchungsseite | Datenlage |
|---|---|---|---|
| Anna Bergmann | `anna@hxroom.test` | `http://anna.hxroom.localhost` | 4 Angebote, 9 Zeitfenster, 8 Klienten, ~27 Termine |
| Tobias Reinhardt | `tobias@hxroom.test` | `http://tobias.hxroom.localhost` | leer – für Empty-States und zum Prüfen der Mandantentrennung |

Annas Termine verteilen sich bewusst auf Vergangenheit, laufende Woche und die nächsten
vier Wochen und decken alle Status ab, sodass Wochenkalender, alle drei Agenda-Filter,
Klientenliste und Klientenprofil gefüllt sind.

Der Lauf ist wiederholbar: alle Datensätze tragen IDs mit dem Präfix `seed-`, und jeder
Lauf löscht zuerst genau diese. Selbst angelegte Accounts bleiben unangetastet. Gegen eine
nicht-lokale Umgebung verweigert das Skript den Dienst (Prüfung auf `BETTER_AUTH_URL` und
`NODE_ENV`).

Zwei Eigenheiten, die kein Fehler sind:

- Die unbestätigte Buchung wird vom `BookingExpiryService` nach 30 Minuten automatisch
  abgesagt. Für einen frischen „Wartet auf Bestätigung"-Zustand einfach erneut seeden.
- Der Avatar-Upload braucht RustFS (`docker compose -f infra/docker-compose.dev.yml up -d`).
  Fehlt er, läuft der Seed trotzdem durch und weist darauf hin.

### Produktionsdatenbank (Drizzle Studio)

Zugriff über SSH-Port-Forwarding. Einmalig in `~/.ssh/config` eintragen:

```
Host hxroom
    HostName 91.99.54.46
    User root
    LocalForward 5433 127.0.0.1:5432
```

Dann:

```bash
# 1. SSH-Tunnel öffnen (Terminal offen lassen)
ssh hxroom

# 2. Drizzle Studio mit Produktions-Env starten (neues Terminal)
pnpm --filter @hxroom/api db:studio:prod
```

Drizzle Studio öffnet sich unter `https://local.drizzle.studio` und verbindet sich über den Tunnel auf Port `5433` mit der Produktionsdatenbank. Das Produktionspasswort steht in `apps/api/.env.prod` (`POSTGRES_PASSWORD`).

## Build & Deployment

```bash
# Alles bauen
pnpm build

# Einzelne App bauen
pnpm --filter @hxroom/api build
pnpm --filter @hxroom/coach build
```

Deployment per Docker Compose auf Hetzner DE – siehe `infra/docker-compose.yml`.

## Projektstruktur

```
hxroom/
├── apps/
│   ├── api/            NestJS Backend          → api.hxroom.de
│   ├── coach/          Coach-Backoffice        → app.hxroom.de
│   ├── bookingpage/    Klienten-Subdomain      → [slug].hxroom.de
│   ├── admin/          Betreiber-Backoffice    → admin.hxroom.de
│   └── landing/        Landingpage             → hxroom.de
├── packages/
│   ├── shared/         Gemeinsame Types & Zod-Schemas
│   └── ui/             Shared Theme, Nuxt UI Config & Vue-Komponenten
├── infra/
│   ├── docker-compose.yml        Produktion
│   ├── docker-compose.dev.yml    Lokale Entwicklung (PostgreSQL + Caddy)
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
| Frontend | Vue 3, Nuxt 4, Nuxt UI v4, Pinia |
| Video | LiveKit (self-hosted) |
| Speech2Text | Whisper / faster-whisper (self-hosted) |
| Monorepo | pnpm Workspaces |
| Deployment | Docker Compose auf Hetzner DE |
