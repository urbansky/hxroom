# HxRoom – Technisches Konzept
*Version 0.6*

Beschreibt, wie HxRoom gebaut ist und warum. Was wann umgesetzt wird, steht in `zeitplan.md`; die fachlichen Funktionen in `funktionen/`.

---

## 1. Überblick & Zielsetzung

HxRoom ist eine White-Label Videocall-Plattform für Coaches im DACH-Markt. Das technische Ziel ist ein schlankes, iterativ wachsendes System, das vom ersten Tag an DSGVO-konform, stabil und alleine wartbar ist.

Alle externen Dienste laufen im EU-Raum. Stripe ist als Zahlungsanbieter bewusst eingeschlossen – Stripe verarbeitet EU-Zahlungsdaten über irische und luxemburgische Entitäten (DSGVO-konform per SCCs).

---

## 2. Tech-Stack

### Backend
| Technologie | Rolle |
|---|---|
| **NestJS** | API-Framework (REST + WebSocket-Events) |
| **PostgreSQL** | Primäre Datenbank |
| **Drizzle ORM** | Datenbankzugriff & Migrations (SQL-nah, typsicher) |
| **better-auth** | Authentifizierung & Session-Management |
| **LiveKit** | WebRTC-Infrastruktur – self-hosted auf Hetzner DE |
| **Whisper (faster-whisper)** | Speech-to-Text – self-hosted, kein externer API-Aufruf (Phase 6) |
| **Brevo** | Transaktionale E-Mails **und** Newsletter/Marketing – ein Anbieter für den gesamten Versand (französisch, Server in der EU) |
| **@nestjs/schedule** | Zeitgesteuerte Läufe: Verfall unbestätigter Buchungen, Erinnerungen, Sitzungsende, Aufräumen (§12). BullMQ mit Redis erst, wenn die Transkription eine Job-Queue braucht. |
| **Object Storage** | S3-kompatibler Datei-Speicher – Uploads, Recordings, Logos. Produktiv **Hetzner Object Storage** (Falkenstein), in der Entwicklung **RustFS** self-hosted. |
| **Stripe** | Zahlungsabwicklung & Subscription-Management (Billing Portal, Webhooks) – EU-Entities, SCCs |

### Frontend
| Technologie | Rolle |
|---|---|
| **Nuxt 4** | Vue 3 Meta-Framework (file-based Routing, Auto-Imports); Coach-App und Admin als SPA, Landingpage statisch erzeugt. Die Buchungsseite ist eine Vite-SPA. |
| **Nuxt UI v4** | Komponenten-Bibliothek (Reka UI + Tailwind), Theme und Farben aus `@hxroom/ui` |
| **LiveKit JS SDK** | WebRTC-Client-Integration |

### Infrastruktur
| Komponente | Wahl |
|---|---|
| **Hosting** | Hetzner Cloud, Standort Deutschland (Nürnberg / Falkenstein) |
| **LiveKit Server** | Self-hosted Docker-Container auf Hetzner |
| **Whisper Service** | Self-hosted Docker-Container auf Hetzner (Phase 6) |
| **Virenscan** | ClamAV (`clamav/clamav-debian`), self-hosted Docker-Container; prüft im Call geteilte Dateien vor dem Ablegen |
| **Reverse Proxy** | Caddy (automatisches HTTPS, Wildcard-Zertifikate für `*.hxroom.de`) |
| **Object Storage** | **Hetzner Object Storage** (S3-kompatibel, Falkenstein) in Produktion; **RustFS** self-hosted als Docker-Container in der Entwicklung |
| **Deployment** | Docker Compose (Entwicklung & Produktion) |

### Externe Dienste – EU-Übersicht
| Dienst | Anbieter | Serverstandort | Anmerkung |
|---|---|---|---|
| E-Mail-Versand (transaktional + Newsletter) | Brevo | EU (Frankreich/Deutschland) | Vollständig EU, AVV |
| E-Mail-Empfang / Postfächer (`kontakt@hxroom.de` etc.) | Ionos Mail Business | Deutschland | Vollständig EU, IMAP/SMTP für Apple Mail / Thunderbird |
| Zahlung & Abo | Stripe | EU (Irland / Luxemburg) | SCCs vorhanden, Billing Portal |
| DNS | Ionos | Deutschland | Vollständig EU; gleicher Anbieter wie Mail |
| Zertifikate | Let's Encrypt via Caddy | – | Kein Datentransfer |
| Video / Audio | LiveKit self-hosted | Hetzner DE | Vollständig EU |
| Transkription | Whisper self-hosted | Hetzner DE | Vollständig EU |
| Datei-Speicher | Hetzner Object Storage (produktiv), RustFS (Entwicklung) | Hetzner DE (Falkenstein) | S3-kompatibel, vollständig EU |
| Web-Analytics | Plausible Cloud | EU (Estland/Deutschland) | Cookie-frei, kein Consent-Banner; AVV via Plausible-Dashboard |

---

## 3. Projektstruktur & Repositories

```
hxroom/
├── apps/
│   ├── api/          # NestJS Backend (api.hxroom.de)
│   ├── coach/        # Coach-Backoffice (app.hxroom.de)
│   ├── bookingpage/  # Klienten-Subdomain: Buchung, Warteraum & Call ([slug].hxroom.de)
│   ├── admin/        # Betreiber-Backoffice (admin.hxroom.de)
│   └── landing/      # Landingpage (hxroom.de)
├── packages/
│   ├── shared/       # Gemeinsame Types & Zod-Schemas
│   ├── livekit/      # Geteilte Call-Mechanik: LiveKit-Composables (ohne Komponenten)
│   └── ui/           # Shared Theme, Nuxt UI Config & Vue-Komponenten (Call-Oberfläche, Bausteine der Buchungsseite)
├── infra/
│   ├── docker-compose.yml          # Produktion
│   ├── docker-compose.dev.yml      # Lokale Entwicklung
│   ├── redeploy.sh                 # Neustart geänderter Dienste auf dem Server (§4)
│   ├── backup/                     # Backup-Container (§13)
│   ├── caddy/                      # Caddyfile
│   ├── livekit/                    # livekit.yaml
│   ├── journald/                   # Aufbewahrung der Server-Logs (§17)
│   └── whisper/                    # Whisper-Service (Phase 6)
├── infra-status/     # GlitchTip auf der Betriebs-Instanz (§17)
└── CLAUDE.md         # Konventionen für Claude Code
```

Ein **Monorepo** (pnpm Workspaces) hält den Overhead gering und erlaubt geteilte Typen zwischen Backend und Frontend. Die drei Nuxt-Apps (`coach`, `admin`, `landing`) und die Vite-SPA `bookingpage` sind bewusst getrennt, um die Subdomain-Architektur sauber abzubilden. `@hxroom/ui` teilt Theme und Nuxt-UI-Konfiguration zwischen allen Frontends, `packages/livekit` die Call-Schicht zwischen `bookingpage` und `coach` (§8). Die Inhalte der Buchungsseite (Kopfbereich, Profilkarte, Angebotszeile, „Über mich“) liegen als Komponenten in `packages/ui/components/booking-page/`. So rendert die Vorschau unter Einstellungen → Buchungsseite in der Coach-App dieselben Bausteine wie die Buchungsseite selbst, gespeist aus dem Formular statt aus dem Gespeicherten. Die Darstellungsregeln dazu (Button-Text, Sichtbarkeit von „Über mich“, Preisformat) stehen in `packages/shared/src/booking-page.ts`.

---

## 4. Docker Compose Architektur

Es gibt zwei Compose-Dateien in `infra/`:

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Produktion – alle Services als Container (Apps, Infrastruktur) |
| `docker-compose.dev.yml` | Lokale Entwicklung – nur Infrastruktur-Services |

### Lokale Entwicklung (`docker-compose.dev.yml`)

Die Apps (api, coach, bookingpage, admin, landing) laufen lokal per `pnpm dev`. Docker übernimmt nur die Infrastruktur:

- **PostgreSQL** (Port 5433 auf dem Host, 5432 im Container)
- **RustFS** als S3-kompatibler Object Store (siehe `doc/s3-verzeichnisschema.md`), Console auf Port 9001, S3-API auf Port 9000
- **Caddy** als Reverse Proxy: routet `*.hxroom.localhost` auf die lokalen pnpm-Dev-Server
- **LiveKit** (Signaling 7880, Medien 7881/tcp und 7882/udp), erreichbar als `livekit.hxroom.localhost`
- **ClamAV** nur auf Wunsch (Profil `clamav`, Port 3310): `docker compose -f infra/docker-compose.dev.yml --profile clamav up -d clamav` und `CLAMAV_HOST=localhost` in `apps/api/.env`. Ohne `CLAMAV_HOST` prüft die API nicht – lokal der Normalfall.

Weitere Services (Redis, Whisper) werden ergänzt, wenn sie lokal benötigt werden.

### Produktion (`docker-compose.yml`)

Alle Services laufen als Container auf dem Hetzner-Host:

```yaml
services:
  api, coach, bookingpage, admin, landing   # gebuildete App-Images
  postgres:   image: postgres:17-alpine
  livekit:    image: livekit/livekit-server:v1.13.6
  clamav:     image: clamav/clamav-debian:1.5.4  # Virenscan geteilter Dateien, nur intern (3310)
  caddy:      build: ./infra/caddy               # mit IONOS-DNS-Plugin für Wildcard-TLS

# Noch nicht gebaut, kommen mit ihrer Phase:
#  redis:           # erst mit Egress oder einer zweiten API-Instanz (§8)
#  livekit-egress:  # Recordings → S3 (Phase 6)
#  whisper:         # faster-whisper HTTP-Wrapper (Phase 6)
```

**Object Storage – zwei Umgebungen, ein Client:** In Produktion liegt der Speicher außerhalb des Stacks, bei **Hetzner Object Storage**; `docker-compose.yml` enthält deshalb keinen Object-Store-Container, und `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE` und `S3_BUCKET` kommen aus der `.env`. In der Entwicklung läuft weiter **RustFS** in `docker-compose.dev.yml`, mit festen Testschlüsseln. Der Client-Code ist in beiden Fällen derselbe, ebenso Bucket-Struktur und Key-Schema.

**Redeploy** (`infra/redeploy.sh`, auf dem Server nach `git pull`): holt die Images aus der CI, baut `caddy` und `backup` und startet per `up -d` nur die Dienste neu, deren Image, Compose-Konfiguration oder `.env` sich geändert hat. Ein Frontend-Update unterbricht so kein laufendes Gespräch. Die als Einzeldatei eingebundene Konfiguration (`caddy/Caddyfile`, `livekit/livekit.yaml`) erkennt Compose nicht. Das Skript merkt sich deshalb ihre Prüfsummen in `infra/.redeploy-state/` und startet den Dienst nur nach einer Änderung neu. Ein `caddy reload` genügt dafür nicht: Git ersetzt die Datei durch eine neue, und der laufende Container sieht über die Einbindung weiter die alte.

**Upgrade-Pfad:** Einzelne Services (z.B. `postgres`, `redis`) können ohne Architekturänderung auf verwaltete Hetzner-Managed-Angebote ausgelagert werden.

### Eingehende Ports und Hetzner-Cloud-Firewall

Alles, was von außen erreichbar sein muss, steht hier – die Liste ist die Vorlage für die
Regeln der **Hetzner-Cloud-Firewall**:

| Port | Protokoll | Dienst | Grund |
|---|---|---|---|
| 22 | TCP | SSH | Serverzugang und Tunnel (siehe unten). Nicht Teil des Compose-Stacks. |
| 80 | TCP | Caddy | HTTP → HTTPS-Weiterleitung und ACME-Fallback |
| 443 | TCP | Caddy | HTTPS für alle Web-Oberflächen und die API |
| 443 | UDP | Caddy | HTTP/3 (QUIC) |
| 7881 | TCP | LiveKit | Medien-Fallback, wenn UDP blockiert ist (Firmennetze) |
| 7882 | UDP | LiveKit | Medien im Normalfall (ICE/DTLS/SRTP) |

**Der Rest bleibt bewusst zu.** Postgres (5432) ist im Compose an `127.0.0.1` gebunden –
vom Host aus erreichbar, aus dem Internet nicht; man kommt über einen SSH-Tunnel heran.
Dasselbe gilt lokal für RustFS (9000/9001), das in Produktion gar nicht läuft. Das LiveKit-Signaling (7880) ist in Produktion gar nicht auf den
Host veröffentlicht: Caddy erreicht es über das Docker-Netz, von außen führt der einzige
Weg über `livekit.hxroom.de` (443). Lokal liegt es auf `127.0.0.1:7880`, damit das
LiveKit-CLI ohne Umweg drankommt (§15).

Die Bindung an `127.0.0.1` ist die eigentliche Schutzschicht – die Firewall ist die
zweite. Wer einen Port veröffentlichen will, muss beides ändern.

