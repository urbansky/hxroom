# HxRoom – Technisches Konzept
*Version 0.5 · MVP-Scope*

---

## 1. Überblick & Zielsetzung

HxRoom ist eine White-Label Videocall-Plattform für Coaches im DACH-Markt. Das technische Ziel ist ein schlankes, iterativ wachsendes System, das vom ersten Tag an DSGVO-konform, stabil und alleine wartbar ist. Der Einsatz von **Claude Code** ist expliziter Bestandteil des Entwicklungsprozesses – nicht als Gimmick, sondern als produktiver Pair-Programmer für Scaffolding, Codegenerierung, Migrations-Skripte und Dokumentation.

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
| **Whisper (faster-whisper)** | Speech-to-Text – self-hosted, kein externer API-Aufruf |
| **Brevo** | Transaktionale E-Mails **und** Newsletter/Marketing – ein Anbieter für den gesamten Versand (französisch, Server in der EU) |
| **BullMQ + Redis** | Job-Queue für Erinnerungen, Transkription & Async-Tasks |
| **Object Storage** | S3-kompatibler Datei-Speicher – Uploads, Recordings, Logos. Phasenweise: **RustFS** self-hosted (Entwicklung & Pre-Launch) → **Hetzner Object Storage** (EU-Frankfurt, ab Produktiv-Launch). |
| **Stripe** | Zahlungsabwicklung & Subscription-Management (Billing Portal, Webhooks) – EU-Entities, SCCs |

### Frontend
| Technologie | Rolle |
|---|---|
| **Nuxt 3** | Vue 3 Meta-Framework (SSR/SSG, file-based Routing, Auto-Imports) |
| **Nuxt UI** | Komponenten-Bibliothek (Reka UI + Tailwind) |
| **Pinia** | State Management |
| **LiveKit JS SDK** | WebRTC-Client-Integration |
| **VueUse** | Utility Composables |

### Infrastruktur
| Komponente | Wahl |
|---|---|
| **Hosting** | Hetzner Cloud, Standort Deutschland (Nürnberg / Falkenstein) |
| **LiveKit Server** | Self-hosted Docker-Container auf Hetzner |
| **Whisper Service** | Self-hosted Docker-Container auf Hetzner |
| **Reverse Proxy** | Caddy (automatisches HTTPS, Wildcard-Zertifikate für `*.hxroom.de`) |
| **Object Storage** | **RustFS** self-hosted als Docker-Container (Entwicklung & Pre-Launch) → Wechsel auf **Hetzner Object Storage** (S3-kompatibel, EU-Frankfurt) zum Produktiv-Launch |
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
| Datei-Speicher | RustFS (Dev/Pre-Launch) → Hetzner Object Storage (ab Launch) | Hetzner DE (Frankfurt), RustFS zunächst self-hosted | S3-kompatibel, vollständig EU in beiden Phasen |
| Web-Analytics | Plausible Cloud | EU (Estland/Deutschland) | Cookie-frei, kein Consent-Banner; AVV via Plausible-Dashboard |

---

## 3. Projektstruktur & Repositories

```
hxroom/
├── apps/
│   ├── api/          # NestJS Backend (api.hxroom.de)
│   ├── coach/        # Coach-Backoffice (app.hxroom.de)
│   ├── bookingpage/  # Klienten-Subdomain: Buchung & Bestätigung ([slug].hxroom.de)
│   ├── videocall/    # Warteraum + Call (Klient & Coach), pfadbasiert: */call
│   ├── admin/        # Betreiber-Backoffice (admin.hxroom.de)
│   └── landing/      # Landingpage (hxroom.de)
├── packages/
│   ├── shared/       # Gemeinsame Types & Zod-Schemas
│   └── ui/           # Shared Theme, Nuxt UI Config & Vue-Komponenten
├── infra/
│   ├── docker-compose.yml          # Produktion
│   ├── docker-compose.dev.yml      # Lokale Entwicklung
│   ├── livekit/                    # LiveKit Config: livekit.yaml + egress.yaml
│   ├── whisper/                    # Whisper Service Dockerfile
│   └── caddy/                      # Caddyfile
└── CLAUDE.md         # Claude Code Instruktionsdatei
```

Ein **Monorepo** (pnpm Workspaces) hält den Overhead gering und erlaubt geteilte Typen zwischen Backend und Frontend – besonders wertvoll beim Einsatz von Claude Code, da der gesamte Kontext in einer Session verfügbar ist. Fünf Nuxt-Apps sind bewusst getrennt, um die Subdomain-Architektur sauber abzubilden. Eine Ausnahme ist `videocall`: statt einer eigenen Subdomain wird die App pfadbasiert unter zwei bestehenden Domains gemountet (`[slug].hxroom.de/call/*` für Klienten, `app.hxroom.de/call/*` für Coaches) – siehe §6 und §8. `@hxroom/ui` teilt Theme und Nuxt-UI-Konfiguration zwischen allen Frontends.

---

## 4. Docker Compose Architektur

Es gibt zwei Compose-Dateien in `infra/`:

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Produktion – alle Services als Container (Apps, Infrastruktur) |
| `docker-compose.dev.yml` | Lokale Entwicklung – nur Infrastruktur-Services |

### Lokale Entwicklung (`docker-compose.dev.yml`)

Die Apps (api, coach, bookingpage, videocall, admin, landing) laufen lokal per `pnpm dev`. Docker übernimmt nur die Infrastruktur:

- **PostgreSQL** (Port 5433 auf dem Host, 5432 im Container)
- **RustFS** als S3-kompatibler Object Store (siehe `docker-compose-test-rustfs.yml`), Console auf Port 9001, S3-API auf Port 9000
- **Caddy** als Reverse Proxy: routet `*.hxroom.localhost` auf die lokalen pnpm-Dev-Server

Weitere Services (Redis, LiveKit, Whisper) werden ergänzt, wenn sie lokal benötigt werden.

### Produktion (`docker-compose.yml`)

Alle Services laufen als Container auf dem Hetzner-Host:

```yaml
services:
  api, coach, bookingpage, videocall, admin, landing   # gebuildete App-Images
  postgres:   image: postgres:17-alpine
  redis:      image: redis:7-alpine
  livekit:    image: livekit/livekit-server:latest
  livekit-egress: image: livekit/egress:latest   # Recordings → S3
  whisper:    build: ./infra/whisper             # faster-whisper HTTP-Wrapper
  caddy:      build: ./infra/caddy               # mit IONOS-DNS-Plugin für Wildcard-TLS
```

