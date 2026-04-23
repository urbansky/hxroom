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
│   ├── api/          # NestJS Backend (api.hxroom.io)
│   ├── web/          # Coach-Backoffice (app.hxroom.io)
│   ├── client/       # Klienten-Subdomain ([slug].hxroom.io)
│   ├── admin/        # Betreiber-Backoffice (admin.hxroom.io)
│   └── landing/      # Landingpage (hxroom.io)
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
- [Technisches Konzept](doc/technisches-konzept.md)
- [Zeitplan](doc/zeitplan.md)
- [Pricing](doc/pricing.md)
- [Marketing](doc/marketing.md)
- [S3-Verzeichnisschema](doc/s3-verzeichnisschema.md)
- Funktionen:
  - [Coach-Backoffice](doc/funktionen/backoffice-coach.md)
  - [Betreiber-Backoffice](doc/funktionen/backoffice-betreiber.md)