**LiveKit ist der erste Dienst, der an Caddy vorbeigeht.** Bis dahin war die Firewall
trivial: Was nicht Caddy war, hörte auf `127.0.0.1`. Die Medien lassen sich nicht durch
einen HTTP-Reverse-Proxy leiten, deshalb brauchen 7881 und 7882 eine eigene Freigabe.
Fehlt sie, verbindet sich der Client erfolgreich (das Signaling geht ja über 443) und das
Bild bleibt trotzdem schwarz – ein Fehlerbild, das man leicht im Frontend sucht.

---

## 5. Funktionen der Coach-App

Was die Coach-App fachlich leistet, steht in `funktionen/backoffice-coach.md`, die Anforderungen an die Bedienung in `ux-anforderungen.md`. Hier steht, wie die Bereiche technisch arbeiten. Manuell angelegte Termine beschreibt §12, Impressum und Datenschutz §6, den Call §8.

**Navigation.** Seitenleiste aus `layouts/default.vue`. Ein Menüpunkt bleibt auf seinen Unterseiten markiert, es gewinnt der längste passende Pfad. Unterhalb von `lg` gibt es stattdessen eine Kopfleiste mit Menüknopf und Seitentitel; der Knopf öffnet die Seitenleiste als Slideover. Die Wochenansicht unter Termine ist auf dem Handy ausgeblendet. Im Benutzermenü wählt der Coach die Darstellung: hell, dunkel oder wie das System (`useColorMode`).

**Beta-Ausblendung.** Was es noch nicht gibt, ist ausgeblendet statt angekündigt (UX-01). Eine Datei steuert das: In `app/utils/beta.ts` nimmt `BETA_HIDDEN_ROUTES` Seiten aus dem Menü, `middleware/beta.global.ts` leitet ihre Adressen aufs Dashboard, und `SHOW_UPCOMING_FEATURES` blendet die Kacheln „Geplante Features“ (`UpcomingFeature`) aus. Kommt eine Funktion, wird sie dort herausgenommen.

**Onboarding-Checkliste** (Dashboard, `utils/dashboard.ts`). Sechs Schritte: Buchungsseite prüfen, Sitzungsangebot anlegen, Verfügbarkeit festlegen, Impressum hinterlegen, Probe-Sitzung machen, Buchungslink teilen. Drei davon lesen Merker an `booking_page`:
- `reviewed_at`: Einstellungsseite der Buchungsseite einmal geöffnet (`POST /booking-page/reviewed`), alternativ sind Tagline, Text oder Foto gepflegt
- `test_session_at`: beim Einlass in die Probe-Sitzung gesetzt, bleibt nach dem Aufräumen stehen
- `link_shared_at`: Link einmal kopiert (`POST /booking-page/link-shared`, gemeldet von `useBookingLink`), alternativ gibt es eine echte Buchung

Die Schritte „Probe-Sitzung machen“ und „Buchungslink teilen“ führen nicht auf eine Seite, sondern lösen eine Aktion aus (`OnboardingStep.action`).

**Probe-Sitzung** (`POST /api/v1/bookings/test-session`, `TestSessionModal`). Der Coach spricht mit sich selbst: am Rechner als Coach, auf dem Handy als Klient, über einen QR-Code (`uqr`, ohne Anfrage an Dritte). Das ist ein Termin mit Herkunft `test`: sofort, 15 Minuten, bestätigt. Name und Adresse des Coachs stehen nur am Termin, es entsteht kein Klient, und es geht keine Mail hinaus, auch keine Absage. Unter Termine und in der Agenda trägt er ein Abzeichen, in Kennzahlen und Erinnerungen zählt er nicht. `TestSessionCleanupService` löscht ihn 24 Stunden nach dem Ende samt Notizen, Chat und Dateien (täglich um 04:00). Erreichbar ist er nur über die Checkliste.

**Spontan-Termin** (`POST /api/v1/bookings/ad-hoc`, `AdHocSessionModal`). Ein Termin, der jetzt beginnt, sofort bestätigt, für einen Klienten oder eine E-Mail-Adresse. Gehört die Adresse schon einem Klienten, wird er ihm zugeordnet. Andernfalls legt der Coach wahlweise einen Klienten an (Name Pflicht), sonst steht die Adresse nur am Termin. Die Einladung geht sofort per Mail hinaus, der Zugangslink steht zusätzlich zum Kopieren bereit. Ohne Subdomain antwortet die API mit `409`. Dieselbe Auswahl „Klient oder E-Mail-Adresse“ nutzen manuelle Termine (`useBookingInvitee`, `BookingInviteeFields`).

**Klientenseite.** `/clients/:id` zeigt Kopf mit Kennzahlen (aus der Terminliste des Profils, `clientStats`), links die Reiter Termine, Notizen und Dateien (`?tab=`), rechts die Karten „Nächster Termin“ und „Nur für dich“ (Coaching-Ziele und interne Notiz, direkt in der Karte bearbeitbar); auf dem Handy wird die rechte Spalte zum Reiter „Profil“. Die Ziele liegen in `clients.goals` (Freitext, über `PATCH /api/v1/clients/:id`), die Notizen-Chronik kommt aus `GET /api/v1/clients/:id/notes` (Sitzungsnotizen aller Termine des Klienten), die Dateien aus `GET /api/v1/clients/:id/files` (alle `session_chat_files` seiner Termine, geöffnet über die Datei-Route der Sitzung).

**Terminseite und Abschlusskarte.** `/bookings/:id` in der Coach-App zeigt einen Termin ausführlich: Kopf mit Datum, Kurzangaben und Status in einer Zeile, rechts daneben „Sitzung starten“ (sobald startbar) und das Drei-Punkte-Menü mit Folgetermin, Kalendereintrag, Klientenzuordnung, „Nicht erschienen“ und der Absage (Modal). Darunter links die Notizen, rechts „Details“ mit Nachricht, Kontakt und Verlauf (gebucht, bestätigt, Gespräch, abgesagt); nach dem Einlass kommt der Reiter „Chat & Dateien“ hinzu (`?tab=`). Sie lädt über `GET /api/v1/bookings/:id` (nur die eigene Organisation, sonst `404`), unabhängig von der Terminliste. Das Termin-Slideover bleibt unter Termine die Kurzansicht mit „Als Seite öffnen“; von der Klientenseite führen die Terminkacheln direkt auf die Terminseite, „Zurück“ dort wieder auf die Klientenseite. Slideover und Terminseite nutzen dieselben Aktionen (`useBookingActions`); das Slideover zeigt sie als Leiste im Fuß (`BookingActionBar`), die Terminseite im Kopf (`BookingHeaderActions`). Nach „Sitzung beenden“ zeigt die Call-Seite die Abschlusskarte (`SessionSummaryCard`) mit Dauer aus `admittedAt` und `callEndedAt`, Notizen und Chat, gelesen aus der API, dazu „Zu den Sitzungsdetails“ auf die Terminseite und „Zum Dashboard“.

**Tatsächliche Dauer.** Die Dauer einer gehaltenen Sitzung ist die Spanne von `admittedAt` bis `callEndedAt`, ohne eigene Spalte. Endet die Sitzung, weil der Coach gegangen und nach der Nachfrist nicht zurückgekommen ist, gilt `coachLeftAt` als Ende, nicht der Zeitpunkt des Laufs. Agenda, Sitzungskacheln der Klientenseite, Termin-Slideover und Terminseite zeigen bei gehaltenen Sitzungen die tatsächliche Dauer statt der geplanten (`formatBookingDuration`).

**Feedback.** Der Menüpunkt „Feedback“ (Abzeichen „Beta“) unten in der Seitenleiste der Coach-App schickt Art, Text und Pfad der Seite an `POST /api/v1/feedback`. Die API speichert dazu den User-Agent in `feedback` und meldet die Einsendung per Mail an `FEEDBACK_EMAIL`, mit dem Coach als Antwortadresse. Ohne die Variable wird nur gespeichert. Höchstens 20 Einsendungen pro Coach und Stunde. Der Betreiber sieht alles unter „Feedback“ (`GET /api/v1/admin/feedback`), liest den vollen Text im Fenster und löscht Einträge endgültig (`DELETE /api/v1/admin/feedback/:id`).

---

## 6. Domain-Architektur

```
hxroom.de              → Nuxt-App `landing` (öffentlich)
app.hxroom.de          → Nuxt-App `coach` (Coach-Backoffice, Login erforderlich)
app.hxroom.de/call/*   → Route in `coach` (Call-Screen des Coachs)
[slug].hxroom.de       → Vite-SPA `bookingpage` (Klienten-Subdomain: Buchung & Bestätigung)
[slug].hxroom.de/call/* → Route in `bookingpage` (Warteraum + Call für Klienten)
api.hxroom.de          → NestJS API
admin-api.hxroom.de    → dieselbe NestJS API, eigener Host nur für das Betreiber-Backoffice
livekit.hxroom.de      → LiveKit Server (intern, kein öffentliches UI)
admin.hxroom.de        → Nuxt-App `admin` (internes Betreiber-Backoffice, ab MVP)
```

**Warum zwei API-Hosts?** Session-Cookies sind host-gebunden, und ihr Name gilt instanzweit (`advanced.cookiePrefix` lässt sich nicht pro App setzen). Sprächen Coach- und Betreiber-App denselben API-Host an, gäbe es pro Browser nur **eine** Session: ein Betreiber-Login würde die Coach-Session überschreiben und umgekehrt. `admin-api.hxroom.de` zeigt deshalb auf denselben Container wie `api.hxroom.de`; getrennt sind allein die Cookie-Ablagen. Umgesetzt über die dynamische `baseURL` von better-auth (`allowedHosts`, siehe `apps/api/src/auth/auth-hosts.ts`) – **eine** Instanz, eine Session-Tabelle.

Der Host ist ausdrücklich **keine** Autorisierungsgrenze: welche Rolle was darf, entscheidet weiterhin `user.role` über den `AdminGuard` (§7).

**Subdomain-Routing im Frontend:** Jede Subdomain wird von ihrer eigenen App bedient (`apps/landing`, `apps/coach`, `apps/bookingpage`, `apps/admin`). Caddy routet allein anhand des Hostnames an den jeweiligen Container; innerhalb der App übernimmt deren eigenes Routing die URL-Auflösung – bei den Nuxt-Apps das file-based Routing (`pages/`), bei `bookingpage` der Vue Router. Da `bookingpage` als statische SPA ausgeliefert wird, liest sie den Coach-Slug clientseitig aus dem Hostname und lädt Branding und Buchungskontext über die API nach.

**Gesperrte Slugs:** Weil jeder Host ohne eigenen Caddy-Block an `bookingpage` geht, darf kein Coach einen Slug bekommen, der schon anders belegt ist – unter `api.hxroom.de` wäre seine Buchungsseite nie erreichbar. Die Sperrliste steht in `packages/shared/src/slugs.ts`: die belegten Hosts (Caddyfile und `autodiscover`, den einzigen DNS-Eintrag neben dem Wildcard), übliche Namen für Mail und Infrastruktur und absehbar eigene Namen wie `studio` oder `status`. `demo` ist bewusst frei: `demo.hxroom.de` ist die Vorführ-Buchungsseite des Betreibers, ein gewöhnliches Coach-Konto. Sie greift an allen drei Stellen, an denen ein Slug entsteht oder sich ändert:

- **Registrierung:** Ein gesperrter Name wird wie ein vergebener behandelt, aus „App“ wird `app-2`.
- **Einstellungen der Buchungsseite** (Feld „Subdomain“, `PATCH /api/v1/booking-page`): Die Prüfung steckt in `bookingPageSchema`. Damit weist sie die API mit `400` ab, und das Formular der Coach-App zeigt den Fehler schon beim Tippen.
- **`/organization/update` von better-auth:** Den Endpunkt nutzt keine Oberfläche, er steht dem Owner aber offen. Er weist gesperrte Slugs mit `SLUG_RESERVED` ab und alles, was kein gültiges DNS-Label in Kleinbuchstaben ist, mit `INVALID_SLUG_FORMAT`.

Wer einen neuen Host im Caddyfile anlegt, trägt ihn in die Liste mit ein.

