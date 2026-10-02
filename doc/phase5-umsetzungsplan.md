# Phase 5 – Umsetzungsplan

*Umfang von Phase 5 siehe `zeitplan.md`. Technische Grundlage ist `technisches-konzept.md` (§13 Backup, §16 offene Punkte, §17 Sicherheit & DSGVO).*

## Ziel

Nach Phase 5 beginnt das Marketing. Interessierte Coaches buchen eine Produktvorführung auf `demo.hxroom.de`, probieren HxRoom danach selbst als Coach aus und geben Feedback. Beta-Tester arbeiten dabei mit echten Klienten. **Zieltermin: 01.11.2026.**

## Reihenfolge

Phase 5 läuft in zwei Etappen. Für die Vorführungen genügt ein Teil der Punkte, sie können deshalb vor dem Ende der Phase beginnen. Weil schon Vorführ-Buchungen echte Personendaten sind, stehen Backup und Rechtliches vorn.

**Etappe A – vorführbereit (Ziel ~15.10.2026)**

1. Backup und Fehlerüberwachung
2. Erinnerungsmails 24 h / 1 h vor dem Termin
3. Buchungsseite vollständig, samt Impressum und Datenschutzerklärung in den Einstellungen des Coachs
4. `demo.hxroom.de` einrichten, Knopf „Vorführung buchen“ auf der Landingpage. Danach sind Vorführungen möglich.

**Etappe B – Beta-Coaches (Ziel 01.11.2026)**

5. AGB und AVV bei der Registrierung, Datenschutz-Kasten im Warteraum
6. Probe-Sitzung mit sich selbst, Onboarding-Checkliste, „Kommt bald“-Seiten ausblenden
7. Feedback-Knopf, Aktivität der Coaches im Betreiber-Backoffice
8. Terminseite, breitere Klientenseite, Abschlusskarte

**Wenn die Zeit nicht reicht:** Schritt 8, die Backoffice-Aktivität (übergangsweise per SQL) und die überarbeitete Onboarding-Checkliste können nach dem Beta-Start kommen. Vor dem 01.11. unverzichtbar sind Backup, Fehlerüberwachung, Rechtstexte, Buchungsseite, Erinnerungen, Probe-Sitzung und Feedback-Knopf.

**Außerhalb des Codes:** Die Rechtstexte (Impressum- und Datenschutz-Vorlage für Coaches, AGB, AVV) liefert der Betreiber. Sie haben Vorlauf und sollten früh angestoßen werden.

---

## Schritt 1 · Backup und Fehlerüberwachung

Zwei Teile mit je eigener Abnahme und eigenem Commit: erst **1a Backup**, dann **1b Fehlerüberwachung**.

### Überwachung im Überblick

| Ebene | Werkzeug |
|---|---|
| Server: CPU, RAM, Platte, Netz, Container, Erreichbarkeit des Servers | **Beszel** (vorhanden). Der Hub läuft auf der Betriebs-Instanz und meldet damit auch einen Ausfall des ganzen Servers. Ein Plattenalarm (etwa bei 80 %) deckt „Platte voll“ ab. |
| Backup-Läufe | **Checkly-Heartbeat** meldet, wenn ein Lauf ausbleibt. Fehler meldet das Skript sofort per Mail über Brevo, denn Checkly kennt nur Erfolgsmeldungen. |
| Fehler in API und Oberflächen | **GlitchTip** auf der Betriebs-Instanz (1b) |

Die **Betriebs-Instanz** ist eine eigene Hetzner-Instanz (4 GB RAM) neben dem Produktivserver. Sie überwacht HxRoom und weitere Apps von hxcode, deshalb laufen ihre Dienste unter `hxcode.io`: Beszel unter `status.hxcode.io`, GlitchTip unter `errors.hxcode.io`. Ihre Konfiguration liegt nicht im HxRoom-Repo, sondern in einem eigenen Repo (z. B. `hxcode-ops`).

```
Browser (Coach-App, Klientenseite)
        │ Fehler über den Tunnel
        ▼
HxRoom-Server (Produktion)               Betriebs-Instanz (4 GB)
Caddy, Apps, API, LiveKit, Postgres      Beszel-Hub    status.hxcode.io
Beszel-Agent, backup (1a)  ──Fehler──▶  GlitchTip     errors.hxcode.io
        │
        ▼
Backup-Bucket (eigenes Hetzner-Projekt, Nürnberg) ◀── Wiederherstellungstest
```

