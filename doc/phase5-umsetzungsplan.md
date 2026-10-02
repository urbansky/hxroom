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

**Stand:** umgesetzt und lokal abgenommen. Offen ist die Inbetriebnahme auf dem Server. Aufbau, Ablauf und Wiederherstellung beschreibt `technisches-konzept.md` §13.

**Umgesetzt:**

```
infra/backup/
  Dockerfile        # alpine 3.22: pg_dump 17, rclone, age, supercronic
  crontab           # 03:00 Datenbank, 03:30 Dateien
  lib.sh            # Logging, rclone-Zugänge, Checkly-Ping, Fehler-Mail über Brevo
  backup-db.sh      # pg_dump (Custom-Format) → age → db/daily, Kopien weekly/monthly, Aufräumen
  sync-files.sh     # rclone sync mit Papierkorb, Papierkorb nach 30 Tagen leeren
  restore-db.sh     # Stand laden, entschlüsseln, in eine leere Datenbank einspielen
```

- `infra/docker-compose.yml`: Dienst `backup` mit `build: ./backup`
- `infra/docker-compose.dev.yml`: derselbe Dienst hinter dem Profil `backup`, gegen RustFS mit dem zweiten Bucket `hxroom-backup`
- `infra/.env.example`: `BACKUP_S3_*`, `BACKUP_AGE_RECIPIENTS`, `CHECKLY_HEARTBEAT_DB`/`_FILES`, `BACKUP_ALERT_EMAIL`
- `infra/redeploy.sh` baut `caddy` und `backup` gezielt neu. `pull` erneuert gebaute Dienste nicht, und `up -d --build` würde auch alle Apps aus dem Quelltext bauen, weil sie ebenfalls einen build-Abschnitt haben.

**Lokal abgenommen** (RustFS, Testskript mit 15 Prüfungen, dazu Einzelprüfungen):
- Datenbank-Backup und Datei-Spiegelung laufen durch (656 Dateien).
- Eine im Original gelöschte Datei liegt danach im Papierkorb und nicht mehr in `files/current`.
- Das Aufräumen entfernt genau die Stände jenseits der Frist, in allen drei Ordnern und im Papierkorb.
- Wochen- und Monatskopie entstehen sonntags bzw. am Monatsersten (geprüft mit vorgestellter Uhr).
- Die Wiederherstellung in eine frische Datenbank ergibt in allen 17 Tabellen dieselbe Zeilenzahl.
- Das Einspielen in eine nicht leere Datenbank wird verweigert.
- Ein falsches Datenbank-Passwort bricht mit Status 1 ab und hinterlässt kein halbes Objekt.
- `supercronic` startet und liest die Crontab.
- `shellcheck` ist sauber.

Die Fehler-Mail über Brevo und der Checkly-Ping sind lokal nur bis zum Aufruf geprüft, weil keine Zugänge gesetzt waren. Beides wird auf dem Server abgenommen.

**Inbetriebnahme auf dem Server:**

*Betreiber:*
1. Eigenes Hetzner-Projekt mit privatem **Bucket `hxroom-backup` in Nürnberg (`nbg1`), mit Object Lock angelegt** ✅
2. In diesem Projekt **S3-Credentials** erzeugen.
3. **Sperrfrist und Lifecycle setzen** ✅ (MinIO-Client, Alias `hb` auf das Backup-Projekt):
   ```bash
   mc retention set --default COMPLIANCE 30d hb/hxroom-backup
   mc ilm rule add --noncurrent-expire-days 30 hb/hxroom-backup
   # prüfen
   mc retention info --default hb/hxroom-backup
   mc ilm rule ls hb/hxroom-backup
   ```
   Die Frist im Modus Compliance lässt sich nicht verkürzen. Vor dem Absenden auf `30d` (Tage, nicht Jahre) achten.
4. **`age`-Schlüssel** ✅ auf dem eigenen Rechner erzeugen: `age-keygen -o hxroom-backup.key`. Den Inhalt der Datei (geheimer Schlüssel) in den Passwortmanager legen und die Datei löschen. Die Zeile „public key: age1…“ ist der öffentliche Teil.
5. **Checkly:** ✅ zwei Heartbeat-Monitore („HxRoom DB-Backup“, „HxRoom Datei-Backup“), Periode 1 Tag, Karenzzeit 2 h, Alarm per Mail. Die beiden Ping-URLs notieren.
6. ✅ In `infra/.env` auf dem Server eintragen: `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY`, `BACKUP_AGE_RECIPIENTS` (öffentlicher Teil), `CHECKLY_HEARTBEAT_DB`, `CHECKLY_HEARTBEAT_FILES`, `BACKUP_ALERT_EMAIL`. Die übrigen `BACKUP_*`-Werte aus `.env.example` passen für `nbg1`.
7. ✅ In Beszel einen Plattenalarm setzen (etwa 80 %), falls noch nicht vorhanden.

*Auf dem Server (in `infra/`):*
1. ✅ Repo aktualisieren, damit `infra/backup/` dort liegt (`redeploy.sh` holt nur Images, keinen Quelltext).
2. ✅ `./redeploy.sh`. Das baut und startet den Dienst `backup`.
3. ✅ Einmal von Hand auslösen: `docker compose run --rm backup backup-db.sh` und `… sync-files.sh`. Erwartet: „Fertig“, „Heartbeat gesendet“, beide Checkly-Monitore grün.
4. ✅ Fehlerfall einmal auslösen: `docker compose run --rm -e POSTGRES_PASSWORD=falsch backup backup-db.sh`. Erwartet: die Fehler-Mail kommt an.

*Abnahme:*
- Am nächsten Morgen liegen die Stände der Nacht im Bucket, die Checkly-Monitore sind grün.
- **Object Lock:** Ein von Hand gelöschter Stand (`rclone deletefile`) verschwindet aus der Ansicht, die Version bleibt erhalten (`mc ls --versions hb/hxroom-backup/db/daily/`). Die Skripte melden trotz Sperre „Fertig“. Das ist lokal nicht prüfbar, weil RustFS Object Lock nicht sicher beherrscht.
- ✅ **Wiederherstellungstest** nach §13 mit dem echten Stand, auf einer fremden Maschine: Die Zeilenzahlen stimmen mit der Produktion überein. Erst danach gilt das Backup als funktionierend.

*Danach:* §16 Punkt 03 als erledigt markieren, den Stand-Vermerk in §13 auf „aktiv“ setzen.

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