**Impressum und Buchungssperre** (`legal.md` §3.2): Auf seiner Subdomain tritt der Coach als Anbieter auf und braucht ein eigenes Impressum.
- **Eingabe:** unter Einstellungen → Rechtliches (`/settings/legal`), als Link auf ein vorhandenes Impressum (Voreinstellung) oder als Angaben im Formular. Im Link-Modus öffnet „Link öffnen“ den eingetragenen Link, im Formular-Modus „Vorschau ansehen“ die Seite `/impressum`. Telefon ist Pflicht, bei Unternehmen auch Rechtsform und Vertretungsberechtigte, bei UG, GmbH und PartG der Registereintrag (`imprintSchema`). Das Feld `vatId` nimmt USt-IdNr. oder Wirtschafts-ID auf.
- **Speichern:** ausdrücklich und nur mit der Bestätigung „korrekt und vollständig“ (`PUT /api/v1/booking-page/legal`), Spalten `imprint_*` an `booking_page`.
- **Seite `/impressum` der Subdomain:** oben die Angaben des Coachs (`GET /api/v1/organizations/:slug/imprint`), darunter „Technischer Betrieb: HxRoom“. Die Angaben zum Betreiber stehen einmal in `LegalOperatorImprint` (`packages/ui/components/legal/`) und erscheinen ebenso auf `hxroom.de/impressum`. Die Stile der Rechtsseiten liegen in `packages/ui/theme/legal.css`.
- **Sperre:** Ohne vollständiges Impressum (`isImprintComplete` in `packages/shared/src/legal.ts`) liefert das öffentliche Profil `bookable: false`. Die Buchungsseite zeigt dann „Buchungen sind bald möglich“ statt der Buttons, und `POST …/bookings` lehnt mit `403` ab. Spontan-Termine des Coachs bleiben möglich.
- **Datenschutzerklärung:** ein gemeinsamer Text für alle Seiten in `LegalPrivacyPolicy` (`packages/ui/components/legal/`), auf hxroom.de und unter `/datenschutz` jeder Buchungsseite. Dort setzt die Seite den Coach als Verantwortlichen für den Abschnitt zu Klienten ein, aus seinem Impressum.
- **Verlinkt:** Impressum und Datenschutz in der Fußzeile jeder Seite der Buchungsseite, im Warteraum und unter jeder Mail an Klienten (`legalLinks` im `MailLayout`, aufgebaut in `bookings/booking-urls.ts`).
- **Datenschutz-Kasten im Warteraum** (`WaitingRoomPrivacy.vue`): „Was mit deinem Gespräch passiert“ mit Aufzeichnung, Übertragung, Chat und Dateien, KI und dem Link auf die Datenschutzerklärung des Coachs. Die Aussagen hängen an `privacy` in `CallAccessResponse` (`recording`, `transcription`, `endToEndEncrypted`), das `callPrivacy()` in `call/call-access.ts` setzt, heute alles `false`. Für `true` gibt es noch keine Texte: Die Zeile entfällt dann. Aufnahme und Ende-zu-Ende-Verschlüsselung (Phase 6) bringen ihre Texte mit.

**Die Call-Pfade brauchen keine eigene Caddy-Regel.** `/call/*` ist in beiden Apps eine gewöhnliche interne Route und wird über die bestehenden Host-Blöcke bedient:

```
app.hxroom.de/call/{bookingId}    → coach:80        → SPA-Fallback → Nuxt-Route /call/[bookingId]
[slug].hxroom.de/call/{bookingId} → bookingpage:80  → SPA-Fallback → Vue-Router-Route /call/:bookingId
```

Voraussetzung ist allein der SPA-Fallback `try_files $uri $uri/ /index.html` in den nginx-Konfigurationen beider Container – derselbe Mechanismus, der schon `/confirm/:bookingId` und `/cancel/:bookingId` bedient.

**Warum Coach und Klient trotzdem auf getrennten Hosts bleiben:** Das Session-Cookie gehört `api.hxroom.de`, nicht der Coach-App. Technisch könnte der Coach seinen Call also auch unter `[slug].hxroom.de` öffnen – beide Hosts sind same-site zu `api.hxroom.de`, das Cookie würde mitgesendet. Dagegen spricht das Pro-Feature „eigene Domain (CNAME)": Sobald ein Coach `coaching.anna-bergmann.de` auf seine Subdomain zeigen lässt, wäre der Aufruf cross-site, `SameSite=Lax` blockierte das Cookie, und Safaris Third-Party-Cookie-Sperre hebelte auch ein `SameSite=None` aus. Der Klient ist davon nie betroffen – er hat kein Cookie, sein Zugang ist der signierte Token in der URL. Die Trennung hält die Coach-Session dauerhaft von Custom-Domains fern.

Ein zweiter Effekt derselben Aufteilung: Kamera- und Mikrofonfreigaben gelten pro Origin. Der Coach erteilt sie einmalig auf `app.hxroom.de` und wird danach in keiner Sitzung erneut gefragt; der Klient erteilt sie auf der Subdomain seines Coachs und behält sie für alle weiteren Sitzungen dort.

**Wildcard-Zertifikat:** Caddy mit Ionos DNS-Provider (`caddy-dns/ionos`) für automatisches `*.hxroom.de` Let's-Encrypt-Zertifikat via DNS-01 Challenge.

### 6.1 `hxroom.io` und DNS

`hxroom.de` ist die einzige Domain mit Inhalten. `hxroom.io` ist für einen späteren internationalen Auftritt reserviert und leitet bis dahin jeden Host pfadgenau mit `301` auf sein Gegenstück unter `.de` (`infra/caddy/Caddyfile`, eigene `http://`-Blöcke, damit es bei einem Sprung bleibt; geprüft von `infra/scripts/verify-io-redirect.sh`). Kommt der englische Auftritt, bekommt `.io` eigene Inhalte mit `hreflang`, keine Kopie von `.de`.

Beide Zonen liegen bei Ionos, je mit `A`/`AAAA` für `@`, `www` und `*` auf den Server. Caddy holt die Zertifikate, auch die Wildcards, per DNS-01 über `IONOS_API_TOKEN`. Für die Mail stehen in `hxroom.de` MX (Ionos Mail Business), SPF für Brevo und Ionos, DKIM von Brevo und DMARC; das Verfahren beschreibt `newsletter-brevo.md`.

---

## 7. Authentifizierung & Sessions (better-auth)

better-auth übernimmt das gesamte Session-Management. Accounts im System haben ausschließlich **Coachs** und **Betreiber** – Klienten nie:

```
Coach registriert sich  → better-auth Session → JWT in HttpOnly Cookie
Betreiber (intern)      → better-auth Session mit user.role = 'admin'
Klient → kein Account, kein Login → Zugang nur via signiertem Token im Buchungslink
```

**Klienten-Zugang** funktioniert über einen Zufallstoken (256 Bit, `randomBytes(32)`), der beim Anlegen eines Termins generiert, in `bookings.clientAccessToken` abgelegt und per E-Mail verschickt wird. Geprüft wird er mit einem Konstantzeit-Vergleich (`common/client-token.ts`). Bewusst kein HMAC: Der Token muss ohnehin in der Datenbank stehen, damit die Buchung ihn kennt – und als gespeicherter Wert ist er zusätzlich einzeln widerrufbar, was eine reine Signatur nicht wäre. Derselbe Link erfüllt zwei Aufgaben nacheinander, keine zweite Mail nötig:

1. **Bestätigung der Buchung** – Klick auf den Link direkt nach der Buchung setzt `bookings.status` von `pending` auf `confirmed` und `confirmedAt`. Erst dadurch wird der Klienten-Datensatz final angelegt/verknüpft (§11, „Klienten-Matching“). Ohne Klick innerhalb der TTL verfällt die Buchung automatisch.
2. **Zugang zum Warteraum** – am Tag der Sitzung berechtigt derselbe Link zum Betreten des Warteraums (`apps/bookingpage`) und zur Generierung eines LiveKit-Access-Tokens für den Call.

Daneben trägt derselbe Token eine dritte, jederzeit mögliche Funktion: die **Selbstabsage** des Klienten (`/cancel/{bookingId}?token=…`). Sie ist bis zum Terminbeginn möglich, nimmt optional einen Grund entgegen und benachrichtigt den Coach per E-Mail. Der Absage-Link steht in der Mail „Dein Termin ist bestätigt"; er invalidiert den Token nicht, damit ein zweiter Aufruf „bereits abgesagt" meldet statt „ungültiger Link".

Der Token selbst trägt kein Ablaufdatum; begrenzt wird stattdessen der Zeitraum, in dem er den Warteraum öffnet – das **Zugangsfenster** von Terminbeginn −60 Minuten bis Terminende +120 Minuten (`call/call-access.ts`). Gemessen ab dem Ende, nicht ab dem Beginn: Bei einer 90-Minuten-Sitzung fiele der Zugang sonst noch während des Gesprächs weg. Außerhalb des Fensters meldet die API `too_early` beziehungsweise `expired` statt eines Fehlers, damit der Klient eine Wartezeit angezeigt bekommt.

Innerhalb des Fensters ist der Link **mehrfach** verwendbar. Ein Verbrauch nach dem ersten Join wäre in der Praxis eine Falle: Reload, Netzabbruch, Akku leer oder Wechsel vom Handy an den Rechner würden den Klienten aus seiner eigenen Sitzung aussperren, und er hat kein Konto, über das er wieder hineinkäme. `clientTokenUsedAt` hält deshalb nur den **ersten** Warteraum-Eintritt fest – für den Coach die Antwort auf „wie lange wartet er schon" – und invalidiert nichts. Ebenso wenig invalidieren die Bestätigung (`confirmedAt`) und der Aufruf des Absage-Links.

Der eigentliche Schutz liegt woanders: Der Klient landet nach dem Öffnen des Links im Warteraum, nicht im Gespräch. In den Call kommt er erst, wenn der Coach ihn einlässt (§8).

### Betreiber-Zugang (`admin.hxroom.de`)

Der Zugang zum Betreiber-Backoffice läuft über dieselbe better-auth-Instanz wie der Coach-Login – kein zweites Auth-System, kein Shared-Account. Grundlage ist das **better-auth `admin`-Plugin**, das eine globale Rollenspalte `user.role` einführt (`'user'` für Coachs, `'admin'` für Betreiber). Sie ist unabhängig von `member.role`, das weiterhin die organisationsbezogene Rolle (`owner`) trägt.

**Eigener API-Host, gleiche Instanz.** Die Admin-App spricht `admin-api.hxroom.de` an, nicht `api.hxroom.de` (§6). Der Grund ist die Cookie-Ablage: Session-Cookies hängen am Host, und ihr Name ist instanzweit festgelegt – über denselben API-Host gäbe es pro Browser nur eine Session für beide Rollen, ein Betreiber-Login würde die Coach-Session überschreiben. Mit dem zweiten Hostnamen liegen zwei getrennte Cookies vor, Coach- und Betreiber-Backoffice sind parallel nutzbar. Konfiguriert wird das über die dynamische `baseURL` (`allowedHosts`, `apps/api/src/auth/auth-hosts.ts`), gespeist aus `BETTER_AUTH_URL` und `ADMIN_AUTH_URL`.

Zwei Konsequenzen, die man beim Weiterbauen kennen muss: Das Protokoll der `baseURL` wird bewusst aus `BETTER_AUTH_URL` abgeleitet, weil better-auth daran den `__Secure-`-Prefix des Cookie-Namens festmacht – ein abweichender Wert würde alle bestehenden Sessions ungültig machen. Und Impersonation erzeugt die Session auf dem Admin-Host; sie authentifiziert damit **nicht** automatisch die Coach-App unter `app.hxroom.de`.

**Ein Betreiber ist Mitglied keiner Organisation.** Daraus folgt die Mandantentrennung ohne zusätzliche Prüfung: Ohne `member`-Eintrag bleibt `session.activeOrganizationId` leer, der `AuthGuard` setzt kein `req.organization`, und sämtliche Coach-Endpunkte antworten mit `401 No active organization`. Ein Betreiber kann Coach-Daten also nur über explizit dafür gebaute Admin-Endpunkte sehen, nie über die regulären Coach-APIs.

Der `AdminGuard` prüft zusätzlich zum `AuthGuard` `session.user.role` gegen die Betreiber-Rollen. Coach-Verwaltung, Sperren (`banUser`, verwirft alle Sitzungen), Rollen und Impersonation liefert das Plugin unter `/api/auth/admin/*`; die fachlichen Auswertungen liegen im NestJS-Modul `admin/` hinter dem `AdminGuard`. Ein vom Betreiber angelegter Coach (`admin.createUser`) bekommt seine Organisation über denselben `user.create`-Hook wie bei der Registrierung. Gelöscht wird ein Coach nie über `admin.removeUser`, das die Organisation verwaist zurückließe (§17).

**Aktivität der Coachs.** Die Coach-Liste (`GET /api/v1/admin/coaches`) zeigt neben Klienten und Sitzungen: zuletzt aktiv, aktive Angebote, Buchungen über die Buchungsseite und „Startklar“ (Impressum vollständig, Probe-Sitzung gemacht, Link geteilt oder erste Buchung). „Zuletzt aktiv“ ist `user.last_active_at`. Der `AuthGuard` setzt es über den `ActivityTracker` (`apps/api/src/auth/activity-tracker.ts`) höchstens einmal pro Stunde und Coach, übernommene Sitzungen zählen nicht. Die session-Tabelle taugt dafür nicht: Zeilen verschwinden beim Abmelden, und eine Sitzung hält Tage.