**Object Storage – phasenweiser Ansatz:** Bis zum Produktiv-Launch läuft **RustFS** self-hosted im Compose-Stack (Entwicklung und Pre-Launch-Server identisch konfiguriert). Zum Launch erfolgt der Wechsel auf **Hetzner Object Storage** (extern, S3-kompatibel) – da der S3-Client-Code identisch bleibt, ändern sich nur `S3_ENDPOINT`, `S3_REGION` und `S3_FORCE_PATH_STYLE` in der Umgebungskonfiguration; RustFS entfällt dann aus dem Compose-Stack.

**Upgrade-Pfad:** Einzelne Services (z.B. `postgres`, `redis`) können ohne Architekturänderung auf verwaltete Hetzner-Managed-Angebote ausgelagert werden.

---

## 5. Claude Code – Einsatzstrategie

Claude Code ist kein Ersatz für Architekturentscheidungen, aber ein erheblicher Geschwindigkeitsmultiplikator für gut definierte Aufgaben.

### 5.1 `CLAUDE.md` – Die zentrale Instruktionsdatei

Im Root des Repos liegt eine `CLAUDE.md`, die Claude Code den Projektkontext erklärt:

```markdown
# HxRoom – Claude Code Kontext

## Stack
- Backend: NestJS, PostgreSQL, Drizzle ORM, better-auth + organization plugin, LiveKit (self-hosted)
- Speech2Text: Whisper (self-hosted, HTTP-API via faster-whisper)
- Frontend: Nuxt 3, Nuxt UI, Pinia
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
```

### 5.2 Konkrete Einsatzfelder

**Scaffolding & Boilerplate**
Claude Code generiert neue NestJS-Module inkl. Controller, Service, DTO und Modul-Datei nach einem Prompt wie:
> „Erstelle ein NestJS-Modul `booking` mit CRUD-Endpunkten. DTOs sollen Zod-validiert sein. Verwende die Konventionen aus CLAUDE.md."

**Drizzle Schema & Migrationen**
Drizzle-Schema-Änderungen und SQL-Migrations-Dateien lassen sich direkt aus Anforderungsbeschreibungen generieren – Drizzles SQL-nahe Syntax ist im Trainingskorpus sehr gut vertreten.

**LiveKit-Integration**
Token-Generierung für Warteraum und aktiven Call, Room-Events und Webhook-Handler – klar abgrenzbarer Code, den Claude Code sauber erzeugt.

**Whisper-Integration**
HTTP-Client für den Whisper-Service, BullMQ-Job-Definition für Post-Session-Transkription und Persistierung des Transkripts in der DB.

**S3 / Object Storage**
Das `StorageModule` inkl. Upload-Logik, signierte URLs und Bucket-Operationen lässt sich vollständig von Claude Code generieren – AWS SDK v3 ist ein sehr gut abgedecktes Pattern.

**E-Mail-Templates**
Alle transaktionalen E-Mails werden als Vue/HTML-Templates erstellt und mit Claude Code aus Zod-Schemas typisiert.

**Tests**
Unit-Tests für Services und Composables lassen sich von Claude Code aus vorhandenem Code generieren.

**Refactoring & Code Review**
Claude Code erkennt Duplikate, vereinheitlicht DTOs auf Zod-Schemas und macht Fehlerbehandlung konsistent.

---

## 6. Domain-Architektur

```
hxroom.de              → Nuxt-App `landing` (öffentlich)
app.hxroom.de          → Nuxt-App `coach` (Coach-Backoffice, Login erforderlich)
app.hxroom.de/call/*   → Nuxt-App `videocall` (pfadbasiert, gleicher Host wie Coach-Backoffice)
[slug].hxroom.de       → Nuxt-App `bookingpage` (Klienten-Subdomain: Buchung & Bestätigung)
[slug].hxroom.de/call/* → Nuxt-App `videocall` (pfadbasiert, Warteraum + Call für Klienten)
api.hxroom.de          → NestJS API
livekit.hxroom.de      → LiveKit Server (intern, kein öffentliches UI)
admin.hxroom.de        → Nuxt-App `admin` (internes Betreiber-Backoffice, ab MVP)
```

**Subdomain-Routing im Frontend:** Jede Subdomain wird von ihrer eigenen Nuxt-App bedient (`apps/landing`, `apps/coach`, `apps/bookingpage`, `apps/admin`). Caddy routet anhand des Hostnames an den jeweiligen Container; innerhalb der App übernimmt Nuxts file-based Routing (`pages/`) die URL-Auflösung. Die `bookingpage`-App liest den Coach-Slug serverseitig aus dem Hostname (Nuxt Server Middleware), um Branding und Buchungs­kontext bereits beim ersten Render zu laden – wichtig für SEO und schnellen Erstaufbau der Buchungsseite.

**Pfadbasiertes Routing für `videocall`:** Die App bekommt bewusst keine eigene Subdomain, sondern wird unter dem Pfad `/call/*` in zwei bestehende Domains gemountet – kein zusätzliches DNS oder Zertifikat nötig, kein Domainwechsel für Klient oder Coach mitten im Session-Flow:

```
# infra/caddy/Caddyfile (Ausschnitt, vereinfacht)
*.hxroom.de {
  handle /call/* { reverse_proxy videocall:3000 }
  handle         { reverse_proxy bookingpage:3000 }  # oder coach:3000 bei app.hxroom.de, admin:3000 bei admin.hxroom.de
}
```

Da derselbe `videocall`-Container unter beiden Hosts erreichbar ist, unterscheidet eine Nuxt Server Middleware anhand des Host-Headers das Auth-Schema: `app.hxroom.de` → better-auth Session-Cookie (Coach), `[slug].hxroom.de` → signierter Klienten-Token aus dem Buchungslink. Details zur Aufteilung siehe §8.

**Wildcard-Zertifikat:** Caddy mit Ionos DNS-Provider (`caddy-dns/ionos`) für automatisches `*.hxroom.de` Let's-Encrypt-Zertifikat via DNS-01 Challenge.

### 6.1 Domain-Status & Brand-Reserve `hxroom.io`

- **`hxroom.de`** ist die **Primärdomain** für den DACH-Markt (Produktiv). Alle öffentlichen URLs, Marketing-Links und kundenseitigen Inhalte laufen ausschließlich über `.de`.
- **`hxroom.io`** ist registriert und für eine spätere **Internationalisierung** (englischer/internationaler Auftritt, Brand-Linie `hxcode.io` / `hxmeet.io`) reserviert. Bis dahin läuft `.io` **nicht eigenständig**, sondern wird per **permanenter 301-Weiterleitung pfadgenau** auf das jeweilige Pendant unter `.de` umgeleitet. Ziel: Backlinks nicht ins Leere laufen lassen, Brand-Squatting verhindern, Link-Equity auf `.de` konsolidieren.

**Redirect-Regeln** (umgesetzt in `infra/caddy/Caddyfile`):

