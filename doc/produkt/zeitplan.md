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
**Zeitraum:** Woche 1–4 · **Aufwand:** 40 Stunden · **Status:** ✅ abgeschlossen

> Anders als geplant: Redis gehört nicht zum Stack, weil die Erinnerungen ohne BullMQ auskommen (Phase 3). Whisper kommt mit Phase 6. Dazu gekommen sind ClamAV für den Virenscan geteilter Dateien und Hetzner Object Storage, lokal RustFS.

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
**Zeitraum:** Woche 5–7 · **Aufwand:** 30 Stunden · **Status:** ✅ abgeschlossen

> Noch nicht dabei: Logo und Primärfarbe der Buchungsseite. Beides ist für die Beta ausgeblendet. Das Profilfoto des Coachs gibt es.

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
**Zeitraum:** Woche 8–12 · **Aufwand:** 50 Stunden · **Status:** ✅ abgeschlossen

> Anders als geplant: Die Erinnerungen 24 h / 1 h laufen ohne BullMQ, über Spalten an der Buchung und einen Lauf alle 5 Minuten (`technisches-konzept.md` §12). Die Terminübersicht heißt „Termine“ und zeigt Agenda und Woche. Termine legt der Coach auch selbst an, einzeln oder als Serie (`funktionen/manuelle-termine.md`).

*Verfügbarkeiten · Buchungsseite · Erinnerungen · E-Mail*

Verfügbarkeits-Engine mit Slot-Logik, öffentliche gebrandete Buchungsseite auf der Coach-Subdomain, Klientenformular, automatische E-Mail-Bestätigung mit Raumlink via Brevo, BullMQ-Erinnerungsjobs (24h/1h vor Termin), Termin-Dashboard für den Coach, manuelle Terminanlage.

**Technologien:** BullMQ · Brevo E-Mail · Slot-Logik · Zeitzonen · Kalender-UI

**Claude Code Hauptaufgaben:**
- Availability-Modul mit Slot-Generierung, Pufferzeit und Vorlaufzeit
- Booking-Modul mit HMAC-signierten Klienten-Tokens
- Brevo E-Mail-Templates (Bestätigung, Erinnerung, Stornierung)
- BullMQ Worker für zeitbasierte Erinnerungs-Jobs
- Vue-Kalender-Komponente für Coach-Dashboard

> ⚠ **Risiko:** Komplexestes Modul im MVP. Zeitlogik, Zeitzonen, Pufferzeiten und Edge Cases brauchen besondere Sorgfalt – hier 20% Mehraufwand einplanen.

---

### Phase 4 – Videocall
**Zeitraum:** Woche 13–16 · **Aufwand:** 40 Stunden · **Status:** ✅ abgeschlossen am 2026-09-29

> Beschrieben in `technisches-konzept.md` §8. Über den Plan hinaus dabei: Chat mit geteilten Dateien, Geräte-Einrichtung im Warteraum, Hintergrund-Weichzeichner und die Notizen im Call (aus Phase 5 vorgezogen). Der Warteraum zeigt das Coach-Foto bereits. Noch nicht dabei: das Einwilligungsbanner für Aufnahmen (Phase 6), die Willkommensnachricht und die konfigurierbare Danke-Seite (später).

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
**Zeitraum:** Woche 17–19 · **Aufwand:** 30 Stunden · **Status:** ✅ abgeschlossen am 2026-11-04

> In Betrieb auf hxroom.de, beschrieben in `technisches-konzept.md` (§5 Coach-App, §6 Impressum und Datenschutz, §12 Erinnerungen, §13 Backup, §17 Fehlerüberwachung und Datenexport). Über den Plan hinaus dabei: Termine manuell anlegen, einzeln, als Serie oder als Folgetermin; Spontan-Termin auch per E-Mail-Adresse; Darstellung hell oder dunkel im Benutzermenü; Name des Kontos änderbar. Das Backup samt Off-Site-Kopie ist aus Phase 9 vorgezogen.

*Notizen · Terminseite · Klientenseite · Buchungsseite · Beta-Start*