**AGB und AVV.** Die Registrierung hat keine Checkbox. Unter „Konto erstellen“ steht der Hinweis, dass HxRoom sich an Selbständige richtet und mit dem Klick AGB und AVV gelten, beide verlinkt. Der Klick ist die Zustimmung, das Formular schickt dabei `acceptTerms: true`. Die ausdrückliche Bestätigung als Unternehmer (§ 14 BGB) folgt erst beim Abo-Abschluss (§12, Subscription-Flow). better-auth weist `/sign-up/email` ohne `acceptTerms: true` im Body ab (`hooks.before`, Code `TERMS_NOT_ACCEPTED`). Der Hook `user.create.after` schreibt dann die Fassung `TERMS_VERSION` (`packages/shared/src/terms.ts`, gleich dem Stand-Datum von hxroom.de/agb und /avv) in `terms_acceptances`, ohne IP-Adresse. Konten ohne Zustimmung (ältere, per `admin.createUser` angelegte) sehen in der Coach-App ein nicht schließbares Modal und stimmen über `POST /api/v1/account/terms` zu. In einer übernommenen Sitzung antwortet der Endpunkt mit `403`, und die App zeigt nur einen Hinweis. Neue Fassungen lösen kein Modal aus, Änderungen laufen nach AGB §11 per Mail. Die Bestätigungsmail der Registrierung verlinkt beide Texte, Einstellungen → Rechtliches zeigt Fassung und Zeitpunkt.

**Name des Kontos.** `user.name` steht im Benutzermenü, in der Begrüßung des Dashboards, in den Mails an den Coach und in der Coach-Liste des Betreibers. Der Coach ändert ihn unter Einstellungen → Account über `updateUser` von better-auth. Der Name auf der Buchungsseite (`organization.name`) und die Subdomain werden bei der Registrierung daraus vorbelegt, sind danach aber eigene Felder unter Einstellungen → Buchungsseite. Für Registrierung und Änderung gilt `userNameSchema` (`packages/shared/src/account.ts`, 2 bis 160 Zeichen): im Formular und in `hooks.before`, das `/sign-up/email` und `/update-user` mit ungültigem Namen abweist (Code `INVALID_NAME`).

---

## 8. Videocall-Architektur (LiveKit self-hosted)

### Verortung im Monorepo

Der Videocall verteilt sich auf mehrere Ebenen:

| Ort | Verantwortung |
|---|---|
| `infra/livekit/` | LiveKit-Server (Docker-Container) mit `livekit.yaml`, ab Phase 6 auch Egress. |
| `apps/api/` | Erzeugt Buchungstokens für Klienten und LiveKit-Access-Tokens, hält den Sitzungszustand (Warteraum, Einlass, Ende), empfängt LiveKit-Webhooks, speichert Notizen, Chat und Dateien. |
| `packages/livekit/` | **Geteilte Call-Mechanik** – LiveKit-Composables (Room-Verbindung, Tracks, Geräte, Reconnect) als reine TypeScript-Schicht **ohne eigene Komponenten**. Nutzt das LiveKit JS SDK (`livekit-client`). |
| `packages/ui/components/call/` | **Geteilte Call-Oberfläche** – rollenfreie Komponenten (Gerüst, Bühne, Steuerleiste, Chat, eigenes Kamerabild), die Coach und Klient gemeinsam tragen. Liegt hier und nicht in `packages/livekit`, damit die Mechanik komponentenfrei und ohne `@nuxt/ui` bleibt; `packages/ui` hat den Peer ohnehin und wird von beiden Frontends geladen. |
| `apps/bookingpage/` | **Klienten-Subdomain** (`[slug].hxroom.de`) – Angebote, Verfügbarkeiten, Buchungsseite, E-Mail-Bestätigung sowie Warteraum und Call des Klienten unter `/call/{bookingId}`. Zugriff über den signierten Buchungstoken; dazu Geräte-Einrichtung, Datenschutz-Kasten und die Danke-Seite. |
| `apps/coach/` | Coach-Backoffice (`app.hxroom.de`) – Klientenverwaltung, Angebote, Einstellungen, die „Klient wartet"-Benachrichtigung (Server-Sent Events) und der Call-Screen des Coachs unter `/call/{bookingId}`. Zugriff über die better-auth Session; enthält Einlassen-Button, Seitenleiste mit Notizen, Klient und Chat, Sitzungs-Timer und Abschlusskarte. |

**Geteilte Schicht statt eigener Call-App:** `/call/*` ist in beiden Apps eine interne Route (§6). Gemeinsam ist deshalb nicht die App, sondern die Schicht darunter – die LiveKit-Mechanik in `packages/livekit` und die Video-Bühne in `packages/ui/components/call/`. Beide werden von beiden Seiten importiert. Eine eigenständige Call-App bräuchte dagegen einen dritten Container, ein Base-Path-Setup für ihre Assets und eine Host-Header-Weiche für zwei Auth-Schemata.

**Rollenunterschiede über Props und Slots statt über zwei Implementierungen:** Die Call-Oberfläche ist rollenneutral gebaut – sie kennt `local` und `remote`, nicht Coach und Klient; was die beiden unterscheidet, wird beim Einbinden hineingereicht: die Namen als `CallPeer`, die Bereiche der Seitenleiste als `panels` und ihr Inhalt als Slot `#sidebar` (Notizen und Klientenakte beim Coach, nur Chat beim Klienten), die Beschriftung des roten Knopfs als `endLabel` („Sitzung beenden" gegen „Gespräch verlassen"), und über den Slot `#stage-overlay` alles, was über der Bühne liegen soll – beim Klienten die Gerätemeldung, später das Einwilligungs-Banner. Der Verbindungszustand (`RoomStatus`: `idle` | `connecting` | `connected` | `failed` | `ended`) ist ein Ref aus `useCallRoom()`, das die App beobachtet und daraufhin etwa den Klienten auf die Danke-Seite weiterleitet.

**Herkunft der Schicht:** `packages/livekit` stammt aus **HxMeet** (`hxmeet-core-component`, MIT-Lizenz, eigene Vorarbeit), entkernt auf den HxRoom-Scope. Geblieben ist die erprobte LiveKit-Mechanik: `prepareConnection()` als Warmlauf schon im Warteraum, browserspezifische Behandlung verweigerter Kamera-/Mikrofonfreigaben (Chrome, Safari und fehlende Hardware melden sich unterschiedlich), Connect-Retry und die Auswertung der `DisconnectReason`. Das Paket enthält nur TypeScript und hat außer `vue` keine Peer-Abhängigkeit.

Die Teilnehmer bleiben dabei als **Liste** modelliert, obwohl HxRoom 1:1 führt: Wer der lokale ist, sagt `localIdentity`. Ein auf zwei Personen verdrahtetes Modell müsste für jeden weiteren Teilnehmer wieder aufgemacht werden.

**Session-Notizen – Split nach Zeitpunkt, nicht nach App:** Live-Editing während der Sitzung passiert im Call-Screen in `apps/coach` und schreibt direkt in `session_notes` über `apps/api`. Das Einsehen/Nachbearbeiten in der Sitzungshistorie (Klientenliste, CRM) liegt in derselben App, aber außerhalb des Calls. Beide Oberflächen greifen auf dieselbe Tabelle zu – keine Logik-Duplikation.

### Deployment

LiveKit läuft als Docker-Container auf demselben Hetzner-Server, konfiguriert über `infra/livekit/livekit.yaml`.

```yaml
# infra/livekit/livekit.yaml (Produktion)
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
```

Die Schlüssel stehen bewusst **nicht** in der Datei, sondern kommen als `LIVEKIT_KEYS`
(Format `key: secret`) aus der Umgebung – so bleibt die Konfiguration im Repo und das
Geheimnis in `infra/.env`.

**Kein Redis:** LiveKit braucht Redis erst für mehrere Instanzen oder für Egress
(Phase 6). Der Stack fährt eine Instanz, ein Redis-Container existiert nicht.

**Zwei Konfigurationsdateien**, analog zu `Caddyfile` / `Caddyfile.dev`: In
`livekit.dev.yaml` steht statt `use_external_ip: true` ein `node_ip: 127.0.0.1`. Der
Unterschied ist nicht kosmetisch – LiveKit annonciert dem Client eine IP als
ICE-Kandidat. Lokal läuft der Browser auf dem Host und LiveKit im Container; annoncierte
der Server dort seine öffentliche IP, zeigte der Kandidat ins Leere und die Verbindung
scheiterte ohne brauchbare Fehlermeldung.

**Ein UDP-Mux-Port statt einer Range:** Üblich wäre `port_range_start/end` über
50000–60000. Unter Docker ist das keine Option – pro gemapptem Port entsteht eine eigene
Weiterleitung, eine Range dieser Größe macht den Start des Stacks unbrauchbar langsam.

**Caddy trägt nur das Signaling.** Über `livekit.hxroom.de` läuft die HTTP- und
WebSocket-Verbindung auf Port 7880; die Medien gehen am Reverse Proxy vorbei direkt auf
7881/tcp und 7882/udp und brauchen deshalb eine eigene Freigabe – die Portliste steht in
§4, „Eingehende Ports und Hetzner-Cloud-Firewall".

### Raummodell

Jeder Coach bekommt einen **persistenten LiveKit Room** pro Buchung. Der Room-Name ist deterministisch aus der Booking-ID generiert:

```
room-name: session_${bookingId}
```

### Token-Generierung (NestJS)

Umgesetzt in `call/livekit-token.ts` als reine Funktionen mit dem `ConfigService` als
Parameter – dasselbe Muster wie `bookings/booking-urls.ts`, damit der Aufbau eines Tokens
ohne Nest-DI testbar bleibt.

```typescript
const token = new AccessToken(apiKey, apiSecret, {
  identity: callIdentity(role, id),   // coach_${userId} | client_${bookingId}
  name: displayName,                  // Anzeigename der Gegenseite auf der Bühne
  ttl: '10m',
});
token.addGrant({
  room: callRoomName(bookingId),      // session_${bookingId}
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,               // für Signale während der Sitzung
});
return token.toJwt();                 // asynchron: gibt ein Promise zurück
```

Kein `roomCreate`: Den Raum legt LiveKit beim ersten Join selbst an
(`room_auto_create`). `roomCreate` wäre ein Admin-Grant für die RoomService-API und hat in
einem Token, das an den Browser geht, nichts zu suchen.

Der Token geht nicht über einen eigenen Endpunkt hinaus, sondern als Feld `livekit` in der
bestehenden `CallAccessResponse`. Das Feld hat zwei Stufen, und die Trennung ist
beabsichtigt:

```ts
livekit: { url: string; token: string | null } | null
```

Die `url` steht ab dem offenen Zugangsfenster bereit (`mayReachRoom()`), damit der Klient
die Verbindung schon im Warteraum vorwärmen kann – `prepareConnection()` braucht kein
Token. Sie gehört in die Antwort, weil sie sich zwischen lokal (`ws://`) und Betrieb
(`wss://`) unterscheidet und eine zweite Konstante im Frontend auseinanderliefe. Eine
Berechtigung ist sie nicht; das Geheimnis ist allein der Token.

Der `token` kommt erst, wenn dieser Aufrufer beitreten darf (`mayJoinRoom()`): der Klient
ab `admitted`, der Coach schon ab `open` – er lässt ein und muss vor dem Klienten im Raum
sein. Ausgestellt wird er bei jedem Abruf neu, wodurch sich die Spanne zwischen zehn
Minuten Laufzeit und bis zu einer Stunde Wartezeit ohne Sonderweg auflöst.

**Zwei verschiedene Zeitgrenzen, nicht verwechseln:** Das Zugangsfenster aus §7 (Beginn −60 min bis Ende +120 min) entscheidet, wann der Buchungstoken den Warteraum öffnet. Die TTL des LiveKit-Tokens begrenzt dagegen nur das Zeitfenster, in dem er zum *Verbinden* benutzt werden kann, nicht die Gesprächsdauer; eine bestehende Verbindung bleibt darüber hinaus bestehen. 10 Minuten reichen deshalb aus und halten die Gültigkeit eines abgefangenen Tokens kurz.

**Teilnehmer-Identität:** `identity` muss im Raum eindeutig sein – verbinden sich zwei Clients mit derselben Identität, trennt LiveKit den ersten (`DUPLICATE_IDENTITY`). Sie wird deshalb deterministisch und rollengetrennt vergeben: `coach_${userId}` für den Coach, `client_${bookingId}` für den Klienten.

**Der Raumname ist keine Sicherheitsgrenze.** Er entsteht deterministisch aus der Booking-ID und ist damit ratbar, sobald jemand eine Booking-ID kennt. Die Mandantentrennung hängt allein an der Token-Ausgabe: Der Endpunkt muss beim Coach prüfen, dass die Buchung zu seiner `activeOrganizationId` gehört, und beim Klienten, dass der Buchungstoken zu genau dieser `bookingId` passt, das Zugangsfenster offen ist und der Coach ihn eingelassen hat. Umgesetzt ist sie an genau einer Stelle, `call/call.service.ts` – die LiveKit-Token-Ausgabe hängt sich an dieselben Methoden, statt die Prüfung ein zweites Mal zu schreiben. Das ist die eine Stelle dieser Architektur, an der ein Fehler teuer wird.

