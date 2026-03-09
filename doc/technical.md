# Sitzraum – Technisches Konzept
*Version 0.5 · MVP-Scope*

---

## 1. Überblick & Zielsetzung

Sitzraum ist eine White-Label Videocall-Plattform für Coaches im DACH-Markt. Das technische Ziel ist ein schlankes, iterativ wachsendes System, das vom ersten Tag an DSGVO-konform, stabil und alleine wartbar ist. Der Einsatz von **Claude Code** ist expliziter Bestandteil des Entwicklungsprozesses – nicht als Gimmick, sondern als produktiver Pair-Programmer für Scaffolding, Codegenerierung, Migrations-Skripte und Dokumentation.

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
| **Resend** | Transaktionale E-Mails – EU-Infrastruktur (Frankfurt) |
| **BullMQ + Redis** | Job-Queue für Erinnerungen, Transkription & Async-Tasks |
| **Hetzner Object Storage** | S3-kompatibler Datei-Speicher – Uploads, Recordings, Logos (EU) |
| **Stripe** | Zahlungsabwicklung & Subscription-Management (Billing Portal, Webhooks) – EU-Entities, SCCs |

### Frontend
| Technologie | Rolle |
|---|---|
| **Vue.js 3** | SPA-Framework |
| **Nuxt UI (Vue-Version)** | Komponenten-Bibliothek (Reka UI + Tailwind) |
| **Pinia** | State Management |
| **LiveKit JS SDK** | WebRTC-Client-Integration |
| **VueUse** | Utility Composables |

### Infrastruktur
| Komponente | Wahl |
|---|---|
| **Hosting** | Hetzner Cloud, Standort Deutschland (Nürnberg / Falkenstein) |
| **LiveKit Server** | Self-hosted Docker-Container auf Hetzner |
| **Whisper Service** | Self-hosted Docker-Container auf Hetzner |
| **Reverse Proxy** | Caddy (automatisches HTTPS, Wildcard-Zertifikate für `*.sitzraum.de`) |
| **Object Storage** | Hetzner Object Storage (S3-kompatibel, Standort Falkenstein) |
| **Deployment** | Docker Compose (Entwicklung & Produktion) |

### Externe Dienste – EU-Übersicht
| Dienst | Anbieter | Serverstandort | Anmerkung |
|---|---|---|---|
| E-Mail | Resend | EU (Frankfurt) | Vollständig EU |
| Zahlung & Abo | Stripe | EU (Irland / Luxemburg) | SCCs vorhanden, Billing Portal |
| DNS | Hetzner DNS | Deutschland | Vollständig EU |
| Zertifikate | Let's Encrypt via Caddy | – | Kein Datentransfer |
| Video / Audio | LiveKit self-hosted | Hetzner DE | Vollständig EU |
| Transkription | Whisper self-hosted | Hetzner DE | Vollständig EU |
| Datei-Speicher | Hetzner Object Storage | Hetzner DE (Falkenstein) | Vollständig EU |

---

## 3. Projektstruktur & Repositories

```
sitzraum/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # Vue.js Frontend (Nuxt UI)
├── packages/
│   └── shared/       # Gemeinsame Types & Zod-Schemas
├── infra/
│   ├── docker-compose.yml          # Produktion
│   ├── docker-compose.dev.yml      # Lokale Entwicklung
│   ├── livekit/                    # LiveKit Config: livekit.yaml + egress.yaml
│   ├── whisper/                    # Whisper Service Dockerfile
│   └── caddy/                      # Caddyfile
└── CLAUDE.md         # Claude Code Instruktionsdatei
```

Ein **Monorepo** (pnpm Workspaces) hält den Overhead gering und erlaubt geteilte Typen zwischen Backend und Frontend – besonders wertvoll beim Einsatz von Claude Code, da der gesamte Kontext in einer Session verfügbar ist.

---

## 4. Docker Compose Architektur

Alle Services laufen in einem einzigen Docker Compose Stack. Produktion und Entwicklung teilen dieselbe Struktur, unterscheiden sich nur in Mounts und Umgebungsvariablen.

```yaml
# infra/docker-compose.yml (vereinfacht)
services:
  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    environment:
      - DATABASE_URL=postgres://...
      - LIVEKIT_API_KEY=...
      - WHISPER_API_URL=http://whisper:9000

  web:
    build: ./apps/web

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  livekit:
    image: livekit/livekit-server:latest
    volumes:
      - ./infra/livekit/livekit.yaml:/etc/livekit.yaml
    command: --config /etc/livekit.yaml

  livekit-egress:
    image: livekit/egress:latest
    volumes:
      - ./infra/livekit/egress.yaml:/etc/egress.yaml
    environment:
      - EGRESS_CONFIG_FILE=/etc/egress.yaml
    depends_on: [livekit, redis]
    # Egress benötigt Zugriff auf Redis (shared mit LiveKit) und S3-Credentials
    # egress.yaml definiert: redis-Adresse, S3-Bucket, API-Keys

  whisper:
    build: ./infra/whisper       # faster-whisper HTTP-Wrapper
    volumes:
      - whisper-models:/app/models

  caddy:
    image: caddy:latest
    volumes:
      - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile
    ports:
      - "80:80"
      - "443:443"

volumes:
  pgdata:
  whisper-models:
```

