# HxRoom – Roadmap

*Stand: März 2026*

---

## Übersicht

9 Phasen von Fundament bis Pro-Features. Phasen 1–4 bilden den **MVP-Kern** (Branding → Buchung → Videocall), Phasen 5–9 sind **Post-MVP**.

```
MVP-Kern                          Post-MVP
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│ 1 Fundament                  │  │ 5 Nachbereitung                      │
│ 2 Auth & Profil              │  │ 6 Speech-to-Text                     │
│ 3 Buchung                    │  │ 7 CRM                                │
│ 4 Videocall                  │  │ 8 Billing                            │
│                              │  │ 9 Pro-Features                       │
└──────────────────────────────┘  └──────────────────────────────────────┘
```

---

## Phase 1 – Fundament

**Ziel:** Lauffähiges Monorepo mit DB, Auth-Vorbereitung und Docker-Infrastruktur.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 1.1 | Monorepo & pnpm Workspaces | `package.json`, `pnpm-workspace.yaml` | ✅ |
| 1.2 | App-Scaffolds (API, Web, Client, Landing, Admin) | `apps/*` | ✅ |
| 1.3 | Shared-Packages (Types, UI-Theme) | `packages/shared/`, `packages/ui/` | ✅ |
| 1.4 | Docker Compose (Dev + Prod) | `infra/docker-compose.yml`, `infra/docker-compose.dev.yml` | ✅ |
| 1.5 | LiveKit & Whisper Docker-Config | `infra/livekit/`, `infra/whisper/` | ✅ |
| 1.6 | Caddy Reverse Proxy | `infra/caddy/Caddyfile` | ✅ |
| 1.7 | Health-Endpoint | `apps/api/src/health/` | ✅ |
| 1.8 | Shared UI-Theme (Nuxt UI) | `packages/ui/theme/`, `packages/ui/vite.ts` | ✅ |
| 1.9 | Client-App PoC (CoachLandingView) | `apps/client/src/views/CoachLandingView.vue` | ✅ |
| 1.10 | Dockerfile API (NestJS, multi-stage) | `apps/api/Dockerfile` | ✅ |
| 1.11 | Dockerfile Web (Vite build + static serve) | `apps/web/Dockerfile` | ✅ |
| 1.12 | Dockerfile Client | `apps/client/Dockerfile` | ✅ |
| 1.13 | Dockerfile Admin | `apps/admin/Dockerfile` | ✅ |
| 1.14 | Dockerfile Landing | `apps/landing/Dockerfile` | ✅ |
| 1.15 | Docker Compose: App-Services einbinden | `infra/docker-compose.yml` | ✅ |
| 1.16 | GitHub-Repo & Remote einrichten | GitHub | ✅ |
| 1.17 | GitHub Actions (Docker Build & Push: Client, Landing) | `.github/workflows/docker-build.yml` | ✅ |
| 1.18 | Hetzner Server einrichten (Docker, Caddy, DNS) | `infra/` | ✅ |
| 1.19 | GitHub Actions (CD: Deploy auf Hetzner) | `.github/workflows/` | ⬜ |

---

## Phase 2 – Auth & Profil

**Ziel:** Coaches können sich registrieren, einloggen und ihr Branding konfigurieren. Subdomain-Routing steht.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 2.1 | better-auth Integration (Server) | `apps/api/src/auth/` | ⬜ |
| 2.2 | better-auth Organization Plugin | `apps/api/src/auth/` | ⬜ |
| 2.3 | Drizzle-Schema: `coach_profiles` | `apps/api/src/db/schema.ts` | ⬜ |
| 2.4 | AuthGuard für geschützte Routen | `apps/api/src/auth/auth.guard.ts` | ⬜ |
| 2.5 | Login / Registrierung UI (Web) | `apps/web/src/views/Auth*.vue` | ⬜ |
| 2.6 | Coach-Profil & Branding-Setup UI | `apps/web/src/views/BrandingView.vue` | ⬜ |
| 2.7 | Subdomain-Routing (Client-App) | `apps/client/src/router/` | ⬜ |
| 2.8 | Slug-basierte Coach-Auflösung | `apps/api/src/coach/coach.controller.ts` | ⬜ |
| 2.9 | Logo-Upload → S3 (StorageModule) | `apps/api/src/storage/` | ⬜ |