**Zwei Domains sind für LiveKit unkritisch:** Die Raumzugehörigkeit hängt ausschließlich am `room`-Grant im JWT; von welcher Origin die Seite ausgeliefert wurde, wertet LiveKit nicht aus. Das Signaling läuft als WebSocket ohne CORS-Preflight, die Medien als ICE/DTLS/SRTP – auf dieser Ebene existiert der Origin-Begriff gar nicht. Coach und Klient können sich also problemlos von `app.hxroom.de` und `[slug].hxroom.de` aus in denselben Raum verbinden.

### Sitzungsende und Webhooks

Eine Sitzung endet auf zwei Wegen, mit derselben Wirkung (gehalten, `completed`, Klient auf der Danke-Seite):

- **Der Coach klickt „Sitzung beenden"** – der Normalfall.
- **Der Coach verlässt den Raum und kommt innerhalb von 2 Minuten nicht zurück** (`call/call-presence.service.ts`, die Regel als reine Funktion in `call/call-presence.ts`). LiveKit meldet Beitritt, Verlassen und das Schließen eines Raums per Webhook an `POST /api/v1/livekit/webhooks`; das Verlassen trägt `bookings.coach_left_at` ein, ein Beitritt leert die Spalte wieder, und ein Lauf alle 30 Sekunden beendet, was abgelaufen ist. Vor dem Beenden fragt er LiveKit selbst, ob der Coach nicht doch im Raum ist – Webhooks kommen nicht zwingend in der richtigen Reihenfolge an, etwa beim zweiten Tab (`DUPLICATE_IDENTITY`). Dass der Klient geht, beendet nichts.

Der Webhook-Endpunkt hat keinen AuthGuard; sein Ausweis ist die Signatur von LiveKit (JWT mit dem API-Schlüssel und der SHA-256-Summe des Bodys), geprüft mit dem `WebhookReceiver` des SDK auf dem unveränderten Body. LiveKit ruft ihn über das Docker-Netz (`http://api:3000`), nicht über Caddy. `livekit.yaml` braucht dafür den Namen des Schlüssels; weil LiveKit in der Datei keine Umgebungsvariablen ersetzt, setzt der Start des Containers ihn aus `LIVEKIT_API_KEY` in eine Kopie ein.

### Warteraum-Flow

Der Warteraum ist **kein separater LiveKit Room**, sondern ein Frontend-Zustand:

1. Klient öffnet `[slug].hxroom.de/call/{bookingId}` mit Buchungs-Token → `apps/bookingpage` zeigt die Warteraum-UI (Coach-Branding) und wärmt die LiveKit-Verbindung per `prepareConnection()` vor
2. `apps/api` prüft den Token, gibt aber noch **keinen** LiveKit-Token aus
3. Coach sieht in `apps/coach` die „Klient wartet"-Benachrichtigung (via Server-Sent Events) und folgt dem Link zu `app.hxroom.de/call/{bookingId}`
4. Coach klickt dort auf „Einlassen" → `apps/api` generiert den LiveKit-Token für den Klienten
5. Frontend des Klienten verbindet sich mit dem LiveKit Room – dank Warmlauf nahezu ohne Verzögerung

Das Einlassen selbst kann **nicht** über den LiveKit-Data-Channel signalisiert werden, weil der Klient zu diesem Zeitpunkt noch nicht im Raum ist. Es läuft über die API und den SSE-Kanal. Erst Signale *während* der Sitzung – etwa „Coach beendet die Sitzung" – nutzen den Data-Channel.

**Zustand und Ereigniskanal** (`apps/api/src/call/`): Zustand und Zugangsfenster sind eine Zustandsmaschine an der Buchung (`CallService`, eine Antwortform `CallAccessResponse` für beide Rollen), dazu zwei SSE-Ströme – `GET /bookings/:id/waiting-room/events?token=…` für den Klienten und `GET /bookings/:id/call/events` für den Coach. Jedes Zustandsereignis trägt den vollständigen Zustand, ein verpasstes heilt damit beim nächsten von selbst. Der Ereignisbus (`CallEventsService`) transportiert nur die `bookingId`; den Stand lädt der jeweilige Strom selbst – so kann auch die Absage durch den Coach einen wartenden Klienten sofort erreichen. Bus und Präsenzregistry leben im Prozess und setzen eine einzelne API-Instanz voraus, wie die Läufe des `ScheduleModule`. Die Links in Warteraum und Call baut `bookings/booking-urls.ts`.

### Im Gespräch

- **Geräte:** Kamera, Mikrofon und Wechsel im laufenden Gespräch; die Wahl wird je Browser gemerkt, zusätzlich zum Gerätenamen, weil Browser ohne dauerhafte Freigabe die Geräte-IDs bei jedem Laden neu vergeben. Eine Wahl des Lautsprechers fehlt (§16 Punkt 06).
- **Einrichten im Warteraum** (`CallDeviceSetup`): erst auf Klick, vorher kein `getUserMedia`. `startPreview()` legt die Spuren außerhalb des Raums an, `joinCall()` übernimmt sie beim Einlass. Kein zweiter Freigabedialog, und die Vorschau wird deshalb auf Seitenebene beendet, nie im Warteraum selbst.
- **Bildschirmfreigabe** wo der Browser sie kann (`screenShareSupported()`). Solange geteilt wird, sendet die Kamera nur die niedrigste Ebene, damit die Freigabe die Leitung bekommt. Codec bleibt VP8: VP9 erzwingt in `livekit-client` für Freigaben `L1T3` und ist damit in Chrome bei knapper Leitung schlechter. Fehlt unter macOS die Berechtigung zur Bildschirmaufnahme, sagt die Oberfläche das.
- **Hintergrund weichzeichnen** (`packages/livekit/src/blur.ts`, `@livekit/track-processors`, per `import()` nachgeladen): je Browser gemerkt, keine Kennzeichnung beim Gegenüber. WASM und Modell kommen von der eigenen Origin (§17).
- **Notizen** (`session_notes`, `GET/PUT /bookings/:id/notes`, `useSessionNotes`): eine Notiz pro Termin, Tiptap-JSON, automatisch gespeichert; dieselbe Notiz im Call, im Termin-Slideover und auf der Terminseite.
- **Panel „Klient“** (`GET /bookings/:id/call/client`, nur für den Coach): Sitzungsnummer, frühere Sitzungen und deren Notizen als Klartext (`common/rich-text-plain.ts`), gezählt bis zum Beginn dieses Termins. Nicht Teil von `CallAccessResponse`, weil diese Antwort auch an den Klienten geht.
- **Debug-Modus:** `callQuality()` liest Auflösung, Bitrate, Verlust, Jitter und das gewählte ICE-Kandidatenpaar aus den RTC-Statistiken.

### Chat und Dateien

- **Nachrichten** (`session_chat_messages`, `call-chat.service.ts`, `useCallChat` je App): laufen über die API, nicht über den LiveKit-Datenkanal, und werden gespeichert. `seq` ist der Cursor („alles nach Nummer N“). Der Ereigniskanal meldet nur ein benanntes Ereignis `chat` ohne Inhalt, die Oberfläche holt nach; ein volles Zustandsereignis oder ein neu verbundener Strom stößt das Nachholen ebenfalls an. `clientMessageId` macht das Senden wiederholbar. Jede Chat-Transaktion sperrt die Buchungszeile, sonst könnte der Zeiger über Ungeholtes springen.
- **Wer darf was:** schreiben beide nur im Zustand `admitted`; lesen der Coach jederzeit, der Klient nur, solange sein Zugang gilt. Die Mandantengrenze prüft weiter `CallService`.
- **Dateien** (`session_chat_files`, eine je Nachricht, bis 25 MB, höchstens 20 je Sitzung): Hochladen über die API, damit vor dem Speichern geprüft wird. `call-file-type.ts` verlangt, dass Endung und Dateisignatur zusammenpassen, und speichert den so ermittelten Typ; erlaubt sind Dokumente und Bilder ohne Makro-Formate und ohne SVG. Bilder werden neu kodiert (ohne Metadaten) und bekommen ein Vorschaubild. Der Dateiname steht in der Datenbank, im Speicher nur die ID (`storage/paths.ts`).
- **Herunterladen** über eine dauerhafte Adresse der API, die prüft und mit `302` auf einen 15 Minuten gültigen signierten Link antwortet. Bilder werden auf den Beginn eines Zehn-Minuten-Fensters signiert, damit der Browser sie zwischenspeichern kann. PDFs öffnen im Browser, Office-Dateien werden heruntergeladen. Links und Dateien im Call immer mit `target="_blank"`: Eine Navigation im selben Tab trennt `livekit-client` vom Raum.
- **Entfernen:** Der Coach entfernt jede Datei jederzeit, der Klient seine eigenen während des Gesprächs (`mayRemoveChatFile`). Weg sind Original, Vorschau und Name; im Verlauf bleibt ein Platzhalter ohne Dateinamen. Die Gegenseite erfährt es über das Ereignis `chat-changed` und lädt den Verlauf ganz.
- **Virenscan** vor dem Ablegen (§17).
- **Nachlesen:** `CallChatPanel` im Modus `readonly` auf der Terminseite und im Slideover, nur für Termine mit Einlass.

### Verbindung und doppelte Tabs

- **Eigene Verbindung** (`packages/livekit`, `CallConnectionNotice`): `reconnecting`, solange `livekit-client` selbst neu verbindet. Jede Trennung, die nicht vom eigenen Verlassen kommt, endet in `failed` mit `connectionLoss`: `network` („Verbindung verloren“, „Erneut verbinden“, dazu automatische Versuche bei `online` und alle 15 Sekunden, weil ein Neustart des Medienservers kein `online` auslöst) oder `elsewhere` bei `DUPLICATE_IDENTITY` („In einem anderen Tab geöffnet“, „Hier weitermachen“, nie automatisch). Kamera und Mikrofon kommen zurück, wie sie vor dem Abbruch standen.
- **Das Gegenüber** (`CallPeer.presence`): `connecting`, `present`, `unstable` (LiveKit hört nichts mehr), `away` (war da und ist weg) oder `unknown`, solange die eigene Verbindung fehlt.

### Nicht erschienen

Status `no_show` an der Buchung: kein gehaltener Termin (nicht in `HELD_SESSION_STATUSES`) und keine Absage. Vermerken lässt sich nur, was bestätigt ist, schon begonnen hat und in das niemand eingelassen wurde (`canMarkNoShow`, sonst `409`): im Warteraum des Coachs und im Drei-Punkte-Menü des Termins (`POST /api/v1/bookings/:id/no-show`, `DELETE` nimmt es zurück). Der Klient sieht neutral „Dieser Termin ist vorbei“ (Call-Zustand `missed`), nie „nicht erschienen“.

---

## 9. Speech-to-Text (Whisper self-hosted, Phase 6)

Nach einer Sitzung entsteht auf Wunsch ein Transkript, nur mit Einwilligung des Klienten. Da Coaching-Gespräche hochsensibel sind, läuft die Transkription **ausschließlich self-hosted**: Keine Audiodaten verlassen Hetzner.

**Ablauf:** LiveKit Egress nimmt den Ton auf und schreibt ihn in den Objektspeicher (§10). Ein Job reiht die Transkription ein, ein schlanker HTTP-Wrapper um `faster-whisper` (`infra/whisper/`, Modell `small`, ohne GPU) schreibt das Transkript an die Notiz der Sitzung, danach wird die Aufnahme gelöscht. Egress und eine Job-Queue bringen Redis in den Stack (§4).

**Einwilligung (DSGVO Art. 6 + Art. 7):**
1. Der Coach schaltet die Transkription einmalig frei und verpflichtet sich damit, vor jeder Aufnahme zu fragen (protokolliert mit Zeitpunkt).
2. Der Klient sieht im Warteraum ein Einwilligungs-Banner. Stimmt er zu, wird die Aufnahme für diese Sitzung freigeschaltet, gespeichert mit Zeitpunkt, IP-Adresse und Fassung des Textes. Lehnt er ab, findet die Sitzung ohne Aufnahme statt.
3. Ein Widerruf (per Mail an den Coach) löscht Aufnahme und Transkript sofort. Das steht im AVV.

Der Datenschutz-Kasten im Warteraum (§6) muss dann ehrlich sagen, ob aufgenommen wird. Wie sich Aufnahme und Ende-zu-Ende-Verschlüsselung vertragen, ist offen (§16 Punkt 08).

---

## 10. Object Storage (S3-kompatibel)

Ein privater Bucket je Umgebung, dieselbe S3-API:

