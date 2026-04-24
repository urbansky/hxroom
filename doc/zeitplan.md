# HxRoom – Entwicklungsplan

> Realistischer Zeitplan · Solo-Entwicklung mit Claude Code · 10h / Woche

Von Null zum fertigen Produkt. 9 Phasen, ausschließlich mit Claude Code entwickelt. 10 Stunden pro Woche, kein manuelles Coding.

---

## Kennzahlen

| | |
|---|---|
| **Phasen gesamt** | 9 |
| **Wochen bis Launch** | 36 |
| **Entwicklungsstunden** | 360 |
| **Monate bis Vollprodukt** | ~9 |

---

## Entwicklungsphasen

### Phase 1 – Fundament & Infrastruktur
**Zeitraum:** Woche 1–4 · **Aufwand:** 40 Stunden

*Monorepo · Docker Compose · DB-Schema · CLAUDE.md*

Monorepo-Setup mit pnpm Workspaces, Docker Compose Stack (Postgres, Redis, Caddy, LiveKit, Whisper), vollständiges Drizzle-Schema aller Kerntabellen, CLAUDE.md Instruktionsdatei, lokale Subdomain-Entwicklung mit /etc/hosts Einträgen.

**Technologien:** pnpm Workspaces · Docker Compose · Drizzle ORM · Caddy HTTPS · Hetzner Setup

**Claude Code Hauptaufgaben:**
- Monorepo-Scaffolding mit korrekter pnpm Workspace-Struktur
- Docker Compose für alle Services generieren
- Vollständiges Drizzle-Schema aller Kerntabellen inkl. Migrationen
- Caddyfile mit Wildcard-Zertifikaten für *.hxroom.de
- CLAUDE.md mit Konventionen und Projektstruktur

> ⚠ **Risiko:** LiveKit-Konfiguration und Hetzner Object Storage Setup sind infrastrukturlastig – hier kann es haken. Puffer einplanen.

---

### Phase 2 – Auth & Coach-Profil
**Zeitraum:** Woche 5–7 · **Aufwand:** 30 Stunden

*better-auth · Subdomain-Routing · Branding · Onboarding*

better-auth Integration im NestJS Backend, Registrierung und Login, Subdomain-Routing-Middleware (anna.hxroom.de), Coach-Profil mit Branding-Setup (Logo, Primärfarbe), Onboarding-Checkliste im Frontend, Basis-Dashboard-Shell.

**Technologien:** better-auth · NestJS Guard · S3 Upload · Vue Router · Pinia Store

**Claude Code Hauptaufgaben:**
- better-auth NestJS-Modul mit Session-Management
- Subdomain-Middleware für Wildcard-Routing
- Vue-Auth-Composables und geschützte Routen
- Coach-Modul CRUD (NestJS + Drizzle)
- Branding-Upload-Flow mit Hetzner S3 Integration

---

### Phase 3 – Buchungssystem
**Zeitraum:** Woche 8–12 · **Aufwand:** 50 Stunden

*Verfügbarkeiten · Buchungsseite · Erinnerungen · E-Mail*

Verfügbarkeits-Engine mit Slot-Logik, öffentliche gebrandete Buchungsseite auf der Coach-Subdomain, Klientenformular, automatische E-Mail-Bestätigung mit Raumlink via Resend, BullMQ-Erinnerungsjobs (24h/1h vor Termin), Termin-Dashboard für den Coach, manuelle Terminanlage.

**Technologien:** BullMQ · Resend E-Mail · Slot-Logik · Zeitzonen · Kalender-UI

**Claude Code Hauptaufgaben:**
- Availability-Modul mit Slot-Generierung, Pufferzeit und Vorlaufzeit
- Booking-Modul mit HMAC-signierten Klienten-Tokens
- Resend E-Mail-Templates (Bestätigung, Erinnerung, Stornierung)
- BullMQ Worker für zeitbasierte Erinnerungs-Jobs
- Vue-Kalender-Komponente für Coach-Dashboard

> ⚠ **Risiko:** Komplexestes Modul im MVP. Zeitlogik, Zeitzonen, Pufferzeiten und Edge Cases brauchen besondere Sorgfalt – hier 20% Mehraufwand einplanen.

---

### Phase 4 – Videocall
**Zeitraum:** Woche 13–16 · **Aufwand:** 40 Stunden

*LiveKit · Warteraum · Call-UI · Sitzungsabschluss*