### 1a · Backup

**Ausgangslage:** Nichts aus §13 ist umgesetzt. Die Datenbank (`postgres:17-alpine`, Volume `postgres_data`) liegt nur im Server-Backup von Hetzner. Das bleibt als zusätzliche Schicht, ersetzt den `pg_dump` aber nicht: gleiches Projekt, gleicher Standort, und eine Momentaufnahme des laufenden Servers ist für die Datenbank nicht garantiert konsistent. Die Dateien liegen in Hetzner Object Storage in Falkenstein (`fsn1`, Bucket `hxroom-files`) ohne jede Kopie.

**Aufbau:** Ein eigener Container `backup` im Compose-Stack mit `postgresql17-client` (passend zum Server), `rclone`, `age`, `curl` und `supercronic`. Die API bleibt unberührt, und ein Deploy unterbricht keinen laufenden Backup-Lauf.

**Ablage:**

```
infra/backup/
  Dockerfile
  crontab           # 03:00 Datenbank, 03:30 Dateien
  lib.sh            # Logging, Checkly-Ping, Fehler-Mail über Brevo
  backup-db.sh      # pg_dump → gzip → age → db/daily, Kopien weekly/monthly, Aufräumen
  sync-files.sh     # rclone sync mit Papierkorb, Papierkorb nach 30 Tagen leeren
  restore-db.sh     # Stand laden, entschlüsseln, in eine frische Datenbank einspielen
```

- `infra/docker-compose.yml`: Dienst `backup` mit `build: ./backup`, auf dem Server gebaut wie Caddy
- `infra/docker-compose.dev.yml`: derselbe Dienst hinter dem Profil `backup`, gegen RustFS mit einem zweiten Bucket
- `infra/.env.example`: Zugang zum Backup-Bucket, öffentlicher `age`-Schlüssel, Checkly-Ping-URLs, Empfänger der Fehler-Mail
- `infra/redeploy.sh`: `up -d --build`, weil `pull` gebaute Dienste nicht erneuert. Ohne das kämen geänderte Skripte (und Änderungen an Caddy) nie auf dem Server an.

**Ablauf jede Nacht:**

1. **03:00 Datenbank:** `pg_dump`, komprimiert und mit `age` verschlüsselt, geht in den Backup-Bucket unter `db/daily/`. Sonntags kommt eine Kopie nach `db/weekly/`, am Monatsersten nach `db/monthly/`. Aufbewahrt werden 7 Tage, 4 Wochen und 3 Monate.
2. **03:30 Dateien:** Spiegelung in denselben Backup-Bucket unter `files/current/`. Was im Original gelöscht wurde, liegt 30 Tage unter `files/deleted/<Datum>/` (`rclone sync --backup-dir`) und wird dann entfernt. Ein versehentliches Löschen lässt sich so rückgängig machen, gewollt Gelöschtes ist nach 30 Tagen weg.
3. **Meldung:** Nach Erfolg ein Ping an den Checkly-Heartbeat des Laufs, bei Fehler sofort eine Mail über die Brevo-API.

**Wiederherstellung:** `restore-db.sh` lädt einen Stand, entschlüsselt ihn und spielt ihn in eine frische Datenbank ein. Der Test läuft auf der Betriebs-Instanz, nicht auf dem Produktivserver. Er beweist damit zugleich, dass sich das Backup auf einer fremden Maschine zurückspielen lässt. Den geheimen `age`-Schlüssel gibt es dort nur für die Dauer des Tests. Erst nach diesem Test gilt das Backup als funktionierend.

**Vorbereitung durch den Betreiber** (Schritt-für-Schritt-Liste bei der Umsetzung):

- eigenes Hetzner-Projekt mit Bucket in **Nürnberg (`nbg1`)**: anderer Standort als das Original, aber in Deutschland. Optional Versionierung bzw. Object Lock einschalten, falls angeboten. Dann kann ein kompromittierter Produktivserver die Backups nicht löschen.
- `age`-Schlüsselpaar. Der geheime Teil kommt in den Passwortmanager, nicht auf den Server.
- Checkly-Konto mit je einem Heartbeat-Monitor für Datenbank und Dateien (täglich, Karenzzeit etwa 1 h)
- Plattenalarm in Beszel, falls noch nicht eingestellt

**Abnahme:**

