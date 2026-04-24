# HxRoom – Claude Code Kontext

## Stack
- Backend: NestJS, PostgreSQL, Drizzle ORM, better-auth + organization plugin, LiveKit (self-hosted)
- Speech2Text: Whisper (self-hosted, HTTP-API via faster-whisper)
- Frontend: Vue 3, Nuxt UI (Vue), Pinia, Shared Theme via @hxroom/ui
- Monorepo: pnpm workspaces
- Deployment: Docker Compose auf Hetzner DE

## Konventionen
- API-Endpunkte: REST, kebab-case, plural Ressourcen (/api/v1/bookings)
- DB-Schema: Drizzle, in apps/api/src/db/schema.ts
- DB-Migrations: pnpm db:generate && pnpm db:migrate
- Auth: better-auth Session, Guard via @UseGuards(AuthGuard)
- Fehlerbehandlung: NestJS HttpException mit deutschen Fehlertexten
- DSGVO: Kein Logging von personenbezogenen Daten ohne explizite Kennzeichnung

## Häufige Tasks
- Neues NestJS Modul: nest generate module <n>
- DB-Schema ändern: pnpm db:generate && pnpm db:migrate
- Typen generieren (shared): pnpm build:types
- Whisper-Job manuell triggern: POST /api/v1/sessions/:id/transcribe
- Neue Vue-App mit Theme: @hxroom/ui als Dependency, `hxroomUI()` in vite.config.ts, `import '@hxroom/ui/theme'` in main.ts
- Shared Komponente hinzufügen: in packages/ui/components/ anlegen, aus packages/ui/index.ts exportieren

## Projektstruktur
```
hxroom/
├── apps/
│   ├── api/          # NestJS Backend (api.hxroom.de)
│   ├── coach/        # Coach-Backoffice (app.hxroom.de)
│   ├── room/         # Klienten-Subdomain: Buchung, Warteraum, Videocall ([slug].hxroom.de)
│   ├── admin/        # Betreiber-Backoffice (admin.hxroom.de)
│   └── landing/      # Landingpage (hxroom.de)
├── packages/
│   ├── shared/       # Gemeinsame Types & Zod-Schemas
│   └── ui/           # Shared Theme, Nuxt UI Config & Vue-Komponenten
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── livekit/
│   ├── whisper/
│   └── caddy/
└── CLAUDE.md
```

## Ports (Entwicklung)
- api: 3000
- coach: 5173
- room: 5174
- admin: 5175
- landing: 5176

## Videokonferenz
Die Videokonferenz (LiveKit) ist Teil der Klienten-Subdomain in `apps/room/`. Der Klient-Lifecycle Buchung → Warteraum → Videocall läuft vollständig in dieser App; die Coach-Seite des Calls (Einlassen-Button, Coach-Video-UI) liegt in `apps/coach/`. Token-Generierung und LiveKit-Webhooks in `apps/api/`, der LiveKit-Server unter `infra/livekit/`.

## Pre-Launch: noindex in `landing` und `room`
Beide Apps führen aktuell einen Suchmaschinen-Ausschluss, solange HxRoom noch nicht öffentlich beworben wird:
- `<meta name="robots" content="noindex, nofollow" />` in `apps/landing/index.html` und `apps/room/index.html`
- `add_header X-Robots-Tag "noindex, nofollow, noarchive" always;` in `apps/landing/nginx.conf` und `apps/room/nginx.conf` (server-Block **und** `location /assets/`)

**Vor dem öffentlichen Launch** müssen diese vier Einträge entfernt werden – `grep -rn noindex apps/landing apps/room` findet alle Stellen auf einen Schlag.

**Bei größeren Änderungen an `apps/landing/` oder `apps/room/`** (neue öffentliche Seiten, SEO-Arbeiten, Launch-Vorbereitung, Landingpage-Umbau, o. Ä.): vor dem Loslegen kurz nachfragen, ob der noindex-Status noch gelten soll. Kleine Bugfixes und interne Refactorings brauchen die Rückfrage nicht.

## Dokumentation im Ordner `doc/`

Im Ordner `doc/` liegen die fachlichen und technischen Markdown-Dokumente zu **HxRoom**. Diese Dateien sind die maßgebliche Referenz für Architektur, Konzepte, Rollenmodell und technische Entscheidungen und müssen bei allen Aufgaben berücksichtigt werden.

**Lese-Pflicht:** Bevor du Code änderst oder neue Features umsetzt, prüfe die relevanten Dokumente in `doc/` und richte deine Vorschläge an deren Inhalten aus. Bei Widersprüchen zwischen Code und Dokumentation gilt die Dokumentation als Quelle der Wahrheit für die fachliche Absicht – weise auf den Widerspruch hin.

**Rollen-Terminologie (verbindlich):**
- **Betreiber** = Inhaber/Betreiber der Plattform (Stefan)
- **Coachs** = Kunden des Betreibers
- **Klienten** = Kunden der Coachs

Verwende diese Begriffe konsistent in Code, Kommentaren, Commits und neuen Dokumenten. Der Produktname ist immer **HxRoom**.

**Schreibrechte auf `doc/`:**
- **Technische Dokumente** (z. B. Architektur, API-Specs, Datenmodelle, Setup-Anleitungen, Build-/Deployment-Notizen): Du darfst diese eigenständig anpassen, erweitern oder korrigieren, wenn sich der Code oder die technische Realität ändert. Halte Änderungen knapp und nachvollziehbar.
- **Fachliche/konzeptionelle Dokumente** (Produktvision, Rollenmodell, Geschäftslogik, UX-Konzepte, Pricing, Marketing, Zeitplan): Nicht ohne Rücksprache ändern. Schlage Änderungen vor, statt sie selbst durchzuführen.

**Ignorieren:** Der Ordner `old/` (sofern vorhanden) ist veraltet und darf bei der Bearbeitung nicht berücksichtigt werden.

**Übersicht der Dokumente:**
- [Projektübersicht](doc/project.md)
- [Technisches Konzept](doc/technisches-konzept.md)
- [Zeitplan](doc/zeitplan.md)
- [Pricing](doc/pricing.md)
- [Marketing](doc/marketing.md)
- [S3-Verzeichnisschema](doc/s3-verzeichnisschema.md)
- Funktionen:
  - [Coach-Backoffice](doc/funktionen/backoffice-coach.md)
  - [Betreiber-Backoffice](doc/funktionen/backoffice-betreiber.md)