Nachbereitung für den Coach, eine vollständige Buchungsseite und alles, was eine Beta mit echten Coaches und Klienten braucht. Danach beginnt das Marketing: Interessierte Coaches buchen eine Produktvorführung auf `demo.hxroom.de`, probieren HxRoom selbst als Coach aus und geben Feedback. Beta-Tester arbeiten mit echten Klienten, die Registrierung bleibt offen.

**Technologien:** Notes-Modul · CRM-Queries · Buchungsseite · Erinnerungsmails · Feedback · Backup · **Beta-ready** ✓

**Claude Code Hauptaufgaben:**
- Terminseite `/bookings/[id]` mit Notizen, Chat & Dateien und Details; Slideover als Kurzansicht; Abschlusskarte nach dem Call
- Klientenseite zweispaltig: Reiter Termine, Notizen-Chronik und Dateien; rechts nächster Termin, Coaching-Ziele und interne Notiz
- Buchungsseite vollständig aus den Einstellungen des Coachs, leere Felder ausgeblendet statt Beispieltext
- Impressum des Coachs mit Buchungssperre, gemeinsame Datenschutzerklärung, Datenschutz-Kasten im Warteraum
- AGB und AVV bei der Registrierung
- Erinnerungsmails 24 h / 1 h vor dem Termin
- Vorführ-Buchungsseite `demo.hxroom.de` und überarbeitete Landingpage mit „Vorführung buchen“
- Probe-Sitzung mit sich selbst, Onboarding-Checkliste, „Kommt bald“-Seiten ausgeblendet
- Feedback-Knopf, Aktivität der Coaches im Betreiber-Backoffice
- Datenexport auf Knopfdruck, Coach-App auf dem Handy bedienbar
- Fehlerüberwachung mit GlitchTip, Backup mit GFS-Aufbewahrung, Off-Site-Kopie, Alarm und durchgespielter Wiederherstellung

**Nicht in Phase 5:** KI-Sitzungszusammenfassung, Zusammenfassungsmail an den Klienten, Willkommensnachricht im Warteraum und konfigurierbare Danke-Seite (Nice-to-have); Ende-zu-Ende-Verschlüsselung (Phase 6).

---

### Phase 6 – Whisper-Transkription
**Zeitraum:** Woche 20–22 · **Aufwand:** 30 Stunden

*LiveKit Egress · faster-whisper · BullMQ · Transkript-UI*

LiveKit Egress-Konfiguration (Aufnahme → S3), BullMQ-Job für asynchrone Transkription, faster-whisper HTTP-Wrapper auf Hetzner, Transkript-Speicherung in der DB, Transkript-Ansicht im Backoffice, automatisches Löschen der Audiodatei nach erfolgreicher Transkription.

**Ende-zu-Ende-Verschlüsselung im Call.** Bild, Ton und Bildschirmfreigabe werden im Browser verschlüsselt. Der LiveKit-Server leitet sie nur weiter und kann sie nicht lesen. `livekit-client` bringt das mit (E2EE-Worker, Insertable Streams bzw. `RTCRtpScriptTransform`). Sie gehört hierher, weil sie mit der Aufnahme zusammen entschieden werden muss: LiveKit Egress kann verschlüsselte Räume nicht aufnehmen. Die offenen Fragen stehen in `technisches-konzept.md` §16 (Punkt 08).

**Technologien:** LiveKit Egress · faster-whisper · BullMQ Job · S3 Lifecycle · Whisper small

**Claude Code Hauptaufgaben:**
- LiveKit Egress YAML-Konfiguration für Aufnahme → Hetzner S3
- BullMQ-Job: Audio-Download → Whisper → Transkript-Speicherung → Audio-Delete
- faster-whisper HTTP-Wrapper Dockerfile und API
- Transkript-UI-Komponenten im Coach-Backoffice
- Ende-zu-Ende-Verschlüsselung für Bild, Ton und Freigabe über `livekit-client` E2EE, Worker von der eigenen Origin, abgestimmt mit der Aufnahme

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

