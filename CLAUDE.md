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
- Whisper-Job manuell triggern: POST /api/v1/sessions/:id/transcribe
- Neue Vue-App mit Theme: @hxroom/ui als Dependency, `hxroomUI()` in vite.config.ts, `import '@hxroom/ui/theme'` in main.ts
- Shared Komponente hinzufügen: in packages/ui/components/ anlegen, aus packages/ui/index.ts exportieren

## Videokonferenz
Die Videokonferenz (LiveKit) ist Teil der Klienten-Subdomain in `apps/room/`. Der Klient-Lifecycle Buchung → Warteraum → Videocall läuft vollständig in dieser App; die Coach-Seite des Calls (Einlassen-Button, Coach-Video-UI) liegt in `apps/coach/`. Token-Generierung und LiveKit-Webhooks in `apps/api/`, der LiveKit-Server unter `infra/livekit/`.

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
