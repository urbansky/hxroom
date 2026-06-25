# HxRoom – Claude Code Kontext

## Stack
- Backend: NestJS, PostgreSQL, Drizzle ORM, better-auth + organization plugin, LiveKit (self-hosted)
- Speech2Text: Whisper (self-hosted, HTTP-API via faster-whisper)
- Frontend: Nuxt 4, Nuxt UI v4, Pinia, Shared Theme via @hxroom/ui
- Monorepo: pnpm workspaces
- Deployment: Docker Compose auf Hetzner DE

Nutze die better-auth-Dokumentation: https://better-auth.com/llms.txt (Backend und Frontend)

## Konventionen
- API-Endpunkte: REST, kebab-case, plural Ressourcen (/api/v1/bookings)
- DB-Schema: Drizzle, in apps/api/src/db/schema.ts
- DB-Migrations: pnpm db:generate && pnpm db:migrate
- Auth: better-auth Session, Guard via @UseGuards(AuthGuard)
- Fehlerbehandlung: NestJS HttpException mit englischen Fehlertexten
- DSGVO: Kein Logging von personenbezogenen Daten ohne explizite Kennzeichnung
- URL-Pfade: Immer Englisch (auch in der Coach-App). Anzeigetexte/Labels dürfen Deutsch sein, Routen nie (z. B. `/settings/account`, nicht `/einstellungen/account`)

## Nuxt UI (Frontend-Konventionen)

Alle Frontend-Apps (`coach`, `room`, `admin`, `landing`) verwenden **Nuxt 4** mit **Nuxt UI v4**.
Nutze die Nuxt-Dokumentation: https://nuxt.com/llms.txt
Nutze die Nuxt-UI-Dokumentation: https://ui.nuxt.com/llms.txt

Wichtigste Regeln:
- Semantische Farb-Aliases verwenden: `primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral` – keine direkten Tailwind-Farben (z. B. `gray-500`) in Props
- `neutral` statt `gray`/`black`/`white` als Farbreferenz
- `items`-Prop für Select, Breadcrumb, NavigationMenu etc.
- `v-model:open` für modal-artige Komponenten; Trigger im Default-Slot, Inhalt im `#content`-Slot
- `@update:modelValue` statt `@change` für Wert-Updates
- `:dismissible="false"` statt `prevent-close` zum Deaktivieren des Schließens
- Globale Theme-Overrides in `app.config.ts` unter `ui.colors`, `ui.theme.defaultVariants` und pro Komponente
- Design-Tokens wie `text-muted`, `text-highlighted` für automatisches Light/Dark-Mode-Support
- App mit `<UApp>` wrappen (wird für Toast, Tooltip etc. benötigt)

## Häufige Tasks
- Lokale Infrastruktur starten: `docker compose -f infra/docker-compose.dev.yml up -d`
- Apps starten: `pnpm dev` (alle) oder `pnpm --filter @hxroom/<app> dev`
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

Über Caddy (läuft in docker-compose.dev.yml) auch erreichbar als:
- http://api.hxroom.localhost → api
- http://app.hxroom.localhost → coach
- http://hxroom.localhost → landing
- http://admin.hxroom.localhost → admin

## Videokonferenz
Die Videokonferenz (LiveKit) ist Teil der Klienten-Subdomain in `apps/room/`. Der Klient-Lifecycle Buchung → Warteraum → Videocall läuft vollständig in dieser App; die Coach-Seite des Calls (Einlassen-Button, Coach-Video-UI) liegt in `apps/coach/`. Token-Generierung und LiveKit-Webhooks in `apps/api/`, der LiveKit-Server unter `infra/livekit/`.

## SEO & Crawler-Konfiguration (`landing`)

`apps/landing` ist öffentlich indexierbar. Nur Rechtsseiten sind ausgeschlossen:
- `impressum.vue` und `datenschutz.vue` haben `{ name: 'robots', content: 'noindex, follow' }` – das bleibt so.
- `apps/room` hat weiterhin noindex (Pre-Launch) – dort nichts ändern.

**robots.txt** (`apps/landing/public/robots.txt`) und **llms.txt** (`apps/landing/public/llms.txt`) müssen bei inhaltlichen Änderungen an der Landing-Page aktuell gehalten werden:
- Neue Seiten in `robots.txt` unter `Disallow` eintragen, wenn sie nicht indexiert werden sollen.
- Neue Funktionen, Preisänderungen oder FAQ-Antworten in `llms.txt` nachziehen, damit KI-Crawler (OAI-SearchBot, GPTBot, Perplexity) korrekte Daten liefern.

**noindex für `apps/room`:** `grep -rn noindex apps/room` findet alle Stellen. Vor dem öffentlichen Launch entfernen.

## Newsletter-Subscriber-Datenmodell (Referenz)

Aktuell postet das Early-Access-Newsletter-Formular der Landing-Page direkt zu Brevo (kein eigener API-Endpunkt mehr, kein Persistieren in der HxRoom-Datenbank). Wenn das später wieder serverseitig laufen soll – z. B. eigenes Double-Opt-In, eigene Subscriber-Liste in `apps/api`, Audit-Trail, Auswertung der Quelle – ist **dies** die verbindliche Datenstruktur. Neu angelegter Validierungs- oder Persistenz-Code muss exakt dieser Shape entsprechen:

```ts
// packages/shared/src/schemas/newsletter.ts (geplant, bei Re-Implementierung anlegen)
import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  name: z.string().min(1).max(160).optional(),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
```

Begleitende Punkte für die Re-Implementierung:
- DSGVO: zusätzlich `signupIp` und `signupAt` (sowie ggf. `confirmedAt`) **serverseitig** beim Empfang erfassen – **nicht** über das DTO entgegennehmen (Nachweispflicht der Einwilligung gem. Art. 7 DSGVO).
- `source` ist die einzige Stelle, die Quellen-Erweiterungen reflektiert; neue Einbauorte (z. B. `'blog'`, `'pricing-page'`) hier ergänzen.
- `name` ist bewusst optional, weil das Formular niedrigschwellig sein soll. `email` ist Pflicht.
- Der API-Endpunkt für die Subscription wurde zugunsten der direkten Brevo-Anbindung im Frontend entfernt. Wer ihn wieder einführt, sollte ihn unter `POST /api/v1/newsletter/subscribe` mit `ZodValidationPipe(subscribeSchema)` aufsetzen und den Re-Export aus `packages/shared/src/index.ts` wieder hinzufügen.

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