> Schon da (Phase 5): das Betreiber-Backoffice unter admin.hxroom.de mit eigener Betreiber-Rolle und `AdminGuard`, Coach-Liste mit Aktivität und Sperren, eingegangenes Feedback. Offen sind Abos, MRR, Plan-Änderungen und Trial-Verlängerung.

*Rechnungsstellung · Calendar Sync · Admin-Dashboard*

PDF-Rechnungsgenerierung (nach jeder Sitzung → S3), Umsatzübersicht für Coach, Google Calendar Sync (iCal/OAuth), Betreiber-Backoffice unter admin.hxroom.de: Coach-Liste, Subscription-Verwaltung, MRR-Dashboard, Plan-Änderungen, Trial-Verlängerung.

**Technologien:** PDF-Generierung · Google Calendar · Admin-Guards · MRR Dashboard · Coach-Verwaltung

**Claude Code Hauptaufgaben:**
- PDF-Rechnungs-Generator (puppeteer oder pdf-lib) → S3-Upload → signierte URL
- Google Calendar OAuth-Flow und iCal-Integration
- ✅ Admin-NestJS-Guards mit Betreiber-Rolle (Phase 5)
- Betreiber-Dashboard-Queries (MRR, Churn, Conversion)

---

### Phase 9 – Beta-Härtung & Launch
**Zeitraum:** Woche 33–36 · **Aufwand:** 40 Stunden

> Schon da (Phase 5): Backup mit GFS-Aufbewahrung, Off-Site-Kopie und Alarm, seit 05.10.2026 in Betrieb; Fehlerüberwachung mit GlitchTip; Löschfunktionen für Konten (mit 30 Tagen Frist) und Klienten, jeweils mit Löschprotokoll. Offen ist, sie zu prüfen und zu testen.

*Tests · DSGVO · Backup · Monitoring · Produktion*

End-to-End-Tests mit echten Beta-Coaches, DSGVO-Löschfunktion verifizieren (Cascade-Delete), monatlicher Restore-Test des Backups (das Backup selbst entsteht in Phase 5), Monitoring-Setup, Performance-Optimierung kritischer DB-Queries, Fehlerbehandlung und Edge Cases schließen, Produktions-Deployment auf Hetzner finalisieren.

**Technologien:** pg_dump Backup · DSGVO Delete · Monitoring · Hetzner Prod · **Vollständiges Produkt** ✓

**Claude Code Hauptaufgaben:**
- ✅ Backup-Cron-Job mit GFS-Schema (täglich/wöchentlich/monatlich, Phase 5)
- DSGVO-Löschprotokoll-Implementierung prüfen und testen
- Drizzle Query-Optimierung (Indizes, N+1-Probleme)
- Produktions-Docker-Compose finalisieren und Deployment-Skripte

---

## Meilensteine

| Zeitpunkt | Meilenstein | Beschreibung |
|---|---|---|
| Woche 19 · ~5 Monate | **Beta mit echten Coaches** ✅ | Buchung, Videocall und Notizen funktionieren. Kein Billing nötig für die ersten Beta-Coaches. Erreicht mit Phase 5 am 2026-11-04. |
| Woche 26 · ~6,5 Monate | **Erste zahlende Kunden** | Stripe Billing ist live. Trial-to-Paid-Conversion kann beginnen. |
| Woche 36 · ~9 Monate | **Vollständiges Produkt** | Alle Features live, Betreiber-Backoffice aktiv, Production-ready. |

---

## Alle Phasen auf einen Blick

| Phase | Zeitraum | Stunden | Status |
|---|---|---|---|
| 1 – Fundament & Infrastruktur | Woche 1–4 | 40h | ✅ Abgeschlossen |
| 2 – Auth & Coach-Profil | Woche 5–7 | 30h | ✅ Abgeschlossen |
| 3 – Buchungssystem | Woche 8–12 | 50h | ✅ Abgeschlossen |
| 4 – Videocall | Woche 13–16 | 40h | ✅ Abgeschlossen |
| 5 – Nachbereitung & CRM | Woche 17–19 | 30h | ✅ Abgeschlossen · Beta-ready |
| 6 – Whisper-Transkription | Woche 20–22 | 30h | Als Nächstes |
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