| Quelle | Ziel |
|---|---|
| `http(s)://hxroom.io/<path>?<query>` | `https://hxroom.de/<path>?<query>` |
| `http(s)://www.hxroom.io/<path>` | `https://hxroom.de/<path>` (www wird gestrippt) |
| `http(s)://app.hxroom.io/<path>` | `https://app.hxroom.de/<path>` |
| `http(s)://admin.hxroom.io/<path>` | `https://admin.hxroom.de/<path>` |
| `http(s)://api.hxroom.io/<path>` | `https://api.hxroom.de/<path>` |
| `http(s)://[slug].hxroom.io/<path>` | `https://[slug].hxroom.de/<path>` |

Eigene `http://`-Blöcke in der Caddy-Config vermeiden die Kette `http://.io → https://.io → https://.de` – jeder Request benötigt **genau einen Hop**.

### 6.2 DNS-Records bei Ionos

Beide Zonen liegen bei Ionos im selben Account; der vorhandene `IONOS_API_TOKEN` deckt DNS-01-Challenges für beide ab.

**Zone `hxroom.de` (Primär, Produktiv):**

| Typ | Name | Wert |
|---|---|---|
| A | `@` | Hetzner-IP des Caddy-Hosts |
| AAAA | `@` | Hetzner-IPv6 des Caddy-Hosts |
| A | `www` | Hetzner-IP |
| A | `*` | Hetzner-IP (Wildcard für Klienten-Subdomains, `app.`, `admin.`, `api.`, `livekit.`) |
| AAAA | `*` | Hetzner-IPv6 |

**Zone `hxroom.io` (Brand-Reserve, 301 auf `.de`):**

| Typ | Name | Wert |
|---|---|---|
| A | `@` | Hetzner-IP des Caddy-Hosts (gleicher Host wie `.de`) |
| AAAA | `@` | Hetzner-IPv6 |
| A | `www` | Hetzner-IP |
| A | `*` | Hetzner-IP (Wildcard, damit auch `app.hxroom.io` etc. den Caddy erreichen und weitergeleitet werden können) |
| AAAA | `*` | Hetzner-IPv6 |

Caddy fordert per DNS-01 Challenge separate Let's-Encrypt-Zertifikate für `hxroom.io` + `www.hxroom.io` sowie für `*.hxroom.io` an – analog zum `.de`-Setup. Ohne `*.hxroom.io`-Wildcard-Cert lassen sich die Subdomain-Redirects nicht per HTTPS bedienen.

**E-Mail-relevante DNS-Records** (in derselben Ionos-Zone `hxroom.de`):

