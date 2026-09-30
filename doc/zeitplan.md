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

> Umgesetzt nach `videocall-umsetzungsplan.md`. Über den Plan hinaus dabei: Chat mit geteilten Dateien, Geräte-Einrichtung im Warteraum, Hintergrund-Weichzeichner und die Notizen im Call (aus Phase 5 vorgezogen). Der Warteraum zeigt das Coach-Foto bereits. Noch nicht dabei und in Phase 6 verschoben: das Einwilligungsbanner für Aufnahmen. Die Willkommensnachricht und die konfigurierbare Danke-Seite sind auf später verschoben (29.09.2026).

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

*Notizen · Session-Protokoll · Klientenliste · Buchungsseite · Beta-Start*

Notizeingabe während und nach dem Call, Session-Abschluss-Protokoll, Klientenliste mit Sitzungshistorie, einfache Suchfunktion. Nach dieser Phase ist der MVP bereit für echte Beta-Coaches.

**Festgelegt am 29.09.2026:**
- **Session-Abschluss-Protokoll** ist die Abschlusskarte für den Coach wie im Prototyp (`poc/videocall-v2.html`, Screen 4 „Sitzung abgeschlossen“): als gehalten markiert, Notizen verknüpft, Dauer, Datum und Speicherstand der Notizen. Heute zeigt der Coach-Call nach dem Ende nur „Sitzung beendet – als gehalten vermerkt“.
- **Danke-Seite des Klienten** bleibt wie sie ist, also ohne Weiterleitung und ohne Einstellungen. Die konfigurierbare Fassung ist auf später verschoben.
- **Nice-to-have, nicht in Phase 5:** die KI-Sitzungszusammenfassung, die Zusammenfassungsmail an den Klienten und die Willkommensnachricht im Warteraum.

**Neu aufgenommen am 30.09.2026: eigene Seite pro Termin (`/bookings/[id]`).** Das Termin-Slideover wird für Chatverlauf und später das Transkript zu eng. Es bleibt deshalb als Kurzansicht, und alles Ausführliche bekommt eine eigene Seite.
- **Slideover:**
  - Termin, Klient, Status und die Aktionen (Call starten, absagen, Klient zuordnen, nicht erschienen)
  - die Notizen, weiterhin direkt bearbeitbar
  - Chat (und später Transkript) nur als Zusammenfassungszeile, z. B. „14 Nachrichten · 2 Dateien“, mit Sprung auf die Seite
  - ein Knopf „Als Seite öffnen“
- **Terminseite:**
  - Kopf mit Datum, Klient, Angebot, Status und denselben Aktionen
  - links die Notizen in großem Editor
  - rechts Reiter für „Chat & Dateien“, „Transkript“ (ab Phase 6) und „Details“ (Nachricht des Klienten, Absage, No-Show)
  - auf dem Handy untereinander

Die Seite ist die Grundlage für Abschlusskarte und Notizen-Chronik und wird deshalb vor diesen beiden gebaut. Die Abschlusskarte verlinkt mit „Zur Sitzung“ auf sie, jeder Eintrag der Chronik ebenso.

**Neu aufgenommen am 30.09.2026: breitere Klientenseite (`/clients/[id]`).** Heute ist sie eine schmale Spalte mit Kontakt, interner Notiz, Terminliste und einer Platzhalter-Kachel. Künftig nutzt sie die Breite:
- **Kopf** (volle Breite): Name, Kontakt, „Klient seit“, dazu eine Zeile Kennzahlen (gehaltene Sitzungen, letzte und nächste Sitzung, No-Shows). Aktionen wie bisher, Seltenes in einem Drei-Punkte-Menü.
- **Linke Spalte mit Reitern:**
  - **Termine:** die Terminliste wie heute, ohne Notizauszüge
  - **Notizen:** alle Sitzungsnotizen hintereinander im Volltext, jeweils mit Sprung zur Terminseite. Das ist die Notizen-Chronik (Funktionsliste 4.02).
  - **Dateien:** alle geteilten Dateien über alle Sitzungen
  - **Transkripte:** ab Phase 6
- **Rechte Spalte**, bleibt beim Scrollen stehen:
  - nächster Termin mit Einstieg in den Call
  - **Coaching-Ziele & Themen** als Freitext (Funktionsliste 3.05, ersetzt die Platzhalter-Kachel)
  - die interne Notiz
- **Auf dem Handy:** alles untereinander, Ziele und interne Notiz als eigener Reiter „Profil“.

Notizen-Chronik und Coaching-Ziele sind damit Teil dieser Seite. Ein klickbarer Entwurf folgt vor dem Bau.

**Festgelegt am 30.09.2026: Der Menüpunkt „Notizen“ entfällt**, samt Platzhalterseite (`apps/coach/app/pages/notes.vue`). Notizen gehören immer zu einer Sitzung und einem Klienten und werden dort gesucht: auf der Klientenseite (Reiter „Notizen“) und auf der Terminseite. Eine Liste über alle Klienten hinweg ist nicht geplant.