- **Produktion:** **Hetzner Object Storage** (`fsn1` Falkenstein oder `nbg1` Nürnberg; Helsinki ist wegen §17 ausgeschlossen). Extern betrieben, deshalb kein Container im Compose-Stack; die Zugänge (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`, `S3_BUCKET`) kommen aus der `.env`.
- **Entwicklung:** **RustFS** als Container in `infra/docker-compose.dev.yml`, mit festen Testschlüsseln und `S3_FORCE_PATH_STYLE=true`.

Angebunden über AWS SDK v3 in `storage/s3.service.ts`. Die Schlüssel der Objekte baut allein `storage/paths.ts`, nie aus Eingaben; oberstes Segment ist die Organisation, damit die Kontolöschung alles mit einem Prefix-Delete erfasst. Das vollständige Schema samt Geplantem steht in `s3-verzeichnisschema.md`.

**Was heute im Speicher liegt:**
- **Profilfoto des Coachs:** `{organizationId}/profile/avatar.webp`, ausgeliefert über einen eigenen Endpunkt der API, nicht direkt aus dem Bucket
- **Im Call geteilte Dateien:** `{organizationId}/sessions/{bookingId}/attachments/{fileId}.{ext}`, dazu `{fileId}-preview.webp` für Bilder; heruntergeladen über signierte Links (§8, „Chat und Dateien“)

**Kommt mit seiner Phase:** Logo der Buchungsseite, Aufnahmen für die Transkription (gelöscht nach erfolgreicher Transkription, §9) und Rechnungen als PDF. Der Datenexport des Coachs liegt nie im Speicher: `GET /api/v1/account/export` baut die ZIP-Datei im Request (§17).

---

## 11. Datenbankmodell mit Drizzle ORM

Das Schema steht in `apps/api/src/db/schema.ts`, handgeschrieben, Migrationen über `pnpm db:generate && pnpm db:migrate`; die API spielt sie beim Start ein. Hier nur, was man zum Weiterbauen wissen muss.

**Tabellen:**

| Bereich | Tabellen |
|---|---|
| better-auth | `user` (mit `role`, Sperre, `last_active_at`), `session`, `account`, `verification`, `organization`, `member`, `invitation` |
| Coach | `booking_page` (Profil, Texte, Impressum, Merker der Checkliste), `offers`, `availability_slots` (Wochenzeiten), `availability_settings` (Puffer, Vorlauf, Buchungsfenster), `terms_acceptances`, `feedback` |
| Klienten und Termine | `clients`, `bookings`, `session_notes`, `session_chat_messages`, `session_chat_files` |
| Protokolle | `coach_deletions`, `client_deletions` (nur IDs und Anzahlen, ohne Fremdschlüssel) |

**Mandantentrennung.** Alle Fachdaten hängen an `organization_id` mit `onDelete: 'cascade'`. Die Organisation ist der Einstiegspunkt für das Löschen (§17). Ein Klient gehört genau einer Organisation; bucht dieselbe Person bei einem anderen Coach, entsteht ein unabhängiger Datensatz.

**Klienten-Matching.** Mehrere Buchungen derselben Person sollen beim selben Klienten landen, ohne dass Klienten ein Konto brauchen.
- Die E-Mail-Adresse ist der Schlüssel, eindeutig je Organisation und vor jedem Vergleich normalisiert (`normalizeEmail()`: klein geschrieben, getrimmt).
- **Bestätigungspflicht:** Eine Buchung über die Buchungsseite startet als `pending` und wird erst durch den Link in der Bestätigungsmail `confirmed`. Erst dann wird der Klient angelegt oder verknüpft. Eine vertippte Adresse kann den Link nicht klicken und legt so keinen falschen Klienten an. Unbestätigte Buchungen verfallen nach der TTL (§12).
- **Weitere Wege:** Der Coach legt Klienten von Hand an, und beim Spontan-Termin oder manuellen Termin an eine E-Mail-Adresse wählt er, ob ein Klient entsteht (§5). Vom Coach angelegte Termine sind sofort `confirmed`.
- **Der Coach hat das letzte Wort:** Jede Buchung lässt sich jederzeit einem anderen Klienten zuordnen („Klient zuordnen“, `bookings.client_id`).
- Ohne Klient steht die Adresse als Name am Termin, und Mails an den Klienten grüßen ohne Namen (`greetingName()`).

**Termine (`bookings`).**
- **Snapshots:** Angebotsname, Dauer sowie Name, E-Mail, Telefon und Nachricht des Klienten werden beim Buchen kopiert. Ändert der Coach später Angebot oder Klient, bleibt der Termin, wie er gebucht wurde. `clients.phone` und `clients.note` pflegt nur der Coach.
- **Herkunft** (`origin`): `booking_page`, `ad_hoc`, `manual` oder `test`. Serien teilen eine `series_id` (§12).
- **Status:** `pending`, `confirmed`, `completed`, `cancelled`, `no_show`. Absagen tragen `cancelled_at`, `cancelled_by` (`coach`, `client`, `system` für den Verfall) und einen optionalen Grund.
- **Zugang und Call:** `client_access_token` (§7), `client_token_used_at` (erster Warteraum-Eintritt), `admitted_at`, `call_ended_at`, `coach_left_at` (§8). Der Warteraum ist kein eigener LiveKit-Raum, sondern ergibt sich aus diesen Zeitstempeln; sie liegen in der Datenbank, damit ein Neuladen den eingelassenen Klienten nicht zurückwirft.
- **Erinnerungen:** `reminder_24h_sent_at` und `reminder_1h_sent_at` halten den Versand fest und sperren zugleich gegen doppelten (§12).

**Notizen und Chat** liegen in eigenen Tabellen statt in Spalten an `bookings`, damit der sensibelste Inhalt in keiner Buchungsabfrage mitläuft. `session_notes` hat eine Zeile je Termin mit Tiptap-JSON; die Felder für das Transkript kommen mit Phase 6.

**Angebote und Verfügbarkeit.** Verfügbarkeit gilt je Organisation für alle Angebote (`availability_slots`, `availability_settings`). Die fachliche Beschreibung samt späterer Ausbaustufen steht in `funktionen/angebote-verfuegbarkeiten.md`.

### 11.1 Validierungs- und DTO-Konvention

Alle Request- und Response-Schemas werden mit **Zod** in `@hxroom/shared` definiert (`packages/shared/src/index.ts` und Themen-Dateien wie `legal.ts`, `feedback.ts`, `account.ts`). TypeScript-Typen entstehen nur über `z.infer<>`. Die Frontends nutzen dieselben Schemas für ihre Formulare, die API prüft im Controller mit `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`). Rein API-interne Schemas, etwa für Webhooks, bleiben im jeweiligen Modul.

`@hxroom/shared` wird gebaut, als ESM für die Frontends und als CommonJS für die API. `pnpm dev` baut beide Teile im Watch-Modus mit.

---

## 12. E-Mail, zeitgesteuerte Läufe & Stripe-Billing

### E-Mail

Versand über **Brevo**, transaktional und Newsletter, mit getrennten Absendern (`noreply@hxroom.de`, `newsletter@hxroom.de`); Einrichtung in `newsletter-brevo.md`. Alle Mails sind React-Email-Vorlagen in `apps/api/src/mail/templates/` (`coach/`, `client/`), mit gemeinsamem Gerüst (`layout.tsx`) und Bausteinen (`_components/`). Der Termin-Block trägt denselben farbigen Balken wie die Agenda (`offerColor()` in `@hxroom/shared`). Termine gehen als Kalenderdatei mit (`mail/ics.ts`). Unter jeder Mail an Klienten stehen Impressum und Datenschutz des Coachs (§6).

### Zeitgesteuerte Läufe

Alle über `@nestjs/schedule` in der API, mit dem Zustand in der Datenbank statt in Timern, damit sie einen Neustart überstehen. Sie setzen eine einzelne API-Instanz voraus.

| Lauf | Takt | Aufgabe |
|---|---|---|
| `BookingExpiryService` | 5 min | sagt unbestätigte Buchungen nach Ablauf der TTL ab (`cancelled_by = 'system'`), der Platz wird frei |
| `BookingReminderService` | 5 min | Erinnerungsmails (unten) |
| `CallPresenceService` | 30 s | beendet Sitzungen, deren Coach gegangen ist (§8) |
| `TestSessionCleanupService` | täglich 04:00 | löscht Probe-Sitzungen (§5) |
| `DeletionCronService` | täglich 02:00 / 03:00 | Erinnerung vor und Ausführung von Kontolöschungen (§17) |

BullMQ mit Redis kommt erst, wenn die Transkription eine echte Job-Queue braucht (§9).

### Erinnerungsmails

Der Klient bekommt 24 Stunden und 1 Stunde vor dem Termin eine Erinnerung mit dem Link in den Warteraum (`BookingReminderService`, Vorlage `mail/templates/client/booking-reminder.tsx`). Die 1-h-Erinnerung fällt mit der Öffnung des Warteraums zusammen (`CALL_OPENS_MINUTES_BEFORE_START`). An den Coach geht keine Erinnerung, die Texte sind fest.

- **Wer:** nur bestätigte Termine, keine Spontan-Termine (deren Einladung geht sofort raus) und keine Probe-Sitzungen. Manuell angelegte Termine bekommen Erinnerungen wie Buchungen; als bestätigt gilt der Zeitpunkt des Anlegens.
- **Kurzfristig gebucht:** Eine Erinnerung entfällt, wenn die Buchung erst nach ihrem Fälligkeitszeitpunkt bestätigt wurde. Die Bestätigung trägt den Link dann schon.
- **Nachholen:** Nach einem Ausfall der API wird nur nachgeholt, was noch hilft, die 24-h-Erinnerung bis 2 Stunden vor Beginn, die 1-h-Erinnerung bis 5 Minuten vor Beginn. „Heute“ oder „morgen“ im Text richtet sich nach dem Kalendertag in Europe/Berlin.
- **Ablauf:** ein Lauf alle 5 Minuten über `@nestjs/schedule`. Er beansprucht die fälligen Erinnerungen in einem `UPDATE … RETURNING` (Spalten `reminder_24h_sent_at`, `reminder_1h_sent_at`) und verschickt erst dann. Scheitert der Versand, gibt er den Vermerk frei, und der nächste Lauf versucht es erneut. Die Regel steht lesbar und getestet in `bookings/booking-reminders.ts`.
- **Lokal testen:** Der Mailversand geht auch lokal an Brevo. Brevo lässt API-Aufrufe nur von freigegebenen IP-Adressen zu (Einstellungen → Sicherheit → Autorisierte IPs), die Adresse des eigenen Rechners muss dort eingetragen sein.

### Manuell angelegte Termine

Fachlich beschrieben in `konzept-manuelle-termine.md`. Der Coach legt einen oder bis zu 25 Termine zu gewählten Zeitpunkten an (`POST /api/v1/bookings/manual`, `CoachBookingsService.createManual`).

- **Status und Herkunft:** sofort `confirmed`, `confirmedAt` = Zeitpunkt des Anlegens, Herkunft `manual`. Ohne Angebot gibt der Coach die Dauer an, die Bezeichnung ist dann „Sitzung“ (`MANUAL_OFFER_NAME`).
- **Wer:** bestehender Klient oder E-Mail-Adresse, dieselbe Regel wie beim Spontan-Termin (`resolveInvitee` im Dienst, `useBookingInvitee` und `BookingInviteeFields` in der Coach-App).
- **Serie:** Mehrere Startzeiten bekommen eine gemeinsame `bookings.series_id`. Jeder Termin hat eigenen Token, eigene Erinnerungen und eigene Absage. `withSeries()` (`bookings/booking-series.ts`) liefert in allen Coach-Antworten `series: { position, count }`, gezählt über die nicht abgesagten Termine der Serie. Angelegt wird alles oder nichts; eine Startzeit, an der schon ein Termin beginnt, ergibt `409`, Vergangenheit und doppelte Zeiten `400`.
- **Hinweise vorab:** `POST /api/v1/bookings/manual/check` liefert je Startzeit Überschneidungen mit anderen Terminen samt Puffer und ob sie außerhalb der Verfügbarkeit liegt (`isWithinAvailability` in `availability/slot-calculation.ts`). Beides hindert nicht am Anlegen.
- **Mail:** eine Mail pro Vorgang (`mail/templates/client/appointment-scheduled.tsx`), bei mehreren Terminen mit Links „Zum Warteraum“ und „Absagen“ je Termin. Im Anhang eine Kalenderdatei mit einem `VEVENT` je Termin (`buildBookingsIcs`).
- **Coach-App:** `ManualBookingModal` auf der Klientenseite („Termin anlegen“) und unter Termine (Knopf im Kopf, Klick auf eine freie Stelle der Wochenansicht); `FollowUpBookingModal` als Folgetermin im ⋯-Menü der Terminseite und auf der Abschlusskarte, vorbelegt mit Klient, Angebot und derselben Uhrzeit eine Woche später.

### Stripe – Abo der Coachs (Phase 7)

Die Pläne stehen in `pricing.md` (Trial, Basic, Pro, Studio; monatlich oder jährlich). Der Trial braucht kein Stripe. Zahlungen von Klienten an ihre Coachs, ebenfalls über Stripe, beschreibt `pricing.md`.

**Abschluss:**
1. Der Coach wählt einen Plan und bestätigt vor dem Weiterleiten per Pflicht-Checkbox: „Ich schließe das Abo für meine selbständige berufliche Tätigkeit ab.“ (Unternehmer nach § 14 BGB; bei der Registrierung gibt es dafür nur einen Hinweis, §7.)
2. `POST /api/v1/billing/checkout` prüft und speichert die Bestätigung mit Zeitpunkt und erstellt eine Stripe-Checkout-Session; Rechnungsadresse und USt-IdNr. erfasst Stripe.
3. Bezahlt wird im von Stripe gehosteten Checkout, ohne eigenes Zahlungsformular.

**Laufendes Abo:** Webhooks (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`), geprüft mit `stripe.webhooks.constructEvent`, setzen Plan und Ablaufdatum. Nach einer fehlgeschlagenen Zahlung gibt es eine Erinnerung und 7 Tage Kulanz, danach eingeschränkten Zugang. Abo, Zahlungsmethode und Rechnungen verwaltet der Coach im Billing Portal von Stripe, ohne eigene Oberfläche.