**Upgrade-Pfad:** Einzelne Services (z.B. `postgres`, `redis`) können später ohne Architekturänderung auf verwaltete Hetzner-Managed-Angebote ausgelagert werden.

---

## 5. Claude Code – Einsatzstrategie

Claude Code ist kein Ersatz für Architekturentscheidungen, aber ein erheblicher Geschwindigkeitsmultiplikator für gut definierte Aufgaben.

### 5.1 `CLAUDE.md` – Die zentrale Instruktionsdatei

Im Root des Repos liegt eine `CLAUDE.md`, die Claude Code den Projektkontext erklärt:

```markdown
# Sitzraum – Claude Code Kontext

## Stack
- Backend: NestJS, PostgreSQL, Drizzle ORM, better-auth + organization plugin, LiveKit (self-hosted)
- Speech2Text: Whisper (self-hosted, HTTP-API via faster-whisper)
- Frontend: Vue 3, Nuxt UI (Vue), Pinia
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
sitzraum.de              → Vue-App (Landingpage, öffentlich)
app.sitzraum.de          → Vue-App (Coach-Backoffice, Login erforderlich)
[slug].sitzraum.de       → Vue-App (Klienten-Subdomain: Buchung, Warteraum, Call)
api.sitzraum.de          → NestJS API
livekit.sitzraum.de      → LiveKit Server (intern, kein öffentliches UI)
admin.sitzraum.de        → Internes Betreiber-Backoffice (später)
```

**Subdomain-Routing im Frontend:** Vue Router erkennt die Subdomain aus `window.location.hostname` und rendert den entsprechenden App-Kontext. Ein einziges Deployment, mehrere logische Apps.

**Wildcard-Zertifikat:** Caddy mit Hetzner DNS-Provider für automatisches `*.sitzraum.de` Let's-Encrypt-Zertifikat.

---

## 7. Authentifizierung & Sessions (better-auth)

better-auth übernimmt das gesamte Session-Management für **Coaches** (die einzigen User mit Account im System):

```
Coach registriert sich → better-auth Session → JWT in HttpOnly Cookie
Klient → kein Account, kein Login → Zugang nur via signiertem Token im Buchungslink
```

**Klienten-Zugang** funktioniert über einen kurzlebigen, signierten Token (HMAC-SHA256), der beim Anlegen eines Termins generiert und per E-Mail verschickt wird. Dieser Token berechtigt:
- Betreten des Warteraums
- Generierung eines LiveKit-Access-Tokens für den Call

Der Token hat ein Ablaufdatum (2 Stunden nach geplantem Sitzungsbeginn) und ist einmalig verwendbar (Invalidierung nach Join in DB gespeichert).

---

## 8. Videocall-Architektur (LiveKit self-hosted)

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

1. Klient betritt Subdomain mit Buchungs-Token → sieht Warteraum-UI (Coach-Branding)
2. Backend prüft Token, gibt noch **keinen** LiveKit-Token aus
3. Coach sieht im Backoffice „Klient wartet" (via Server-Sent Events)
4. Coach klickt „Einlassen" → Backend generiert LiveKit-Token für Klienten
5. Frontend des Klienten verbindet sich mit LiveKit Room

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
  → Recording landet im S3-Bucket `sitzraum-recordings` (Hetzner Object Storage)
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

## 10. Object Storage – Hetzner S3

### Überblick

Hetzner Object Storage ist S3-kompatibel und läuft ausschließlich in Deutschland (Falkenstein). Die Integration erfolgt über das AWS SDK v3 (`@aws-sdk/client-s3`) – der Endpunkt wird lediglich auf Hetzner umgebogen. Kein Code-Unterschied zu „echtem" S3.

```typescript
// apps/api/src/storage/s3.client.ts
import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: 'https://fsn1.your-objectstorage.com', // Hetzner Falkenstein
  region: 'eu-central',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // erforderlich für Hetzner
});
```

### Bucket-Struktur

| Bucket | Inhalt | Zugriff | Ablauf |
|---|---|---|---|
| `sitzraum-uploads` | Coach-Logos, Profilfotos | Public-Read (via CDN-URL) | Permanent |
| `sitzraum-recordings` | LiveKit Audio-Recordings | Private | Nach Transkription (TTL 7 Tage) |
| `sitzraum-exports` | PDF-Rechnungen, Datenexporte | Private, signierte URLs | 24h nach Generierung |