- **Lokal** (RustFS, zweiter Bucket): Datenbank-Backup und Aufräumen laufen durch, die Dateien werden gespiegelt. Eine gelöschte Datei landet im Papierkorb. Ein absichtlich falsches Passwort löst die Fehler-Mail aus.
- **Wiederherstellung:** Ein Stand wird in eine frische Datenbank eingespielt und ergibt dieselbe Zeilenzahl pro Tabelle, erst lokal, dann auf der Betriebs-Instanz mit einem echten Produktionsstand.
- **Server:** Der erste nächtliche Lauf erscheint im Bucket, die Checkly-Heartbeats sind grün.

**Doku danach:**

- §13 beschreibt den Ist-Zustand.
- §16 Punkt 03 wird erledigt.
- Ein Betriebskapitel „Wiederherstellen“ kommt dazu.
- Für die Vorlage der Datenschutzerklärung wird festgehalten, dass gelöschte Daten bis zu drei Monate in den Backups bleiben.

### 1b · Fehlerüberwachung mit GlitchTip

GlitchTip ist ein Open-Source-Nachbau von Sentry und versteht dieselben SDKs.

**Betrieb auf der Betriebs-Instanz:**

- GlitchTip (Web und Worker) mit eigener PostgreSQL-Datenbank, davor ein Caddy für TLS, unter `errors.hxcode.io`. Konfiguration im Ops-Repo, nicht im HxRoom-Repo.
- Die Erreichbarkeitsprüfung von GlitchTip bleibt aus (`GLITCHTIP_ENABLE_UPTIME=false`), weil Beszel das abdeckt.
- HxRoom bekommt eine eigene Organisation mit je einem Projekt für API, Coach-App und Klientenseite. Andere Apps liegen in eigenen Organisationen und sehen die HxRoom-Daten nicht.
- Offene Registrierung und das Anlegen neuer Organisationen sind abgeschaltet, das Betreiber-Konto hat Zwei-Faktor-Anmeldung. Eine Mengenbegrenzung pro Projekt fängt massenhaft eingelieferten Müll ab. Der Schlüssel in der DSN ist kein Geheimnis, er erlaubt nur das Einliefern.
- Alarm per Mail über Brevo-SMTP.

**Einbindung in HxRoom:**

- **API:** `@sentry/nestjs`, sendet direkt an `errors.hxcode.io`.
- **Coach-App** (Nuxt-SDK) und **Klientenseite** (Vue-SDK) senden über einen **Tunnel**: Das SDK schickt seine Meldungen an einen Endpunkt der eigenen API (z. B. `POST /api/v1/monitoring`), die API reicht sie an GlitchTip weiter. Das hat drei Gründe:
  - Werbeblocker erkennen das Sentry-Muster `/api/<id>/envelope/` nicht.
  - Der Browser spricht weiterhin nur mit `api.hxroom.de`, die Klientenseite macht keine Drittanbieter-Requests (§17), und keine hxcode-Adresse wird sichtbar.
  - Die API filtert ein zweites Mal Tokens heraus, bevor etwas den Server verlässt.

  Der Endpunkt lässt nur Meldungen an die bekannten HxRoom-Projekte durch, mit eigener Mengenbegrenzung.
- **Vor dem Senden** werden in den SDKs Tokens aus allen URLs entfernt, denn die Call-Links tragen ihren Zugangsschlüssel im Query-String. Namen und E-Mail-Adressen werden nicht übertragen, nur IDs.
- **Source Maps** lädt die CI hoch (`.github/workflows/docker-build.yml`), damit Fehler aus dem gebauten Code lesbar sind.
- **Umgebungsvariablen:** die DSNs je App in `infra/.env.example` bzw. den App-Konfigurationen.

**Vorbereitung durch den Betreiber:**

- Standort der Betriebs-Instanz prüfen: Deutschland (Falkenstein oder Nürnberg)
- Ops-Repo anlegen und A-Eintrag `errors.hxcode.io` auf die Betriebs-Instanz
- Brevo-SMTP-Zugang für GlitchTip

**Abnahme:** je ein absichtlich ausgelöster Fehler in API, Coach-App und Klientenseite. Er erscheint in GlitchTip lesbar und ohne Token in der URL, und die Alarm-Mail kommt an. Im Browser zeigt die Netzwerkansicht nur Anfragen an `api.hxroom.de`. Mit eingeschaltetem Werbeblocker (uBlock Origin) kommt der Fehler trotzdem an.