Gebrandeter Warteraum mit Coach-Foto und Willkommensnachricht, LiveKit Token-Generierung im Backend, Call-UI mit Kamera/Mikro-Controls und Screen-Share, Sitzungsabschluss-Flow, Danke-Seite für Klienten, Einwilligungsbanner für Aufnahmen (DSGVO).

**Technologien:** LiveKit SDK · WebRTC · Vue Composable · Session-State · DSGVO Consent

**Claude Code Hauptaufgaben:**
- LiveKit-Service-Modul im NestJS Backend (Token-Generierung, Room-Management)
- Vue-Composable für LiveKit Room-Verbindung und State
- Warteraum-Komponenten mit Coach-Branding
- Call-UI mit Kamera/Mikro-Controls, Screen-Share
- Consent-Flow für Aufnahme-Einwilligung (DSGVO-konform)

---

### Phase 5 – Nachbereitung & CRM
**Zeitraum:** Woche 17–19 · **Aufwand:** 30 Stunden

*Notizen · Session-Protokoll · Klientenliste*

Notizeingabe während und nach dem Call, Session-Abschluss-Protokoll, Klientenliste mit Sitzungshistorie, einfache Suchfunktion. Nach dieser Phase ist der MVP bereit für echte Beta-Coaches.

**Technologien:** Notes-Modul · CRM-Queries · Dashboard · **Beta-ready** ✓

**Claude Code Hauptaufgaben:**
- Notes-Modul mit Auto-Save während des Calls
- Client-Modul mit Sitzungshistorie und Klientenprofil
- Dashboard-Queries mit Drizzle (Aggregate, Joins)
- Vue-Tabellen-Komponenten für CRM-Ansichten

---

### Phase 6 – Whisper-Transkription
**Zeitraum:** Woche 20–22 · **Aufwand:** 30 Stunden

*LiveKit Egress · faster-whisper · BullMQ · Transkript-UI*

LiveKit Egress-Konfiguration (Aufnahme → S3), BullMQ-Job für asynchrone Transkription, faster-whisper HTTP-Wrapper auf Hetzner, Transkript-Speicherung in der DB, Transkript-Ansicht im Backoffice, automatisches Löschen der Audiodatei nach erfolgreicher Transkription.

**Technologien:** LiveKit Egress · faster-whisper · BullMQ Job · S3 Lifecycle · Whisper small

**Claude Code Hauptaufgaben:**
- LiveKit Egress YAML-Konfiguration für Aufnahme → Hetzner S3
- BullMQ-Job: Audio-Download → Whisper → Transkript-Speicherung → Audio-Delete
- faster-whisper HTTP-Wrapper Dockerfile und API
- Transkript-UI-Komponenten im Coach-Backoffice

---

### Phase 7 – Billing (Stripe)
**Zeitraum:** Woche 23–26 · **Aufwand:** 40 Stunden

*Subscriptions · Webhooks · Billing Portal · Plan-Enforcement*

Stripe Subscription-Integration, organizationBilling-Tabelle, Webhook-Handler für alle relevanten Events (subscription created/updated/deleted, payment_failed), Stripe Billing Portal für Selbstverwaltung, Plan-Enforcement-Guards in der API, Trial-Ablauf-Flow, Upgrade-CTA im Dashboard.

**Technologien:** Stripe Webhooks · Grace Period · Plan Guards · **Zahlende Kunden möglich** ✓

**Claude Code Hauptaufgaben:**
- Stripe-Webhook-Handler mit Signatur-Verifikation und allen Events
- Plan-Guard-Middleware für geschützte API-Endpunkte
- organizationBilling-Modul (Drizzle Schema + NestJS Service)
- Vue-Upgrade-Flow und Trial-Countdown-UI

> ⚠ **Risiko:** Stripe-Webhooks sind erfahrungsgemäß aufwändig. Grace Period, Reaktivierung, fehlgeschlagene Zahlung – alle Edge Cases müssen sauber abgedeckt sein.

---

### Phase 8 – Pro-Features & Betreiber-Backoffice
**Zeitraum:** Woche 27–32 · **Aufwand:** 60 Stunden

*Rechnungsstellung · Calendar Sync · Admin-Dashboard*

PDF-Rechnungsgenerierung (nach jeder Sitzung → S3), Umsatzübersicht für Coach, Google Calendar Sync (iCal/OAuth), Betreiber-Backoffice unter admin.hxroom.de: Coach-Liste, Subscription-Verwaltung, MRR-Dashboard, Plan-Änderungen, Trial-Verlängerung.

**Technologien:** PDF-Generierung · Google Calendar · Admin-Guards · MRR Dashboard · Coach-Verwaltung