**Neu aufgenommen am 29.09.2026: die Buchungsseite vollständig umsetzen.** Die öffentliche Buchungsseite (`[slug].hxroom.de`) zeigt bei jedem Coach noch dieselben Beispielinhalte:
- Titel, Themen und Kennzahlen („340+ Sitzungen", „8 Jahre", „4.9 Bewertung")
- den Text im Kopfbereich
- Zitat, Text und Qualifikationen unter „Über mich"
- das Abzeichen „Verifiziert" und das Versprechen „Erstgespräch kostenlos"

Die Links zu Datenschutz, Impressum und AGB führen ins Leere. Tagline, „Über mich" und Button-Text pflegt der Coach bereits in den Einstellungen, der öffentliche Endpunkt liefert sie aber nicht aus.

Ziel: Jeder Inhalt der Seite kommt aus den Einstellungen des Coachs. Was er nicht pflegt, wird ausgeblendet statt durch Beispieltext ersetzt. Vor einer Beta mit echten Coaches ist das Pflicht, denn Klienten sehen diese Seite als Erstes.

**Neu aufgenommen am 29.09.2026: Datenschutz-Kasten im Warteraum.** Der Klient sieht im Warteraum, was mit seinem Gespräch geschieht: Aufzeichnung, Übertragung, Speicherung von Chat und Dateien, KI und Verschlüsselung. Dazu kommt ein Link zur Datenschutzerklärung des Coachs. Die genauen Aussagen werden später festgelegt. Zwei Regeln stehen fest:
- Es werden nur Tatsachen genannt, die die Technik belegt, keine rechtlichen Wertungen wie „DSGVO-konform“.
- Die Aussagen folgen dem echten Zustand, damit sie mit der Aufnahme in Phase 6 nicht stillschweigend falsch werden.

Voraussetzung ist der Datenschutz-Link von der Buchungsseite.

Die Ende-zu-Ende-Verschlüsselung im Call war hier am 29.09.2026 aufgenommen und ist am 30.09.2026 nach Phase 6 verschoben worden (siehe dort).

**Neu aufgenommen am 30.09.2026: Beta für Marketing und erstes Feedback.** Nach Phase 5 beginnt das Marketing. Interessierte Coaches buchen beim Betreiber eine Produktvorführung, danach probieren sie HxRoom selbst als Coach aus und geben Feedback. Beta-Tester dürfen dabei **mit echten Klienten arbeiten**. Die Registrierung bleibt offen.

*Vorführung buchen:*
- **Vorführ-Buchungsseite des Betreibers** unter `demo.hxroom.de`: ein gewöhnliches Coach-Konto mit dem Angebot „Produktvorführung“. Interessenten erleben so Buchungsseite, Bestätigungsmail, Warteraum und Call aus Sicht eines Klienten. `demo` ist deshalb nicht mehr auf der Slug-Sperrliste.
- **Erinnerungsmails** 24 h und 1 h vor dem Termin an den Klienten (Funktionsliste 2.05). Bisher gibt es keine.
- **Knopf „Vorführung buchen“ auf der Landingpage**, verlinkt auf die Vorführ-Buchungsseite. Heute bietet sie nur die Early-Access-Anmeldung an.

*Selbst als Coach ausprobieren:*
- **Probe-Sitzung mit sich selbst:** Ein Knopf legt einen Testklienten an (den Coach selbst) und zeigt einen QR-Code für den Warteraum auf dem Handy. Der Coach erlebt so in zwei Minuten beide Seiten. Testtermine zählen nicht in Kennzahlen und Klientenliste.
- **Onboarding-Checkliste** auf die Beta ausrichten: Profil, Angebot, Verfügbarkeit, Probe-Sitzung, Buchungslink teilen.
- **„Kommt bald“-Seiten ausblenden:** Menüpunkte, die nur Ankündigungs-Kacheln zeigen (Rechnungen, Umsatz, Abrechnung, Benachrichtigungen, Datenschutz, Warteraum), verschwinden für die Beta, statt anzukündigen.

*Feedback einholen:*
- **Feedback-Knopf in der Coach-App:** ein kurzes Formular, gespeichert und per Mail an den Betreiber, mit der Seite, auf der der Coach gerade war.
- **Aktivität der Beta-Coaches im Betreiber-Backoffice:** letzter Login, Angebote, Buchungen, gehaltene Sitzungen.

*Voraussetzungen, weil Beta-Tester mit echten Klienten arbeiten:*
- **Impressum und Datenschutzerklärung des Coachs:** HxRoom stellt eine Vorlage für die Datenschutzerklärung bereit (`legal.md` §4.3). Der Coach hinterlegt beides in den Einstellungen, die Buchungsseite verlinkt es.
- **AGB zwischen HxRoom und Coach sowie der AVV** werden bei der Registrierung abgeschlossen (`legal.md` §5.1 und §6). Die Texte liefert der Betreiber.
- **Fehlerüberwachung:** Fehler in API und Oberflächen erreichen den Betreiber, statt unbemerkt zu bleiben. Heute gibt es keine.
- **Funktionierendes Backup** nach `technisches-konzept.md` §13, aus Phase 9 vorgezogen. Heute ist davon nichts umgesetzt, die Datenbank liegt allenfalls im Server-Backup von Hetzner. Dazu gehören:
  - täglicher `pg_dump` in einen eigenen Bucket, Aufbewahrung nach GFS-Schema
  - tägliche Off-Site-Kopie der Dateien in einen zweiten Bucket (§16 Punkt 03)
  - Alarm per Mail, wenn ein Lauf scheitert
  - eine einmal durchgespielte Wiederherstellung. Ein Backup gilt erst als funktionierend, wenn es sich zurückspielen lässt.

**Technologien:** Notes-Modul · CRM-Queries · Dashboard · Buchungsseite · Erinnerungsmails · Feedback · **Beta-ready** ✓

**Claude Code Hauptaufgaben:**
- Notes-Modul mit Auto-Save während des Calls
- Client-Modul mit Sitzungshistorie und Klientenprofil
- Dashboard-Queries mit Drizzle (Aggregate, Joins)
- Vue-Tabellen-Komponenten für CRM-Ansichten
- Terminseite `/bookings/[id]` (Notizen, Chat & Dateien, Details) und Termin-Slideover als Kurzansicht mit Sprung dorthin
- Klientenseite zweispaltig: Reiter Termine, Notizen, Dateien; rechts nächster Termin, Coaching-Ziele (Freitext) und interne Notiz
- Menüpunkt „Notizen“ und seine Platzhalterseite entfernen
- Öffentlichen Coach-Endpunkt um die gepflegten Profilfelder erweitern, fehlende Felder (z. B. Schwerpunkte) in Schema und Einstellungen ergänzen
- Beispielinhalte der Buchungsseite durch echte Daten ersetzen, leere Felder ausblenden
- Impressum und Datenschutz des Coachs auf der Buchungsseite verlinken
- Datenschutz-Kasten im Warteraum, abgeleitet aus dem tatsächlichen Zustand
- Erinnerungsmails 24 h / 1 h vor dem Termin
- Vorführ-Buchungsseite `demo.hxroom.de` einrichten, Knopf „Vorführung buchen“ auf der Landingpage
- Probe-Sitzung mit sich selbst (Testklient, QR-Code), Onboarding-Checkliste anpassen
- „Kommt bald“-Menüpunkte für die Beta ausblenden
- Feedback-Knopf in der Coach-App, Aktivität der Coaches im Betreiber-Backoffice
- Impressum und Datenschutzerklärung des Coachs in den Einstellungen, AGB und AVV bei der Registrierung
- Fehlerüberwachung für API und Oberflächen
- Backup: täglicher `pg_dump` mit GFS-Aufbewahrung, Off-Site-Kopie der Dateien, Alarm bei Fehlschlag, Wiederherstellung einmal durchspielen

---

### Phase 6 – Whisper-Transkription
**Zeitraum:** Woche 20–22 · **Aufwand:** 30 Stunden

*LiveKit Egress · faster-whisper · BullMQ · Transkript-UI*

LiveKit Egress-Konfiguration (Aufnahme → S3), BullMQ-Job für asynchrone Transkription, faster-whisper HTTP-Wrapper auf Hetzner, Transkript-Speicherung in der DB, Transkript-Ansicht im Backoffice, automatisches Löschen der Audiodatei nach erfolgreicher Transkription.

**Aus Phase 5 verschoben am 30.09.2026: Ende-zu-Ende-Verschlüsselung im Call.** Bild, Ton und Bildschirmfreigabe werden im Browser verschlüsselt. Der LiveKit-Server leitet sie nur weiter und kann sie nicht lesen. `livekit-client` bringt das mit (E2EE-Worker, Insertable Streams bzw. `RTCRtpScriptTransform`). Sie gehört hierher, weil sie mit der Aufnahme zusammen entschieden werden muss: LiveKit Egress kann verschlüsselte Räume nicht aufnehmen. Die offenen Fragen stehen in `technisches-konzept.md` §16 (Punkt 08).

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

End-to-End-Tests mit echten Beta-Coaches, DSGVO-Löschfunktion verifizieren (Cascade-Delete), Backup-Cron-Jobs (pg_dump → S3, seit 30.09.2026 in Phase 5 vorgezogen – hier nur noch der monatliche Restore-Test), Monitoring-Setup, Performance-Optimierung kritischer DB-Queries, Fehlerbehandlung und Edge Cases schließen, Produktions-Deployment auf Hetzner finalisieren.

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
| 4 – Videocall | Woche 13–16 | 40h | ✅ Abgeschlossen |
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
