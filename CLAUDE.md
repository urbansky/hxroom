# Sitzraum – Claude Code Kontext

## Stack
- Backend: NestJS, PostgreSQL, Drizzle ORM, better-auth + organization plugin, LiveKit (self-hosted)
- Speech2Text: Whisper (self-hosted, HTTP-API via faster-whisper)
- Frontend: Vue 3, Nuxt UI (Vue), Pinia, Shared Theme via @sitzraum/ui
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
- Neue Vue-App mit Theme: @sitzraum/ui als Dependency, `sitzraumUI()` in vite.config.ts, `import '@sitzraum/ui/theme'` in main.ts
- Shared Komponente hinzufügen: in packages/ui/components/ anlegen, aus packages/ui/index.ts exportieren

## Projektstruktur
```
sitzraum/
├── apps/
│   ├── api/          # NestJS Backend (api.sitzraum.de)
│   ├── web/          # Coach-Backoffice (app.sitzraum.de)
│   ├── client/       # Klienten-Subdomain ([slug].sitzraum.de)
│   ├── admin/        # Betreiber-Backoffice (admin.sitzraum.de)
│   └── landing/      # Landingpage (sitzraum.de)
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
- web: 5173
- client: 5174
- admin: 5175
- landing: 5176

## Dokumentation
Die folgenden Dokumente in `doc/` sind immer zu beachten:
- [Projektübersicht](doc/project.md)
- [Technische Architektur](doc/technical.md)
- [Backoffice (Admin)](doc/backoffice.md)
- [Betreiber-Backoffice](doc/betreiber-backoffice.md)
- UI-PoCs in `doc/ui-poc/`:
  - [Landingpage](doc/ui-poc/landingpage.html)
  - [Coach-Landing](doc/ui-poc/coach-landing.html)
  - [Video-Call](doc/ui-poc/video-call.html)
  - [Backoffice](doc/ui-poc/backoffice.html)
  - [Betreiber-Backoffice](doc/ui-poc/betreiber-backoffice.html)