---

## Phase 3 – Buchung

**Ziel:** Klienten können über die Coach-Subdomain Termine buchen. Automatische E-Mail-Bestätigung und Erinnerungen.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 3.1 | Drizzle-Schema: `bookings`, `availability_slots`, `clients`, `reminder_jobs` | `apps/api/src/db/schema.ts` | ⬜ |
| 3.2 | AvailabilityModule (CRUD + Logik) | `apps/api/src/availability/` | ⬜ |
| 3.3 | BookingModule (CRUD + Token-Generierung) | `apps/api/src/booking/` | ⬜ |
| 3.4 | ClientModule (Klienten anlegen/finden) | `apps/api/src/client/` | ⬜ |
| 3.5 | E-Mail-Service (Resend) | `apps/api/src/email/` | ⬜ |
| 3.6 | E-Mail-Templates (Bestätigung, Erinnerung) | `apps/api/src/email/templates/` | ⬜ |
| 3.7 | BullMQ Setup + Reminder-Worker | `apps/api/src/jobs/` | ⬜ |
| 3.8 | Buchungsseite UI (Client-App) | `apps/client/src/views/BookingView.vue` | ⬜ |
| 3.9 | Verfügbarkeiten-UI (Web-App) | `apps/web/src/views/AvailabilityView.vue` | ⬜ |
| 3.10 | Kalenderansicht (Web-App) | `apps/web/src/views/CalendarView.vue` | ⬜ |

---

## Phase 4 – Videocall

**Ziel:** Funktionierender 1:1 Videocall mit Warteraum, Coach-Einlass und sauberer Session-Beendigung.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 4.1 | LiveKit-Service (Token-Generierung, Room-Management) | `apps/api/src/livekit/` | ⬜ |
| 4.2 | Warteraum-Backend (SSE für Coach-Notification) | `apps/api/src/booking/` | ⬜ |
| 4.3 | Klienten-Token-Validierung & LiveKit-Token-Ausgabe | `apps/api/src/booking/booking.controller.ts` | ⬜ |
| 4.4 | Warteraum-UI (Client-App) | `apps/client/src/views/WaitingRoomView.vue` | ⬜ |
| 4.5 | Call-UI (Client-App) | `apps/client/src/views/CallView.vue` | ⬜ |
| 4.6 | LiveKit Vue-Composable (`useLiveKit`) | `apps/client/src/composables/useLiveKit.ts` | ⬜ |
| 4.7 | Coach-Call-UI (Web-App) | `apps/web/src/views/CallView.vue` | ⬜ |
| 4.8 | Coach LiveKit-Composable | `apps/web/src/composables/useLiveKit.ts` | ⬜ |
| 4.9 | Session-Ende & Klienten-Weiterleitung | `apps/client/src/views/SessionEndView.vue` | ⬜ |
| 4.10 | „Klient wartet"-Anzeige im Backoffice | `apps/web/src/components/WaitingIndicator.vue` | ⬜ |

---

## Phase 5 – Nachbereitung (Post-MVP)

**Ziel:** Coach kann nach jeder Sitzung Notizen speichern. Klient wird auf eine konfigurierbare Dankeseite weitergeleitet.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 5.1 | Drizzle-Schema: `session_notes` | `apps/api/src/db/schema.ts` | ⬜ |
| 5.2 | NotesModule (CRUD) | `apps/api/src/notes/` | ⬜ |
| 5.3 | Notiz-Seitenleiste im Call (Web-App) | `apps/web/src/components/NotesSidebar.vue` | ⬜ |
| 5.4 | Sitzungsdetail-Ansicht mit Notizen | `apps/web/src/views/SessionDetailView.vue` | ⬜ |
| 5.5 | Konfigurierbare Dankeseite (Client-App) | `apps/client/src/views/ThankYouView.vue` | ⬜ |

---

## Phase 6 – Speech-to-Text (Post-MVP)