**Daten:** eine eigene Tabelle `organization_billing` (Stripe-Kunde, Abo, Plan, Ablauf, Trial-Ende), weil better-auth die Tabelle `organization` verwaltet.

---

## 13. Backup-Konzept

*Stand: aktiv in Produktion (`infra/backup/`). Die nächtlichen Läufe, Object Lock und eine Wiederherstellung auf einer fremden Maschine sind abgenommen.*

**Aufbau.** Ein eigener Container `backup` im Compose-Stack (`infra/backup/`, gebaut auf dem Server wie Caddy), mit `pg_dump` 17, `rclone`, `age` und `supercronic`. Ziel ist ein Backup-Bucket in einem **eigenen Hetzner-Projekt in Nürnberg** (`nbg1`): anderer Standort als der Datei-Bucket in Falkenstein, aber in Deutschland. Die Zugänge stehen in `infra/.env` (`BACKUP_S3_*`). Das Server-Backup von Hetzner läuft zusätzlich, ersetzt den `pg_dump` aber nicht: gleiches Projekt, gleicher Standort, und eine Momentaufnahme des laufenden Servers ist für die Datenbank nicht garantiert konsistent.

**Datenbank (03:00, `backup-db.sh`).**
- `pg_dump` im Custom-Format (komprimiert), mit `age` verschlüsselt, als Strom in den Bucket: `db/daily/hxroom_<JJJJ-MM-TT>_<hhmmss>.dump.age`
- sonntags eine Kopie nach `db/weekly/`, am Monatsersten nach `db/monthly/`
- Aufbewahrung 7 Tage, 4 Wochen, 3 Monate. Maßgeblich ist das Datum im Objektnamen.
- Ein Dump unter 4 KB gilt als Fehler, ein abgebrochener Upload wird wieder gelöscht. Im Bucket liegt also nie ein halbes Objekt, das wie ein gültiges Backup aussieht.

**Dateien (03:30, `sync-files.sh`).**
- `rclone sync` des Datei-Buckets nach `files/current/`
- Was im Original gelöscht wurde, wandert nach `files/deleted/<JJJJ-MM-TT>/` und wird nach 30 Tagen entfernt. Ein versehentliches Löschen lässt sich so rückgängig machen, gewollt Gelöschtes ist nach 30 Tagen auch aus der Kopie weg.
- Entwicklung (RustFS): Testdaten, kein Backup. Zum Testen der Skripte gibt es den Dienst hinter dem Profil `backup` in `infra/docker-compose.dev.yml`.

**Object Lock.** Der Backup-Bucket ist mit Object Lock angelegt, Standard-Sperrfrist 30 Tage im Modus **Compliance**, dazu eine Lifecycle-Regel, die alte Versionen nach 30 Tagen entfernt. Der Produktivserver braucht Schreibzugriff auf den Bucket. Ein Angreifer mit diesem Zugang könnte ohne Sperre alle Backups löschen. Mit Sperre ist jede geschriebene Version 30 Tage unlöschbar, auch mit gültigem Schlüssel. Governance genügt dafür nicht: Es lässt sich mit dem Schlüssel umgehen, und Hetzner-Schlüssel gelten für das ganze Projekt.
- Die Skripte bleiben davon unberührt. Ein Löschen beim Aufräumen setzt nur eine Löschmarke, die Version selbst verschwindet erst nach Ablauf der Sperre durch die Lifecycle-Regel.
- Die Sperrfrist lässt sich im Modus Compliance weder verkürzen noch aufheben. Neue Einstellungen erst an einem Testbucket mit `1d` ausprobieren.

**Verschlüsselung.** Auf dem Server liegen nur öffentliche `age`-Schlüssel (`BACKUP_AGE_RECIPIENTS`, mehrere möglich, jeder entschlüsselt allein). Der geheime Schlüssel liegt im Passwortmanager und wird nur zum Wiederherstellen bereitgestellt. Die Dateien in `files/` sind nicht zusätzlich verschlüsselt, sie liegen so wie im Original-Bucket.

**Meldungen.** Nach jedem erfolgreichen Lauf geht ein Ping an den Checkly-Heartbeat des Jobs (`CHECKLY_HEARTBEAT_DB`, `CHECKLY_HEARTBEAT_FILES`). Bleibt er aus, alarmiert Checkly nach Ablauf der Karenzzeit. Eingestellt sind 1 Tag Periode und 2 Stunden Karenz: Checkly misst ab dem letzten Ping, die Läufe starten nach Ortszeit, und bei der Zeitumstellung liegen 25 Stunden zwischen zwei Läufen. Scheitert ein Lauf, schickt das Skript sofort eine Mail über Brevo an `BACKUP_ALERT_EMAIL`, mit dem gescheiterten Schritt und den letzten Zeilen der Fehlerausgabe. Die Logs enthalten keine Personendaten, nur Schritte, Objektnamen und Größen.

**Aufbewahrung und Löschung.** Gelöschte Daten bleiben bis zu etwa vier Monate in den Datenbank-Backups (3 Monate Aufbewahrung plus 30 Tage bis zum Entfernen der alten Version) und bis zu 60 Tage in der Kopie der Dateien (30 Tage Papierkorb plus 30 Tage). Das gehört in die Datenschutzerklärung bzw. in deren Vorlage für Coaches (`legal.md` §4.3).

**Bucket-Aufbau:**

```
hxroom-backup/
  db/daily/    hxroom_2026-10-02_030000.dump.age   (7 Tage)
  db/weekly/   …                                    (4 Wochen)
  db/monthly/  …                                    (3 Monate)
  files/current/<organizationId>/…                  Spiegel des Datei-Buckets
  files/deleted/2026-10-02/<organizationId>/…       an diesem Tag Gelöschtes (30 Tage)
```

**Von Hand auslösen** (auf dem Server in `infra/`):

```bash
docker compose run --rm backup backup-db.sh
docker compose run --rm backup sync-files.sh
```

### Wiederherstellen

`restore-db.sh <stand> <ziel-datenbank>` lädt einen Stand (`latest` oder z. B. `daily/hxroom_2026-10-02_030000.dump.age`), entschlüsselt ihn und spielt ihn ein. Die Zieldatenbank wird angelegt. Existiert sie schon, muss sie leer sein, sonst bricht das Skript ab. Am Ende gibt es die Zeilenzahl je Tabelle aus. Den geheimen Schlüssel erwartet es als Datei unter `BACKUP_AGE_IDENTITY`.

**Wiederherstellungstest auf der Betriebs-Instanz** (mit dem Repo-Stand dort, Schlüssel nur für die Dauer des Tests):

```bash
docker build -t hxroom-backup infra/backup
docker network create restore-test
docker run -d --name restore-pg --network restore-test \
  -e POSTGRES_USER=hxroom -e POSTGRES_PASSWORD=test postgres:17-alpine
until docker exec restore-pg pg_isready -U hxroom; do sleep 1; done

docker run --rm --network restore-test \
  -e POSTGRES_HOST=restore-pg -e POSTGRES_USER=hxroom -e POSTGRES_PASSWORD=test \
  -e BACKUP_S3_ENDPOINT=https://nbg1.your-objectstorage.com -e BACKUP_S3_REGION=nbg1 \
  -e BACKUP_S3_ACCESS_KEY=… -e BACKUP_S3_SECRET_KEY=… -e BACKUP_S3_BUCKET=hxroom-backup \
  -e BACKUP_AGE_IDENTITY=/keys/backup.key -v /root/restore-key:/keys:ro \
  hxroom-backup restore-db.sh latest hxroom_restore

# Aufräumen: Datenbank und Schlüssel weg
docker rm -f restore-pg && docker network rm restore-test && shred -u /root/restore-key/backup.key
```

Die ausgegebenen Zeilenzahlen werden mit der Produktion verglichen (`select count(*)` je Tabelle). Kleine Abweichungen bei Tabellen, die sich seit dem Dump geändert haben (Sitzungen, Termine), sind normal.

**Ernstfall Produktion:**
1. Auf dem Server `api` und `backup` stoppen.
2. Die Datenbank leeren: `docker compose exec postgres dropdb -U hxroom hxroom`, dann `createdb -U hxroom hxroom`. Auf einem neu aufgesetzten Server legt Postgres sie bereits leer an.
3. Den geheimen Schlüssel als Datei bereitstellen (z. B. `/root/restore-key/backup.key`) und einspielen. Der Dienst `backup` kennt Bucket und Datenbank schon:
   `docker compose run --rm -e BACKUP_AGE_IDENTITY=/keys/backup.key -v /root/restore-key:/keys:ro backup restore-db.sh latest hxroom`
4. `api` starten. Die Migrationen laufen beim Start.
5. Schlüsseldatei löschen.

**Dateien zurückholen** (auf dem Server in `infra/`). Alles aus der Kopie in den Datei-Bucket:

```bash
docker compose run --rm backup bash -c \
  'source /usr/local/bin/lib.sh; setup_rclone; rclone copy "$DST/files/current" "$SRC"'
```

Eine einzelne gelöschte Datei: `rclone copyto "$DST/files/deleted/<datum>/<pfad>" "$SRC/<pfad>"` auf dieselbe Weise.

**Docker Volumes**
- Whisper-Modelle sind reproduzierbar (Download beim ersten Start), kein Backup nötig.
- Das Volume `postgres_data` ist durch den `pg_dump` abgedeckt.
- Redis (geplant für die Job-Queue) hält nur Jobs und kurzlebige Daten, kein Backup nötig.

---

## 14. Umsetzungsstand

Welche Phase was bringt und wie weit sie ist, steht in `zeitplan.md`; die Nummern der Phasen dort gelten auch in diesem Dokument. Phasen 1 bis 5 sind abgeschlossen, als Nächstes kommt Phase 6 mit Transkription und Ende-zu-Ende-Verschlüsselung.

---

## 15. Entwicklungsumgebung

```bash
# Starten der lokalen Umgebung
docker compose -f infra/docker-compose.dev.yml up -d
# Startet: Caddy, PostgreSQL, RustFS (S3) und LiveKit

pnpm dev                    # API, Frontends und @hxroom/shared im Watch-Modus
pnpm db:seed                # Testdaten: Coachs anna@ und martina@hxroom.test, Passwort hxroom1234
```

Aufgerufen wird über die Caddy-Subdomains, nicht über `localhost`-Ports: `app.hxroom.localhost` (Coach-App), `admin.hxroom.localhost`, `hxroom.localhost` (Landingpage), `anna.hxroom.localhost` (Buchungsseite eines Coachs). Die Buchungsseite liest den Slug aus dem Hostnamen, und die API vertraut nur diesen Origins.

**Screenshots der Landingpage:** `pnpm --filter api db:seed:demo` legt Demodaten an, `apps/landing/scripts/screenshots.mjs` nimmt damit die Bilder unter `apps/landing/public/screens/` auf (Voraussetzungen im Kopf der Datei).

**LiveKit ohne HxRoom prüfen:** Der Medienserver lässt sich mit dem LiveKit-CLI (`lk`,
Homebrew) isoliert testen, und zwar in drei Stufen, weil jede eine andere Fehlerquelle
ausschließt: `curl http://localhost:7880/` → `OK` zeigt, dass Prozess und Konfiguration
stehen; `lk room list` zeigt, dass die Schlüssel greifen; und zwei parallele
`lk room join --room session_test --identity a --publish-demo` zeigen, dass Medien
fließen. Erst die dritte Stufe prüft die ICE-Kandidaten – den Teil, der lokal
erfahrungsgemäß bricht. Beleg im Serverlog ist `"connectionType": "udp"` samt gewähltem
Kandidatenpaar. Das CLI gehört dabei auf den **Host**, nicht in einen Container: nur so
nimmt der Test denselben Weg wie später der Browser und ein falsches `node_ip` fällt auf.