**Claude Code Hauptaufgaben:**
- PDF-Rechnungs-Generator (puppeteer oder pdf-lib) → S3-Upload → signierte URL
- Google Calendar OAuth-Flow und iCal-Integration
- Admin-NestJS-Guards mit Betreiber-Rolle
- Betreiber-Dashboard-Queries (MRR, Churn, Conversion)

---

### Phase 9 – Beta-Härtung & Launch
**Zeitraum:** Woche 33–36 · **Aufwand:** 40 Stunden

*Tests · DSGVO · Backup · Monitoring · Produktion*

End-to-End-Tests mit echten Beta-Coaches, DSGVO-Löschfunktion verifizieren (Cascade-Delete), Backup-Cron-Jobs (pg_dump → S3), Monitoring-Setup, Performance-Optimierung kritischer DB-Queries, Fehlerbehandlung und Edge Cases schließen, Produktions-Deployment auf Hetzner finalisieren.

**Technologien:** pg_dump Backup · DSGVO Delete · Monitoring · Hetzner Prod · **Vollständiges Produkt** ✓

**Claude Code Hauptaufgaben:**
- Backup-Cron-Job mit GFS-Schema (täglich/wöchentlich/monatlich)
- DSGVO-Löschprotokoll-Implementierung prüfen und testen
- Drizzle Query-Optimierung (Indizes, N+1-Probleme)
- Produktions-Docker-Compose finalisieren und Deployment-Skripte

---

## Meilensteine

| Zeitpunkt | Meilenstein | Beschreibung |
|---|---|---|
| Woche 19 · ~5 Monate | **Beta mit echten Coaches** | Buchung, Videocall und Notizen funktionieren. Kein Billing nötig für die ersten Beta-Coaches. |
| Woche 26 · ~6,5 Monate | **Erste zahlende Kunden** | Stripe Billing ist live. Trial-to-Paid-Conversion kann beginnen. |
| Woche 36 · ~9 Monate | **Vollständiges Produkt** | Alle Features live, Betreiber-Backoffice aktiv, Production-ready. |

---

## Alle Phasen auf einen Blick

| Phase | Zeitraum | Stunden | Status |
|---|---|---|---|
| 1 – Fundament & Infrastruktur | Woche 1–4 | 40h | Start |
| 2 – Auth & Coach-Profil | Woche 5–7 | 30h | — |
| 3 – Buchungssystem | Woche 8–12 | 50h | Komplex |
| 4 – Videocall | Woche 13–16 | 40h | — |
| 5 – Nachbereitung & CRM | Woche 17–19 | 30h | Beta-ready |
| 6 – Whisper-Transkription | Woche 20–22 | 30h | — |
| 7 – Billing (Stripe) | Woche 23–26 | 40h | Zahlende Kunden |
| 8 – Pro-Features & Admin | Woche 27–32 | 60h | — |
| 9 – Beta-Härtung & Launch | Woche 33–36 | 40h | Launch |
| **Gesamt** | **36 Wochen · ~9 Monate** | **360h** | |

---

## Annahmen & Grundlagen

**Claude Code Effizienz:** 60–70% Effizienzgewinn gegenüber manueller Entwicklung. Nicht 90% – Debugging, Infrastruktur-Setup und Integrationsarbeit brauchen immer echte Auseinandersetzungszeit.

**Wochenleistung:** 10 fokussierte Entwicklungsstunden pro Woche. Kein manuelles Coding – ausschließlich Claude Code für Scaffolding, Codegenerierung, Migrations-Skripte und Debugging.

**CLAUDE.md als Multiplikator:** Eine sorgfältig gepflegte CLAUDE.md mit Konventionen, Projektstruktur und Modulmustern ist entscheidend für konsistente Claude-Output-Qualität über alle Phasen hinweg.

**Pufferlogik:** Die 360h sind bereits konservativ kalkuliert. Trotzdem: Infrastruktur-Integrationen (LiveKit Egress, Stripe Webhooks, Whisper) haben erfahrungsgemäß Eigenheiten, die sich schwer vorhersagen lassen.

---

> ⚠ **Wichtigste Empfehlung: 20% Puffer pro Phase einplanen**
>
> Nicht weil Claude Code schlecht ist – sondern weil echte Infrastruktur-Arbeit schwer exakt zu schätzen ist. Wer in Woche 12 fertig sein will, sollte in Woche 10 fertig sein wollen. Der Puffer rettet den Zeitplan, er kostet ihn nicht.

---

*Entwicklungsplan v1.0 · Solo-Entwicklung mit Claude Code · 10h / Woche*