### Was landet wo

**Coach-Logos & Profilfotos** (`sitzraum-uploads`)
Beim Branding-Setup lädt der Coach sein Logo hoch. Das Backend empfängt die Datei, validiert Typ und Größe, und schreibt sie direkt in S3. Die öffentliche URL wird in `coach_profiles.branding_logo_url` gespeichert.

```
Key-Schema: uploads/{organizationId}/logo.{ext}
            uploads/{organizationId}/avatar.{ext}
```

**Audio-Recordings** (`sitzraum-recordings`)
LiveKit Egress schreibt fertige Recordings direkt in den S3-Bucket (LiveKit unterstützt S3-kompatible Endpoints nativ). Nach erfolgreicher Transkription durch Whisper wird die Audiodatei automatisch gelöscht – sie wird nicht dauerhaft aufbewahrt.

```
Key-Schema: recordings/{organizationId}/{bookingId}/{timestamp}.ogg
```

```yaml
# LiveKit Egress Konfiguration (Ausschnitt)
s3:
  access_key: ${S3_ACCESS_KEY}
  secret: ${S3_SECRET_KEY}
  region: eu-central
  endpoint: https://fsn1.your-objectstorage.com
  bucket: sitzraum-recordings
  force_path_style: true
```

**PDF-Rechnungen & Datenexporte** (`sitzraum-exports`)
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
  Bucket: 'sitzraum-exports',
  Key: `exports/${orgId}/invoices/${invoiceId}.pdf`,
}), { expiresIn: 3600 });
```

### Upload-Flow (Coach-Logo)

```
Coach lädt Logo hoch (Frontend)
  → POST /api/v1/organizations/:id/branding/logo (multipart/form-data)
  → NestJS validiert: max. 2 MB, nur image/png + image/jpeg
  → Upload nach S3: sitzraum-uploads/{organizationId}/logo.{ext}
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
recordingS3Key: text('recording_s3_key'),    // Key in sitzraum-recordings
recordingDeletedAt: timestamp('recording_deleted_at'), // nach Transkription gesetzt

// In einer zukünftigen invoices-Tabelle (Pro):
invoiceS3Key: text('invoice_s3_key'),        // Key in sitzraum-exports
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
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Stellt sicher: pro Organization ist jede E-Mail-Adresse nur einmal vorhanden
  uniqueEmailPerOrg: unique().on(table.organizationId, table.email),
}));

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(), // für org-weite Kalenderansicht im Studio-Plan
  coachId: text('coach_id').notNull(),               // der Coach, der die Sitzung hält
  clientId: uuid('client_id').references(() => clients.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  status: text('status')
    .$type<'pending' | 'confirmed' | 'completed' | 'cancelled'>()
    .default('pending'),
  clientAccessToken: text('client_access_token'),
  clientTokenUsedAt: timestamp('client_token_used_at'),
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

export const reminderJobs = pgTable('reminder_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  type: text('type').$type<'24h' | '1h'>().notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  sentAt: timestamp('sent_at'),
});
```

---

## 12. E-Mail, Job-Queue & Stripe-Billing

### BullMQ Job-Queue

**BullMQ** (Redis-backed) verwaltet alle zeitbasierten und asynchronen Tasks:

- Nach Buchung: Jobs einplanen (`reminder-24h`, `reminder-1h`)
- Nach Sitzungsende: Job `transcribe-session` (wenn Einwilligung vorhanden)
- Job-Worker in NestJS (`@Processor`-Decorator)
- E-Mail-Versand via **Resend** (EU-Infrastruktur Frankfurt, zuverlässige Zustellraten, gute DX)

Claude Code kann die komplette BullMQ-Modul-Struktur inkl. Worker, Job-Definitionen und Whisper-Client aus einem einzigen Prompt generieren.

### Stripe – Subscription & Billing

Stripe wird für zwei Zwecke eingesetzt: **Einmalige Zahlungen** (z.B. Klient zahlt Sitzungshonorar, Pro-Feature) und **wiederkehrende Subscriptions** (Coach zahlt Sitzraum-Abo).

**Subscription-Modell:**

| Plan | Stripe Product | Billing |
|---|---|---|
| Trial | – | 14 Tage kostenlos, kein Stripe nötig |
| Solo | `sitzraum_solo` | monatlich / jährlich |
| Pro | `sitzraum_pro` | monatlich / jährlich |
| Studio | `sitzraum_studio` | monatlich / jährlich |

**Subscription-Flow (Coach):**

```
Coach wählt Plan im Backoffice
  → POST /api/v1/billing/checkout → erstellt Stripe Checkout Session
  → Coach wird zu Stripe Checkout weitergeleitet (gehostet, kein eigenes Zahlungsformular)
  → Nach Zahlung: Stripe sendet webhook checkout.session.completed
  → Backend aktiviert Plan in organizations.plan + organizations.plan_expires_at
  → Resend schickt Bestätigungs-E-Mail

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
  return_url: `https://app.sitzraum.de/settings/billing`,
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
- Upload ins S3-Bucket `sitzraum-backups` (privat, Hetzner DE)
- Aufbewahrung: 7 Tages-Backups, 4 Wochen-Backups, 3 Monats-Backups (GFS-Schema)
- Restore-Test monatlich in Staging-Umgebung