**Ziel:** Optionale Transkription von Sitzungen via self-hosted Whisper. DSGVO-konforme Einwilligung pro Sitzung.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 6.1 | Whisper HTTP-Service (faster-whisper Wrapper) | `infra/whisper/server.py`, `infra/whisper/Dockerfile` | ⬜ |
| 6.2 | LiveKit Egress → S3-Recording | `infra/livekit/egress.yaml`, `apps/api/src/livekit/` | ⬜ |
| 6.3 | BullMQ Job `transcribe-session` | `apps/api/src/jobs/transcribe.worker.ts` | ⬜ |
| 6.4 | Consent-Flow (Klienten-Einwilligung) | `apps/api/src/booking/`, Schema-Erweiterung | ⬜ |
| 6.5 | Einwilligungs-Banner (Client-App) | `apps/client/src/components/ConsentBanner.vue` | ⬜ |
| 6.6 | Transkript-Ansicht (Web-App) | `apps/web/src/views/TranscriptView.vue` | ⬜ |
| 6.7 | Auto-Löschung Recording nach Transkription | `apps/api/src/jobs/transcribe.worker.ts` | ⬜ |

---

## Phase 7 – CRM (Post-MVP)

**Ziel:** Coach hat eine übersichtliche Klientenliste mit Sitzungshistorie und nächstem Termin.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 7.1 | Client-API erweitern (Liste, Detail, Sitzungshistorie) | `apps/api/src/client/` | ⬜ |
| 7.2 | Dashboard-Queries (nächste Termine, offene Notizen) | `apps/api/src/dashboard/` | ⬜ |
| 7.3 | Klientenliste UI | `apps/web/src/views/ClientsListView.vue` | ⬜ |
| 7.4 | Klienten-Detail UI | `apps/web/src/views/ClientDetailView.vue` | ⬜ |
| 7.5 | Dashboard UI | `apps/web/src/views/DashboardView.vue` | ⬜ |

---

## Phase 8 – Billing (Post-MVP)

**Ziel:** Stripe-Integration für Coach-Subscriptions. Trial → Solo/Pro/Studio mit automatischem Plan-Enforcement.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 8.1 | Drizzle-Schema: `organization_billing` | `apps/api/src/db/schema.ts` | ⬜ |
| 8.2 | BillingModule (Checkout, Webhooks, Portal) | `apps/api/src/billing/` | ⬜ |
| 8.3 | Stripe Webhook-Handler (`checkout.session.completed`, `invoice.paid`, etc.) | `apps/api/src/billing/billing.webhook.ts` | ⬜ |
| 8.4 | Plan-Enforcement Guard | `apps/api/src/billing/plan.guard.ts` | ⬜ |
| 8.5 | Billing-Settings UI | `apps/web/src/views/BillingView.vue` | ⬜ |
| 8.6 | Trial-Countdown & Upgrade-Hinweis | `apps/web/src/components/TrialBanner.vue` | ⬜ |

---

## Phase 9 – Pro-Features (Post-MVP)

**Ziel:** Premium-Funktionen die den Pro/Studio-Plan rechtfertigen: Rechnungsstellung, Kalender-Integration, eigene Domain.

| # | Paket | Betroffene Dateien / Module | Status |
|---|---|---|---|
| 9.1 | Rechnungs-PDF-Generierung → S3 | `apps/api/src/invoices/` | ⬜ |
| 9.2 | Drizzle-Schema: `invoices` | `apps/api/src/db/schema.ts` | ⬜ |
| 9.3 | Google Calendar Sync | `apps/api/src/calendar/` | ⬜ |
| 9.4 | CNAME / Custom Domain Setup | `infra/caddy/`, `apps/api/src/domains/` | ⬜ |
| 9.5 | DSGVO-Datenexport (ZIP → S3) | `apps/api/src/gdpr/` | ⬜ |
| 9.6 | Rechnungs-UI (Web-App) | `apps/web/src/views/InvoicesView.vue` | ⬜ |

---

## Nächster Schritt

**Phase 1 abschließen** → CD-Pipeline (1.19: automatisches Deploy auf Hetzner bei Push). Dann Phase 2 (Auth & Profil).