| Typ | Name | Wert | Zweck |
|---|---|---|---|
| MX | `@` | von Ionos Mail Business automatisch gesetzt | Empfang an Ionos-Postfächern (`kontakt@`, `noreply@` etc.) |
| TXT | `@` | `v=spf1 include:spf.brevo.com include:_spf.ionos.de -all` | SPF: Brevo (App-Versand) + Ionos (manuelle Replys aus Apple Mail) |
| TXT | `mail._domainkey` | DKIM-Key von Brevo | Signatur für Brevo-Versand |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@hxroom.de` | DMARC-Policy |

Vollständiges Setup-Verfahren siehe `newsletter-brevo.md`.

### 6.3 Spätere Internationalisierung (ausblickend)

Bei Aktivierung des englischen Auftritts: eigener Content unter `hxroom.io` (nicht Kopie von `.de`), Sprachverknüpfung via `hreflang` (`de-DE` ↔ `en`, `x-default` auf `.de`). Bis dahin bleibt `.io` reiner 301-Umleiter und bekommt **keine eigenständigen Inhalte** – sonst entsteht Duplicate-Content-Risiko.

---

## 7. Authentifizierung & Sessions (better-auth)

better-auth übernimmt das gesamte Session-Management für **Coaches** (die einzigen User mit Account im System):

```
Coach registriert sich → better-auth Session → JWT in HttpOnly Cookie
Klient → kein Account, kein Login → Zugang nur via signiertem Token im Buchungslink
```

**Klienten-Zugang** funktioniert über einen signierten Token (HMAC-SHA256), der beim Anlegen eines Termins generiert und per E-Mail verschickt wird. Derselbe Link erfüllt zwei Aufgaben nacheinander, keine zweite Mail nötig:

1. **Bestätigung der Buchung** – Klick auf den Link direkt nach der Buchung setzt `bookings.status` von `pending` auf `confirmed` und `confirmedAt`. Erst dadurch wird der Klienten-Datensatz final angelegt/verknüpft (siehe `clients`-Schema in §11 sowie `idee-klienten-matching.md`). Ohne Klick innerhalb der TTL verfällt die Buchung automatisch.
2. **Zugang zum Warteraum** – am Tag der Sitzung berechtigt derselbe Link zum Betreten des Warteraums (`apps/videocall`) und zur Generierung eines LiveKit-Access-Tokens für den Call.

Der Token hat ein Ablaufdatum (2 Stunden nach geplantem Sitzungsbeginn) und ist für den Warteraum-Zugang einmalig verwendbar (Invalidierung nach Join, gespeichert in `clientTokenUsedAt`). Die Bestätigung (`confirmedAt`) ist ein separates, frühes Ereignis und invalidiert den Link nicht – er bleibt bis zum Sitzungstag für den Warteraum-Zugang gültig.

---

## 8. Videocall-Architektur (LiveKit self-hosted)

### Verortung im Monorepo

Der Videocall verteilt sich auf mehrere Ebenen:

| Ort | Verantwortung |
|---|---|
| `infra/livekit/` | LiveKit-Server (Docker-Container) mit `livekit.yaml`/`egress.yaml`. |
| `apps/api/` | Erzeugt HMAC-Buchungstokens für Klienten und LiveKit-Access-Tokens, verwaltet Rooms (`session_${bookingId}`), empfängt LiveKit-Webhooks, enqueued nach Sessionende den Whisper-Job. |
| `apps/bookingpage/` | **Klienten-Subdomain** (`[slug].hxroom.de`) – Angebote, Verfügbarkeiten, Buchungsseite, E-Mail-Bestätigung. Kein Videocall-Code mehr enthalten; die Bestätigung verlinkt auf `[slug].hxroom.de/call/{bookingId}`. |
| `apps/coach/` | Coach-Backoffice (`app.hxroom.de`) – Klientenverwaltung, Angebote, Einstellungen. Zeigt nur eine schlanke „Klient wartet"-Benachrichtigung (Server-Sent Events) mit Link auf `app.hxroom.de/call/{bookingId}` – der Call-Screen selbst liegt in `apps/videocall`. |
| `apps/videocall/` | **Warteraum + Call für beide Seiten**, pfadbasiert unter zwei Domains gemountet (siehe §6): `[slug].hxroom.de/call/*` (Klient, Zugriff via signiertem Buchungstoken) und `app.hxroom.de/call/*` (Coach, Zugriff via better-auth Session). Enthält Einwilligungs-Banner, Warteraum-UI, Einlassen-Button, Video-UI und Session-Notizen (Live-Editing während des Calls). Nutzt das LiveKit JS SDK. |

**Session-Notizen – Split nach Zeitpunkt, nicht nach App:** Live-Editing während der Sitzung passiert in `apps/videocall` und schreibt direkt in `session_notes` über `apps/api`. Das Einsehen/Nachbearbeiten in der Sitzungshistorie (Klientenliste, CRM) bleibt in `apps/coach`. Beide UI-Oberflächen greifen auf dieselbe Tabelle zu – keine Logik-Duplikation.

### Deployment

LiveKit läuft als Docker-Container auf demselben Hetzner-Server. Die Konfiguration (`livekit.yaml`) definiert TURN-Server, Redis-Verbindung für Cluster-State und API-Keys.

```yaml
# infra/livekit/livekit.yaml
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
redis:
  address: redis:6379
keys:
  LIVEKIT_API_KEY: LIVEKIT_API_SECRET
```

### Raummodell

Jeder Coach bekommt einen **persistenten LiveKit Room** pro Buchung. Der Room-Name ist deterministisch aus der Booking-ID generiert:

```
room-name: session_${bookingId}
```

### Token-Generierung (NestJS)

```typescript
// Vereinfacht – läuft im BookingService
const accessToken = new AccessToken(
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
  { identity: participantIdentity, ttl: '2h' }
);
accessToken.addGrant({
  room: `session_${bookingId}`,
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
});
```

### Warteraum-Flow

Der Warteraum ist **kein separater LiveKit Room**, sondern ein Frontend-Zustand:

1. Klient öffnet `[slug].hxroom.de/call/{bookingId}` mit Buchungs-Token → `apps/videocall` zeigt Warteraum-UI (Coach-Branding)
2. `apps/api` prüft Token, gibt noch **keinen** LiveKit-Token aus
3. Coach sieht in `apps/coach` die „Klient wartet"-Benachrichtigung (via Server-Sent Events) und folgt dem Link zu `app.hxroom.de/call/{bookingId}`
4. Coach klickt in `apps/videocall` auf „Einlassen" → `apps/api` generiert LiveKit-Token für den Klienten
5. Frontend des Klienten (`apps/videocall`) verbindet sich mit dem LiveKit Room

---

## 9. Speech-to-Text (Whisper self-hosted)

### Überblick

Nach jeder abgeschlossenen Sitzung wird optional eine Transkription erstellt (nur mit Einwilligung des Klienten – siehe unten). Das Transkript steht dem Coach in den Sitzungsnotizen zur Verfügung. Da Coaching-Gespräche hochsensibel sind, läuft die Transkription **ausschließlich self-hosted** – keine Audiodaten verlassen Hetzner.

### Technische Umsetzung

**Whisper-Service** ist ein schlanker HTTP-Wrapper um `faster-whisper`:

```dockerfile
# infra/whisper/Dockerfile
FROM python:3.11-slim
RUN pip install faster-whisper flask
COPY server.py .
CMD ["python", "server.py"]
# Exposes: POST /transcribe { audio_path: string } → { text: string }
```

**Audioaufnahme-Flow:**

```
Sitzung endet
  → LiveKit Egress API erstellt Audio-Recording (nur wenn Coach aktiviert)
  → Recording landet im S3-Bucket `hxroom-recordings` (Hetzner Object Storage)
  → BullMQ Job `transcribe-session` wird eingereiht
  → Worker ruft Whisper-Service auf (POST /transcribe)
  → Transkript wird in session_notes.transcript gespeichert
```

### Datenschutz & Einwilligung (DSGVO Art. 6 + Art. 7)

Audioaufnahmen erfordern die **aktive, dokumentierte Einwilligung des Klienten** – nicht nur einen Hinweis. Die technische Umsetzung erfolgt in zwei Schritten:

**Schritt 1 – Coach aktiviert Aufnahme-Feature (einmalig)**
Im Backoffice aktiviert der Coach die Transkriptionsfunktion. Damit verpflichtet er sich, Klienten vor jeder Aufnahme um Einwilligung zu bitten. Dies wird im Coach-Profil protokolliert (`transcription_enabled_at`).

**Schritt 2 – Klient gibt Einwilligung pro Sitzung**
Beim Betreten des Warteraums erscheint – wenn der Coach Aufnahmen aktiviert hat – ein explizites Einwilligungs-Banner. Erst nach Bestätigung wird die Aufnahme für diese Sitzung freigeschaltet.

```typescript
// Drizzle Schema-Ergänzung: Einwilligung pro Booking
consentGivenAt: timestamp('consent_given_at'),       // null = keine Einwilligung
consentIpAddress: text('consent_ip_address'),         // IP zum Zeitpunkt der Einwilligung
consentVersion: text('consent_version'),              // Version des Einwilligungstexts
```

```
Klient betritt Warteraum
  → Coach hat Aufnahmen aktiviert → Einwilligungs-Banner wird angezeigt
  → Klient klickt "Ich stimme zu" → POST /api/v1/bookings/:id/consent
  → Backend speichert: consentGivenAt, consentIpAddress, consentVersion
  → Aufnahme wird für diese Sitzung freigeschaltet
  → Klient lehnt ab → Sitzung findet statt, aber ohne Aufnahme
```

**Widerruf:** Der Klient kann die Einwilligung jederzeit widerrufen (per E-Mail an den Coach). Das Recording und das Transkript werden dann unverzüglich gelöscht. Dies ist im AVV festgehalten.

### Whisper-Modell-Wahl

| Modell | Größe | Qualität | Empfehlung |
|---|---|---|---|
| `tiny` | 75 MB | ausreichend | Nicht empfohlen |
| `base` | 145 MB | gut | Entwicklung / Tests |
| `small` | 466 MB | sehr gut | **MVP** |
| `medium` | 1,5 GB | exzellent | Später bei Bedarf |

Das Modell `small` liefert für deutschsprachige Coaching-Gespräche sehr gute Ergebnisse ohne GPU-Anforderungen.

---

## 10. Object Storage (S3-kompatibel)

### Überblick

Der Objektspeicher wird phasenweise betrieben:

- **Entwicklung & Pre-Launch-Server:** **RustFS**, self-hosted als Docker-Container (siehe `docker-compose-test-rustfs.yml`). S3-kompatibel, kein externer Vertrag nötig, identisches Client- und Bucket-Schema wie später produktiv.
- **Produktiv-Launch:** Wechsel auf **Hetzner Object Storage** (S3-kompatibel, EU-Frankfurt). Da beide Dienste dieselbe S3-API sprechen, bleiben Client-Code, Bucket-Struktur und Key-Schema unverändert – es ändern sich nur `S3_ENDPOINT`, `S3_REGION` und `S3_FORCE_PATH_STYLE` in der Umgebungskonfiguration.

Die Anbindung erfolgt in beiden Phasen über AWS SDK v3 (`@aws-sdk/client-s3`); Endpoint und Credentials kommen aus Umgebungsvariablen.

```typescript
// apps/api/src/storage/s3.client.ts
import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,                // Dev/Pre-Launch: http://rustfs:9000; Produktion: z.B. https://fsn1.your-objectstorage.com
  region: process.env.S3_REGION ?? 'eu-central',    // Hetzner-Region; bei RustFS: 'us-east-1'
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // true für RustFS, optional bei Hetzner
});
```

### Bucket-Struktur

| Bucket | Inhalt | Zugriff | Ablauf |
|---|---|---|---|
| `hxroom-uploads` | Coach-Logos, Profilfotos | Public-Read (via CDN-URL) | Permanent |
| `hxroom-recordings` | LiveKit Audio-Recordings | Private | Nach Transkription (TTL 7 Tage) |
| `hxroom-exports` | PDF-Rechnungen, Datenexporte | Private, signierte URLs | 24h nach Generierung |

### Was landet wo

**Coach-Logos & Profilfotos** (`hxroom-uploads`)
Beim Branding-Setup lädt der Coach sein Logo hoch. Das Backend empfängt die Datei, validiert Typ und Größe, und schreibt sie direkt in S3. Die öffentliche URL wird in `coach_profiles.branding_logo_url` gespeichert.

```
Key-Schema: uploads/{organizationId}/logo.{ext}
            uploads/{organizationId}/avatar.{ext}
```

**Audio-Recordings** (`hxroom-recordings`)
LiveKit Egress schreibt fertige Recordings direkt in den S3-Bucket (LiveKit unterstützt S3-kompatible Endpoints nativ). Nach erfolgreicher Transkription durch Whisper wird die Audiodatei automatisch gelöscht – sie wird nicht dauerhaft aufbewahrt.

```
Key-Schema: recordings/{organizationId}/{bookingId}/{timestamp}.ogg
```

```yaml
# LiveKit Egress Konfiguration (Ausschnitt)
s3:
  access_key: ${S3_ACCESS_KEY}
  secret: ${S3_SECRET_KEY}
  region: ${S3_REGION}                 # Hetzner-Region, z.B. eu-central
  endpoint: ${S3_ENDPOINT}             # Dev/Pre-Launch: http://rustfs:9000; Produktion: Hetzner Object Storage
  bucket: hxroom-recordings
  force_path_style: ${S3_FORCE_PATH_STYLE}   # true für RustFS
```

**PDF-Rechnungen & Datenexporte** (`hxroom-exports`)
Generierte Rechnungen (Pro-Feature) und DSGVO-Datenexporte werden als PDFs in S3 gespeichert. Der Zugriff erfolgt ausschließlich über **signierte URLs** mit kurzer TTL – kein dauerhafter öffentlicher Zugriff.

```
Key-Schema: exports/{organizationId}/invoices/{invoiceId}.pdf
            exports/{organizationId}/data-export-{timestamp}.zip
```

```typescript
// Signierte URL generieren (gültig 1 Stunde)
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const url = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: 'hxroom-exports',
  Key: `exports/${orgId}/invoices/${invoiceId}.pdf`,
}), { expiresIn: 3600 });
```

### Upload-Flow (Coach-Logo)

```
Coach lädt Logo hoch (Frontend)
  → POST /api/v1/organizations/:id/branding/logo (multipart/form-data)
  → NestJS validiert: max. 2 MB, nur image/png + image/jpeg
  → Upload nach S3: hxroom-uploads/{organizationId}/logo.{ext}
  → Public-URL wird in coach_profiles.branding_logo_url gespeichert
  → Altes Logo wird aus S3 gelöscht (falls vorhanden)
```

### Drizzle Schema-Ergänzung

```typescript
// Datei-Metadaten werden nicht vollständig in der DB gespiegelt –
// S3-Keys werden direkt in den Entitäten gespeichert.

// In coach_profiles:
brandingLogoUrl: text('branding_logo_url'),  // vollständige S3-Public-URL

// In bookings (für Recordings):
recordingS3Key: text('recording_s3_key'),    // Key in hxroom-recordings
recordingDeletedAt: timestamp('recording_deleted_at'), // nach Transkription gesetzt

// In einer zukünftigen invoices-Tabelle (Pro):
invoiceS3Key: text('invoice_s3_key'),        // Key in hxroom-exports
```

### NestJS StorageModule

Ein zentrales `StorageModule` kapselt alle S3-Operationen und wird von anderen Modulen injiziert:

```typescript
// apps/api/src/storage/storage.service.ts
@Injectable()
export class StorageService {
  async uploadLogo(orgId: string, file: Buffer, ext: string): Promise<string>
  async deleteFile(bucket: string, key: string): Promise<void>
  async getSignedDownloadUrl(bucket: string, key: string, ttl: number): Promise<string>
  async recordingExists(bookingId: string): Promise<boolean>
}
```

Claude Code kann das `StorageModule` inkl. Service und Typen vollständig aus einem Prompt generieren, da AWS SDK v3 + S3-Uploads ein sehr gut abgedecktes Muster sind.

---

## 11. Datenbankmodell mit Drizzle ORM

> **Angebote & Verfügbarkeiten:** Die Verknüpfung von `offers` und `availabilitySlots` (Zwei-Stufen-Modell: Standard-Verfügbarkeit für alle Angebote, optionale Ausnahme pro Angebot) ist im Detail beschrieben in [`funktionen/angebote-verfuegbarkeiten.md`](funktionen/angebote-verfuegbarkeiten.md). Hier nur der Schema-Auszug.

```typescript
// apps/api/src/db/schema.ts (Auszug)

// better-auth generiert automatisch: users, sessions, accounts, organizations,
// organization_members, organization_invitations
// Das coaches-Profil erweitert den better-auth User um fachliche Daten.

export const coachProfiles = pgTable('coach_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(), // Referenz auf better-auth users.id
  organizationId: text('organization_id').notNull(), // Referenz auf better-auth organizations.id
  brandingLogoUrl: text('branding_logo_url'),
  brandingPrimaryColor: text('branding_primary_color').default('#8B9E8A'),
  welcomeMessage: text('welcome_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// MANDANTENTRENNUNG: Ein Klient ist immer exklusiv einer Organization zugeordnet.
// Bucht dieselbe Person bei einem Coach einer anderen Organization, entsteht
// ein neuer, vollständig unabhängiger Client-Datensatz. Keine organisationsübergreifende
// Zusammenführung von Klientendaten. Unique-Constraint auf (organizationId + email).
//
// KLIENTEN-MATCHING (siehe idee-klienten-matching.md für Herleitung):
// - email wird im Service-Layer vor jedem Lookup/Insert normalisiert (lowercase + trim),
//   damit z.B. "Anna@Firma.de" und "anna@firma.de" denselben Client treffen. Der
//   Unique-Constraint allein reicht dafür nicht (case-sensitive). Gemeinsame Funktion
//   normalizeEmail() für beide Entstehungswege.
// - Zwei Entstehungswege: automatisch bei Bestätigung einer Buchung (NICHT schon bei
//   Buchungseingang – vermeidet "Geister-Klienten" durch nie bestätigte Buchungen), und
//   manuell durch den Coach für Bestandsklienten aus anderen Systemen. Manuell angelegte
//   Klienten haben zunächst keine Buchung; die "keine Geister-Klienten"-Regel gilt nur
//   für den automatischen Weg.
// - Automatisches Matching ist die Grundlage, nicht die einzige Quelle der Wahrheit:
//   der Coach kann jede Buchung manuell einem bestehenden Client zuordnen/umhängen
//   (bookings.clientId ist jederzeit im Backoffice änderbar), unabhängig vom
//   automatischen Ergebnis. Der Coach hat das letzte Wort.
// - phone/note pflegt ausschließlich der Coach; note ist eine interne Anmerkung und für
//   den Klienten nie sichtbar. Beide sind unabhängig von den gleichnamigen Snapshot-
//   Feldern an bookings, die festhalten, was der Klient beim Buchen eingegeben hat.
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Stellt sicher: pro Organization ist jede E-Mail-Adresse (normalisiert) nur einmal vorhanden
  uniqueEmailPerOrg: unique().on(table.organizationId, table.email),
}));

// BESTÄTIGUNGSPFLICHT (siehe idee-klienten-matching.md): Jede Buchung – ob online
// gebucht oder vom Coach manuell angelegt – startet als 'pending' und wird erst durch
// Klick auf den signierten Link in der Bestätigungsmail zu 'confirmed'. Das schützt vor
// Tippfehlern in der E-Mail-Adresse (nur eine erreichbare Inbox kann den Link klicken)
// und verhindert, dass falsch getippte Adressen unbemerkt einen neuen Client anlegen.
// Ohne Bestätigung innerhalb der TTL wird die Buchung automatisch 'cancelled' und der
// Slot freigegeben (siehe §12, Job expire-unconfirmed-booking).
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(), // für org-weite Kalenderansicht im Studio-Plan
  coachId: text('coach_id').notNull(),               // der Coach, der die Sitzung hält
  clientId: uuid('client_id').references(() => clients.id), // manuell durch den Coach jederzeit änderbar
  offerId: uuid('offer_id').references(() => offers.id), // nullable – manuell angelegte Termine ohne Angebotsbezug
  offerName: text('offer_name'),                     // Snapshot des Angebotsnamens zum Buchungszeitpunkt
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60), // Snapshot aus offer.durationMinutes
  status: text('status')
    .$type<'pending' | 'confirmed' | 'completed' | 'cancelled'>()
    .default('pending'),
  confirmedAt: timestamp('confirmed_at'), // gesetzt beim Klick auf den Bestätigungslink; erst dann wird clients-Matching final vollzogen
  clientAccessToken: text('client_access_token'), // derselbe Token dient zuerst der Bestätigung, später dem Warteraum-Zugang
  clientTokenUsedAt: timestamp('client_token_used_at'), // Zeitpunkt des Warteraum-Eintritts (separat von confirmedAt)
  roomName: text('room_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessionNotes = pgTable('session_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  coachId: text('coach_id').notNull(), // better-auth userId des Coaches
  content: text('content'),
  // aiSummary: entfernt – keine KI-Zusammenfassung im MVP
  transcript: text('transcript'),
  transcriptStatus: text('transcript_status')
    .$type<'pending' | 'processing' | 'done' | 'error'>()
    .default('pending'),
  transcriptCreatedAt: timestamp('transcript_created_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const availabilitySlots = pgTable('availability_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: text('coach_id').notNull(), // better-auth userId – jeder Coach hat eigene Verfügbarkeiten
  weekday: integer('weekday').notNull(), // 0 = Montag, 6 = Sonntag
  startTime: text('start_time').notNull(), // "09:00"
  endTime: text('end_time').notNull(),     // "17:00"
});

// Einzelsitzungs-Angebote (Pakete/Mehrfachsitzungen bewusst nicht Teil von v1,
// siehe funktionen/angebote-verfuegbarkeiten.md Abschnitt 2 & 7)
export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  coachId: text('coach_id').notNull(),          // better-auth userId
  name: text('name').notNull(),                 // z.B. "Coaching-Sitzung"
  durationMinutes: integer('duration_minutes').notNull(),
  price: integer('price_cents'),                // optional, in Cent; null = kein Preis hinterlegt
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  // Zwei-Stufen-Modell: false (Default) = Angebot gilt in der gesamten
  // allgemeinen Verfügbarkeit; true = nur in den unten zugeordneten Slots.
  useCustomAvailability: boolean('use_custom_availability').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Stufe 2 des Zwei-Stufen-Modells: Teilmenge der availabilitySlots, die für
// ein Angebot mit useCustomAvailability = true gilt. Bei false ungenutzt.
export const offerAvailabilitySlots = pgTable('offer_availability_slots', {
  offerId: uuid('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  slotId: uuid('slot_id').notNull().references(() => availabilitySlots.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.offerId, table.slotId] }),
}));

export const reminderJobs = pgTable('reminder_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  type: text('type').$type<'24h' | '1h'>().notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  sentAt: timestamp('sent_at'),
});
```

### 11.1 Validierungs- und DTO-Konvention

Alle Request- und Response-Schemas werden mit **Zod** definiert und leben in `packages/shared/src/schemas/`. TypeScript-Typen werden ausschließlich via `z.infer<>` abgeleitet – keine separaten Interface- oder Class-Definitionen.

```
packages/shared/src/schemas/
  booking.ts       # createBookingSchema, updateBookingSchema, BookingResponseSchema
  client.ts        # createClientSchema, ClientResponseSchema
  availability.ts  # availabilitySlotSchema
  offer.ts         # createOfferSchema, updateOfferSchema, OfferResponseSchema
  profile.ts       # updateCoachProfileSchema, CoachProfileResponseSchema
  newsletter.ts    # subscribeSchema
```

**Warum shared:** Die Frontend-Apps (`coach`, `bookingpage`, `videocall`) importieren dieselben Schemas direkt für Formularvalidierung (`schema.safeParse(formData)`) und Response-Parsing (`schema.parse(await res.json())`). Eine einzige Source of Truth – kein Typ-Drift zwischen API und Frontend.

**Muster je Ressource:**

```typescript
// packages/shared/src/schemas/booking.ts
const bookingBase = z.object({ ... });

export const createBookingSchema = bookingBase;
export const updateBookingSchema = bookingBase.partial();
export const bookingResponseSchema = bookingBase.extend({ id: z.string().uuid(), ... });

export type CreateBookingDto   = z.infer<typeof createBookingSchema>;
export type UpdateBookingDto   = z.infer<typeof updateBookingSchema>;
export type BookingResponseDto = z.infer<typeof bookingResponseSchema>;
```

**Im NestJS-Controller** per `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`):

```typescript
import { createBookingSchema, CreateBookingDto } from '@hxroom/shared';

@Post()
@UsePipes(new ZodValidationPipe(createBookingSchema))
create(@Body() dto: CreateBookingDto) { ... }
```

Rein API-interne Schemas (z.B. Webhook-Payloads, interne Job-DTOs) können lokal im jeweiligen Modul bleiben.

---

## 12. E-Mail, Job-Queue & Stripe-Billing

### BullMQ Job-Queue

**BullMQ** (Redis-backed) verwaltet alle zeitbasierten und asynchronen Tasks:

- Nach Buchung: Job `expire-unconfirmed-booking` einplanen (delay = TTL, z.B. 30 Minuten) – prüft bei Ausführung, ob `bookings.status` noch `pending` ist; falls ja: `status = 'cancelled'`, Slot wird freigegeben. Wurde die Buchung zwischenzeitlich bestätigt, ist der Job ein No-op. Bei kurzfristigen Buchungen (Sitzungsbeginn näher als die TTL) wird die TTL auf die verbleibende Vorlaufzeit gekappt – offene Detailfrage, siehe `idee-klienten-matching.md`.
  **Umgesetzt (2026-08-10) ohne BullMQ:** Solange kein Redis im Betrieb ist, erledigt `BookingExpiryService` (`apps/api/src/bookings/booking-expiry.service.ts`) dasselbe über `@nestjs/schedule` – ein Lauf alle 5 Minuten storniert alle abgelaufenen `pending`-Buchungen gesammelt. Die Ungenauigkeit von ±5 Minuten ist bei einer TTL von 30 Minuten unkritisch. Beim Umstieg auf BullMQ kann der Cron ersatzlos entfallen; die TTL-Kappung bei kurzfristigen Buchungen ist weiterhin offen.
- Nach Bestätigung: Jobs einplanen (`reminder-24h`, `reminder-1h`)
- Nach Sitzungsende: Job `transcribe-session` (wenn Einwilligung vorhanden)
- Job-Worker in NestJS (`@Processor`-Decorator)
- E-Mail-Versand via **Brevo** (französischer Anbieter, EU-Server, zuverlässige Zustellraten). Brevo deckt sowohl transaktionale Mails (Buchungsbestätigung, Erinnerung, Passwort-Reset) als auch Newsletter ab. Getrennte Sender-Adressen für Transaktional (`noreply@hxroom.de`) und Marketing (`newsletter@hxroom.de`) schützen die Zustellbarkeit. Setup-Details siehe `newsletter-brevo.md`.

Claude Code kann die komplette BullMQ-Modul-Struktur inkl. Worker, Job-Definitionen und Whisper-Client aus einem einzigen Prompt generieren.

### Stripe – Subscription & Billing

Stripe wird für zwei Zwecke eingesetzt: **Einmalige Zahlungen** (z.B. Klient zahlt Sitzungshonorar, Pro-Feature) und **wiederkehrende Subscriptions** (Coach zahlt HxRoom-Abo).

**Subscription-Modell:**

| Plan | Stripe Product | Billing |
|---|---|---|
| Trial | – | 14 Tage kostenlos, kein Stripe nötig |
| Solo | `hxroom_solo` | monatlich / jährlich |
| Pro | `hxroom_pro` | monatlich / jährlich |
| Studio | `hxroom_studio` | monatlich / jährlich |

**Subscription-Flow (Coach):**

```
Coach wählt Plan im Backoffice
  → POST /api/v1/billing/checkout → erstellt Stripe Checkout Session
  → Coach wird zu Stripe Checkout weitergeleitet (gehostet, kein eigenes Zahlungsformular)
  → Nach Zahlung: Stripe sendet webhook checkout.session.completed
  → Backend aktiviert Plan in organizations.plan + organizations.plan_expires_at
  → Brevo schickt Bestätigungs-E-Mail

Abo läuft weiter (monatlich/jährlich):
  → Stripe sendet invoice.paid → Plan-Ablaufdatum wird verlängert
  → Stripe sendet invoice.payment_failed → Coach bekommt Erinnerung per E-Mail
  → Nach Grace Period (7 Tage): Downgrade auf eingeschränkten Zugang
  → Kündigung: subscription.deleted → sofortiger Downgrade auf Trial-Einschränkungen
```

**Stripe Billing Portal:**
Coaches können ihr Abo, ihre Zahlungsmethode und ihre Rechnungen selbst verwalten – über das von Stripe gehostete Billing Portal. Das erspart eine eigene Abo-Verwaltungs-UI.

```typescript
// Billing Portal Session erstellen
const session = await stripe.billingPortal.sessions.create({
  customer: organization.stripeCustomerId,
  return_url: `https://app.hxroom.de/settings/billing`,
});
// Coach wird zu session.url weitergeleitet
```

**Drizzle Schema-Ergänzung (organizations-Erweiterung):**

```typescript
// Stripe-relevante Felder werden in einer eigenen Tabelle gehalten,
// da better-auth die organizations-Tabelle verwaltet.
export const organizationBilling = pgTable('organization_billing', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').$type<'trial' | 'solo' | 'pro' | 'studio'>().default('trial'),
  planExpiresAt: timestamp('plan_expires_at'),
  trialEndsAt: timestamp('trial_ends_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Webhook-Sicherheit:** Stripe-Webhooks werden mit `stripe.webhooks.constructEvent` und dem Webhook-Secret verifiziert – kein unautorisierter Zugriff möglich.

---

## 13. Backup-Konzept

**PostgreSQL**
- Täglicher `pg_dump` via Cron-Job im `api`-Container, komprimiert als `.sql.gz`
- Upload ins S3-Bucket `hxroom-backups` (privat, Hetzner DE)
- Aufbewahrung: 7 Tages-Backups, 4 Wochen-Backups, 3 Monats-Backups (GFS-Schema)
- Restore-Test monatlich in Staging-Umgebung

**Object Storage**
- **Entwicklung & Pre-Launch (RustFS, self-hosted)**: Daten liegen im Docker Volume `rustfs_data`. Es greift das **Hetzner Server Backup** (täglich, letzte 7 Snapshots) und zusätzlich ein `rclone sync` auf einen Zweitserver.
- **Ab Produktiv-Launch (Hetzner Object Storage)**: Hetzner verantwortet Redundanz und Replikation innerhalb Frankfurts. Zusätzlich läuft täglich ein `rclone sync` in einen zweiten Bucket (separates Hetzner-Projekt) als Off-Site-Kopie.

```bash
# Beispiel rclone Cron (täglich 03:00) – gilt für beide Varianten
0 3 * * * rclone sync remote-primary:hxroom-uploads remote-backup:hxroom-uploads-backup
```

**Redis**
- Nur Job-Queue und Session-Daten – kein persistentes Backup nötig
- Sessions sind kurzlebig, Jobs werden bei Neustart neu verarbeitet (BullMQ `removeOnComplete`)

**Docker Volumes**
- Whisper-Modelle sind reproduzierbar (Download beim ersten Start) – kein Backup nötig
- `pgdata`-Volume wird durch pg_dump abgedeckt

**Monitoring**
- Backup-Job schreibt Ergebnis (Erfolg / Dateigröße) in eine `backup_logs`-Tabelle
- Fehlgeschlagene Backups lösen Alarm per E-Mail aus (Brevo)

---

## 14. MVP-Entwicklungsreihenfolge

| Phase | Features | Claude Code Hauptaufgabe |
|---|---|---|
| **1 – Fundament** | Docker Compose Setup, DB-Schema, Basis-Auth | Monorepo-Setup, Drizzle-Schema, Docker-Config |
| **2 – Auth & Profil** | Registrierung, Login, Subdomain-Setup, Branding | better-auth Integration, Coach-Modul |
| **3 – Buchung** | Angebote (Einzelsitzungen), Verfügbarkeiten inkl. Zwei-Stufen-Modell, Buchungsseite, E-Mail-Bestätigung | Offer-Modul, Booking-Modul, Availability-Logik, E-Mail-Templates |
| **4 – Videocall** | Warteraum, LiveKit-Integration, Call-UI, Scaffolding `apps/videocall` inkl. pfadbasiertem Caddy-Routing | LiveKit-Service, Token-Generierung, Vue-Composable |
| **5 – Nachbereitung** | Notizen, Session-Abschluss, Klienten-Weiterleitung | Notes-Modul, Session-State |
| **6 – Speech2Text** | Whisper-Transkription, Klienten-Einwilligung, Transkript-Ansicht | Whisper-Service, BullMQ-Job, Consent-Flow, Transkript-UI |
| **7 – CRM** | Klientenliste, Sitzungshistorie | Client-Modul, Dashboard-Queries |
| **8 – Betreiber-Backoffice** | Coach-Accounts einsehen, Plan manuell setzen, Accounts sperren, Übersicht aller Organizations | Admin-Modul (geschützt durch separaten Auth-Guard für Betreiber-Rolle) |
| **9 – Billing** | Stripe Subscription, Billing Portal, Plan-Enforcement | Stripe-Webhook-Handler, organizationBilling-Schema |
| **10 – Pro-Features** | Rechnungsstellung, iCal-Feed (Basic), Google Calendar API Sync (Pro, bidirektional) | Rechnung-PDF → S3, iCal-Endpunkt, Google Calendar OAuth + Webhook |

---

## 15. Entwicklungsumgebung

```bash
# Starten der lokalen Umgebung
docker compose -f infra/docker-compose.dev.yml up -d
# Startet: PostgreSQL, Redis, LiveKit (dev-Modus), Whisper-Service

pnpm dev                    # API + Frontend parallel

# Claude Code im Einsatz
claude "Erstelle das NestJS Availability-Modul nach CLAUDE.md Konventionen"
claude "Schreibe Drizzle-Schema und Migration für die bookings-Tabelle"
claude "Generiere Vue-Composable für LiveKit-Room-Verbindung"
claude "Erstelle BullMQ Job und Worker für Whisper-Transkription"
```

**Lokale Subdomain-Entwicklung:** `/etc/hosts` Einträge für `app.localhost` und `test.localhost`, Caddy läuft lokal als Reverse Proxy.

---

## 16. Offene Punkte

| # | Thema | Beschreibung | Priorität |
|---|---|---|---|
| 01 | **Subdomain-Modell Studio** | Beim Studio-Plan: teilen alle Coaches dieselbe Subdomain (`studio.hxroom.de`) oder bekommt jeder Coach eine eigene? Auswirkung auf Buchungsseite, Warteraum-Branding und Routing. | Vor Studio-Launch klären |

---

## 17. Sicherheit & DSGVO

- **Server ausschließlich Hetzner Deutschland** (Nürnberg / Falkenstein)
- **LiveKit self-hosted** auf demselben Hetzner-Projekt → Mediendaten verlassen nie Deutschland
- **Whisper self-hosted** → Audiodaten und Transkripte bleiben auf Hetzner
- **Object Storage** → alle Dateien (Logos, Recordings, Exports) in der EU, S3-kompatibel. Entwicklung & Pre-Launch: **RustFS** self-hosted auf Hetzner; ab Produktiv-Launch: **Hetzner Object Storage** (EU-Frankfurt). Gleiches Key-Schema in beiden Phasen.
- **Brevo (französisch, EU-Server)** → E-Mail-Versand (transaktional + Newsletter) vollständig in der EU, AVV abgeschlossen
- **Ionos Mail Business (Deutschland)** → E-Mail-Empfang / Postfächer für `kontakt@hxroom.de` etc., vollständig EU
- **Stripe** mit EU-Entities und SCCs → DSGVO-konform für Zahlungsdaten
- better-auth HttpOnly Cookies, kein Token in LocalStorage
- Klienten-Buchungstoken: HMAC-signiert, TTL, einmalig verwendbar
- Kein Logging von E-Mail-Adressen oder Namen in Application Logs (nur IDs)
- AVV automatisch bei Registrierung abgeschlossen
- DSGVO-Löschfunktion: Cascade-Delete Coach → alle verknüpften Daten via Drizzle `onDelete: 'cascade'`
- Audioaufnahme / Transkription: aktive Klienten-Einwilligung pro Sitzung, dokumentiert mit Timestamp, IP und Version
- Audio-Recordings werden nach erfolgreicher Transkription automatisch aus S3 gelöscht
- PDF-Rechnungen und Datenexporte nur via signierte URLs mit kurzer TTL abrufbar