**Hetzner Object Storage (S3)**
- Hetzner S3 ist intern redundant gespeichert – kein manuelles Backup nötig
- Für kritische Daten (Rechnungen): zusätzliche Kopie in separatem Bucket `sitzraum-backups`

**Redis**
- Nur Job-Queue und Session-Daten – kein persistentes Backup nötig
- Sessions sind kurzlebig, Jobs werden bei Neustart neu verarbeitet (BullMQ `removeOnComplete`)

**Docker Volumes**
- Whisper-Modelle sind reproduzierbar (Download beim ersten Start) – kein Backup nötig
- `pgdata`-Volume wird durch pg_dump abgedeckt

**Monitoring**
- Backup-Job schreibt Ergebnis (Erfolg / Dateigröße) in eine `backup_logs`-Tabelle
- Fehlgeschlagene Backups lösen Alarm per E-Mail aus (Resend)

---

## 14. MVP-Entwicklungsreihenfolge

| Phase | Features | Claude Code Hauptaufgabe |
|---|---|---|
| **1 – Fundament** | Docker Compose Setup, DB-Schema, Basis-Auth | Monorepo-Setup, Drizzle-Schema, Docker-Config |
| **2 – Auth & Profil** | Registrierung, Login, Subdomain-Setup, Branding | better-auth Integration, Coach-Modul |
| **3 – Buchung** | Verfügbarkeiten, Buchungsseite, E-Mail-Bestätigung | Booking-Modul, Availability-Logik, E-Mail-Templates |
| **4 – Videocall** | Warteraum, LiveKit-Integration, Call-UI | LiveKit-Service, Token-Generierung, Vue-Composable |
| **5 – Nachbereitung** | Notizen, Session-Abschluss, Klienten-Weiterleitung | Notes-Modul, Session-State |
| **6 – Speech2Text** | Whisper-Transkription, Klienten-Einwilligung, Transkript-Ansicht | Whisper-Service, BullMQ-Job, Consent-Flow, Transkript-UI |
| **7 – CRM** | Klientenliste, Sitzungshistorie | Client-Modul, Dashboard-Queries |
| **8 – Billing** | Stripe Subscription, Billing Portal, Plan-Enforcement | Stripe-Webhook-Handler, organizationBilling-Schema |
| **9 – Pro-Features** | Rechnungsstellung, Google Calendar | Rechnung-PDF → S3, Calendar-Integration |

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
| 01 | **Subdomain-Modell Studio** | Beim Studio-Plan: teilen alle Coaches dieselbe Subdomain (`studio.sitzraum.de`) oder bekommt jeder Coach eine eigene? Auswirkung auf Buchungsseite, Warteraum-Branding und Routing. | Vor Studio-Launch klären |

---

## 17. Sicherheit & DSGVO

- **Server ausschließlich Hetzner Deutschland** (Nürnberg / Falkenstein)
- **LiveKit self-hosted** auf demselben Hetzner-Projekt → Mediendaten verlassen nie Deutschland
- **Whisper self-hosted** → Audiodaten und Transkripte bleiben auf Hetzner
- **Hetzner Object Storage** → alle Dateien (Logos, Recordings, Exports) in Deutschland, kein US-Cloudanbieter
- **Resend EU-Region** → E-Mail-Versand vollständig in der EU
- **Stripe** mit EU-Entities und SCCs → DSGVO-konform für Zahlungsdaten
- better-auth HttpOnly Cookies, kein Token in LocalStorage
- Klienten-Buchungstoken: HMAC-signiert, TTL, einmalig verwendbar
- Kein Logging von E-Mail-Adressen oder Namen in Application Logs (nur IDs)
- AVV automatisch bei Registrierung abgeschlossen
- DSGVO-Löschfunktion: Cascade-Delete Coach → alle verknüpften Daten via Drizzle `onDelete: 'cascade'`
- Audioaufnahme / Transkription: aktive Klienten-Einwilligung pro Sitzung, dokumentiert mit Timestamp, IP und Version
- Audio-Recordings werden nach erfolgreicher Transkription automatisch aus S3 gelöscht
- PDF-Rechnungen und Datenexporte nur via signierte URLs mit kurzer TTL abrufbar