**Kamera-Tests brauchen HTTPS:** `getUserMedia()` funktioniert nur in einem sicheren Kontext. Die Dev-Umgebung liefert derzeit über `http://[slug].hxroom.localhost` aus (`auto_https off` in `Caddyfile.dev`). Chrome und Firefox behandeln `*.localhost` als vertrauenswürdig, **Safari nicht** – für die Call-Entwicklung dort also lokales TLS über Caddys interne CA aktivieren. Dabei muss `livekit.hxroom.localhost` mitziehen: Eine per `https://` ausgelieferte Seite darf keine `ws://`-Verbindung öffnen, der Browser blockt sie als Mixed Content kommentarlos.

---

## 16. Offene Punkte

| # | Thema | Beschreibung | Priorität |
|---|---|---|---|
| 01 | **Subdomain-Modell Studio** | Beim Studio-Plan: teilen alle Coaches dieselbe Subdomain (`studio.hxroom.de`) oder bekommt jeder Coach eine eigene? Auswirkung auf Buchungsseite, Warteraum-Branding und Routing. | Vor Studio-Launch klären |
| 02 | **Verschlüsselung der Sitzungsnotizen** | `session_notes.content` liegt als JSONB im Klartext, geschützt wie die übrigen Fachdaten (Server, Netz, Backups). Coaching-Notizen können Gesundheitsdaten nach Art. 9 DSGVO enthalten; eine zusätzliche Verschlüsselung auf Anwendungsebene (z. B. AES-256-GCM, Schlüssel außerhalb der DB) wurde bei der Umsetzung bewusst zurückgestellt. Nachrüsten heißt: Spalte umschreiben, Schlüsselverwaltung und Backup-Wiederherstellung mitdenken, Suche im Inhalt entfällt. | Nice-to-have |
| 06 | **Lautsprecherwahl im Call** | Die Call-Oberfläche bietet keine Wahl des Ausgabegeräts an. Der Ton läuft über eigene `<audio>`-Elemente (`CallAudioOutput`), auf die `switchActiveDevice('audiooutput')` nicht wirkt; nachrüsten hieße `setSinkId()` an diesen Elementen, wo der Browser es unterstützt. | Nice-to-have |
| 07 | **Ungeprüft angenommene Dateien nachprüfen** | Ist ClamAV beim Teilen nicht erreichbar, wird die Datei angenommen und als ungeprüft vermerkt (§17). Ein Nachlauf, der Dateien mit `session_chat_files.virus_scanned_at IS NULL` später prüft, fehlt – relevant erst, falls ClamAV im Betrieb einmal länger ausfällt. | Nice-to-have |
| 08 | **Ende-zu-Ende-Verschlüsselung im Call** | Heute ist der Call nur auf dem Transportweg verschlüsselt (DTLS-SRTP, HTTPS/WSS). Der LiveKit-Server entschlüsselt die Medien zum Weiterleiten. `livekit-client` kann Ende-zu-Ende verschlüsseln (`e2ee`-Option, eigener Worker `livekit-client.e2ee.worker`). Offen vor dem Bau: **(1) Schlüsselverteilung.** Gibt die API den Raumschlüssel an beide Seiten aus, ist der Medienserver ausgeschlossen, der Betreiber aber nicht, denn die API kennt den Schlüssel. Das ist ehrlich nur als „der Medienserver kann nicht mithören“ zu beschreiben. Echte Ende-zu-Ende-Verschlüsselung braucht einen Schlüssel, den nur die Browser kennen. Das URL-Fragment des Klientenlinks scheidet aus, weil der Link per Mail über Brevo geht. Möglich wäre ein Schlüsselaustausch zwischen den Browsern mit Sicherheitscode zum Vergleichen. **(2) Aufnahme in Phase 6.** LiveKit Egress kann verschlüsselte Räume nicht aufnehmen. Entweder bleibt die Verschlüsselung bei erteilter Einwilligung aus, oder die Aufnahme entsteht im Browser des Coachs. **(3) Browser ohne Unterstützung** (Insertable Streams bzw. `RTCRtpScriptTransform`): Beitritt verweigern oder unverschlüsselt mit Hinweis? Der Datenschutz-Kasten im Warteraum muss das korrekt wiedergeben. **(4) Worker** von der eigenen Origin ausliefern, wie beim Weichzeichner. **(5) Prüfen:** Zusammenspiel mit Weichzeichner, Bildschirmfreigabe und Reconnect sowie die CPU-Last bei der 1440p-Freigabe auf älteren Geräten. Chat und Dateien betrifft das nicht, sie laufen über die API (dazu Punkt 02). | Phase 6, Punkte 1–3 vor dem Bau entscheiden |

---

## 17. Sicherheit & DSGVO

- **Server ausschließlich Hetzner Deutschland** (Nürnberg / Falkenstein)
- **LiveKit self-hosted** auf demselben Hetzner-Projekt → Mediendaten verlassen nie Deutschland
- **Whisper self-hosted** → Audiodaten und Transkripte bleiben auf Hetzner
- **Object Storage** → alle Dateien (Logos, Recordings, Exports) in Deutschland, S3-kompatibel: **Hetzner Object Storage** (Falkenstein) in Produktion, **RustFS** self-hosted in der Entwicklung. Gleiches Key-Schema in beiden Umgebungen, Bucket in beiden privat.
- **Brevo (französisch, EU-Server)** → E-Mail-Versand (transaktional + Newsletter) vollständig in der EU, AVV abgeschlossen
- **Ionos Mail Business (Deutschland)** → E-Mail-Empfang / Postfächer für `kontakt@hxroom.de` etc., vollständig EU
- **Stripe** mit EU-Entities und SCCs → DSGVO-konform für Zahlungsdaten
- better-auth HttpOnly Cookies, kein Token in LocalStorage
- Klienten-Buchungstoken: 256 Bit Zufall, Konstantzeit-Vergleich, gültig nur im Zugangsfenster der Sitzung
- Kein Logging von E-Mail-Adressen oder Namen in Application Logs (nur IDs)
- **Zugriffslogs ohne Query-String.** Die Zugangslinks tragen ihr Geheimnis in der URL (`/call/:id?token=…`, `/confirm`, `/cancel`, `/auth/reset-password`). Die nginx-Container von `bookingpage` und `coach` loggen deshalb mit einem eigenen Format, das statt `$request` nur den Pfad schreibt und den Referer weglässt; Caddy führt gar kein Zugriffslog, die API kein Request-Logging. Alle Container schreiben ins Systemjournal des Servers (`logging: journald`), das nach 14 Tagen löscht (`infra/journald/hxroom.conf`) – so stimmt die Speicherdauer der Server-Logs in der Datenschutzerklärung.
- **Keine Drittanbieter-Requests von der Klientenseite.** Symbole werden zur Build-Zeit ins Bundle gelegt (`hxroomUI()` in `packages/ui/vite.ts`), statt sie zur Laufzeit von `api.iconify.design` zu holen – sonst ginge die IP jedes Klienten an einen Dritten. Ebenso kommen WASM und Segmentierungsmodell des Weichzeichners von der eigenen Origin (`/_hxroom/mediapipe/<version>/`, ausgeliefert über `mediapipeAssets()` in `packages/livekit/vite.ts`) statt von jsDelivr und storage.googleapis.com, wohin `@livekit/track-processors` sie sonst lädt.
- **Virenscan geteilter Dateien.** Jede im Call geteilte Datei geht vor dem Ablegen durch ClamAV (eigener Container, nur im Docker-Netz erreichbar); eine erkannte Datei wird mit `422` abgelehnt und landet nie im Speicher. Ist ClamAV nicht erreichbar, wird die Datei angenommen, als ungeprüft vermerkt (`virus_scanned_at` null) und das geloggt – bewusst, damit das Teilen im Gespräch nicht an einem Neustart des Scanners scheitert. Geloggt werden Buchungs-ID und Signaturname, nie der Dateiname. Die Signatur-Updates holt freshclam von `database.clamav.net`; dabei gehen keine Daten von HxRoom hinaus.
- **Fehlerüberwachung (GlitchTip).** Unerwartete Fehler aus API, Coach-App und Klientenseite gehen an eine selbst betriebene GlitchTip-Instanz (`errors.hxcode.io`, Betriebs-Instanz bei Hetzner, Konfiguration in `infra-status/`). Es gibt keinen weiteren Auftragsverarbeiter, die Ereignisse werden 90 Tage aufbewahrt.
  - **Gemeldet:** nur Fehler. Keine Performance-Daten, keine Sitzungsaufzeichnung, keine Konsolenausgaben, keine Sitzungs-Pings. Die API meldet keine bewusst beantworteten 4xx.
  - **Inhalt:** Stacktrace, Methode, URL und User-Agent. Benutzer, Cookies, übrige Header, Bodys, Datenbankwerte und lokale Variablen sind über `dataCollection` abgeschaltet. Tokens und Signaturen signierter Links werden in allen Texten durch `[Filtered]` ersetzt (`packages/shared/src/monitoring.ts`).
  - **Weg der Browser-Meldungen:** Sie laufen über den Tunnel der API (`POST /api/v1/monitoring`). Die Klientenseite spricht damit weiterhin nur mit `api.hxroom.de`. Der Tunnel lässt nur die beiden HxRoom-Frontend-Projekte durch (`SENTRY_TUNNEL_DSNS`), filtert ein zweites Mal und begrenzt auf 60 Meldungen pro Minute und Absender. Den Absender bestimmt die von Caddy gesetzte Adresse, ein Browser kann sie nicht fälschen.
  - **Source Maps** lädt der Docker-Build hoch und löscht sie danach. Ausgeliefert wird keine.
  - **Prüfen im Betrieb:** `POST /api/v1/monitoring/test-error` (nur Betreiber) und `?monitoring-test=1` an einer Seite der Coach-App oder der Klientenseite.
- AVV automatisch bei Registrierung abgeschlossen
- DSGVO-Löschfunktion: Cascade-Delete **Organization** → alle verknüpften Daten via Drizzle `onDelete: 'cascade'`. Der Einstiegspunkt ist bewusst die Organisation, nicht der User: sämtliche Fachdaten (`clients`, `offers`, `bookings`, `booking_page`, `availability_*`) hängen an `organizationId`, und `organization` hat keinen Fremdschlüssel auf `user`. Ein Löschen des User-Datensatzes allein (z. B. via `admin.removeUser`) entfernt nur `member`/`session`/`account` und hinterlässt die Organisation samt aller Klienten- und Buchungsdaten verwaist.
- **Datenexport** (Art. 20 DSGVO, `GET /api/v1/account/export`, Einstellungen → Account): eine ZIP-Datei mit `klienten.csv`, `termine.csv` (UTF-8 mit BOM, Semikolon, Schutz vor Formeln in Excel), Notizen und Chat-Verläufen je Termin als Markdown und allem zusammen in `daten.json`, dazu Angebote, Verfügbarkeiten und die Texte der Buchungsseite. Ohne Probe-Sitzungen, Zugangstoken und die Dateien aus dem Chat. Gebaut im Request mit `fflate`, ohne Ablage im Speicher; höchstens ein Export alle 30 Sekunden pro Organisation. Das Log nennt nur Organisations-ID, Zahl der Termine und Größe.
- **Feedback der Coachs** (`feedback`): Text, Pfad der Seite ohne Query-String und User-Agent. Hängt mit Cascade an Organisation und User und verschwindet mit dem Konto. Bei einem Fehler beim Mailversand loggt die API nur die Feedback-ID.
- **Probe-Sitzungen** (§5): ohne Klient und ohne Mail, 24 Stunden nach dem Ende samt Notizen, Chat und Dateien gelöscht.
- **Klienten löschen** (Art. 17 DSGVO, `DELETE /api/v1/clients/:id`): Der Coach löscht einen Klienten samt Terminen, Notizen, Chat und geteilten Dateien. Termine hängen nur lose am Klienten (`client_id` mit `set null`), und unbestätigte Anfragen haben noch keine `client_id` – deshalb zählen auch Termine derselben Organisation mit derselben E-Mail-Adresse dazu. Die Objekte im Speicher (`{org}/sessions/{booking}/`) fallen nach dem Commit. Anstehende Termine sperren die Löschung mit `409`. Protokoll in `client_deletions`, nur IDs und Anzahlen, ohne Fremdschlüssel.
- Audioaufnahme / Transkription: aktive Klienten-Einwilligung pro Sitzung, dokumentiert mit Timestamp, IP und Version
- Audio-Recordings werden nach erfolgreicher Transkription automatisch aus S3 gelöscht
- PDF-Rechnungen und Datenexporte nur via signierte URLs mit kurzer TTL abrufbar
