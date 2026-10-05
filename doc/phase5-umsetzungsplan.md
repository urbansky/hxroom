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

Die **Betriebs-Instanz** ist eine eigene Hetzner-Instanz (4 GB RAM) neben dem Produktivserver. Sie überwacht HxRoom und weitere Apps von hxcode, deshalb laufen ihre Dienste unter `hxcode.io`: Beszel unter `status.hxcode.io`, GlitchTip unter `errors.hxcode.io`. Ihre Konfiguration liegt im HxRoom-Repo unter `infra-status/`.

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

**Stand:** umgesetzt und lokal abgenommen. Offen ist die Inbetriebnahme auf der Betriebs-Instanz und in Produktion. Wie die Fehlerüberwachung arbeitet, beschreibt `technisches-konzept.md` §17.

**Umgesetzt:**

- **Betriebs-Instanz** (`infra-status/`): GlitchTip 6.2 im All-in-one-Modus (ein Container für Web, Worker und Migrationen, Valkey abgeschaltet) mit eigener PostgreSQL-Datenbank, Caddy-Block `errors.hxcode.io`, Vorlage `infra-status/.env.example`. Registrierung und Anlegen weiterer Organisationen sind abgeschaltet, Ereignisse werden 90 Tage aufbewahrt. Lokal braucht GlitchTip samt Datenbank rund 255 MB RAM.
- **Gemeinsame Bereinigung** (`packages/shared/src/monitoring.ts`): `scrubSensitiveText`, `scrubSensitiveData`, `sanitizeMonitoringEvent` und die Liste der abgeschalteten Browser-Integrationen. API, Tunnel und beide Frontends nutzen dieselbe Regel.
- **API:**
  - `src/instrument.ts` (als erstes Modul in `main.ts`) und `SentryGlobalFilter` in `app.module.ts`
  - `src/monitoring/`: Tunnel `POST /api/v1/monitoring` und der Testfehler `POST /api/v1/monitoring/test-error` (nur Betreiber)
  - Tests in `monitoring-tunnel.spec.ts`
- **Coach-App** (`app/plugins/monitoring.client.ts`) und **Klientenseite** (`src/monitoring.ts`): `@sentry/vue` mit Tunnel. `?monitoring-test=1` löst nach dem Laden einen Testfehler aus.
- **Source Maps:** `@sentry/bundler-plugins` in `vite.config.ts` bzw. `nuxt.config.ts`. Das Token kommt als BuildKit-Secret in den Docker-Build, die CI reicht DSN und Release (Commit) als Build-Argumente durch.
- **Konfiguration:** `SENTRY_DSN`, `SENTRY_TUNNEL_DSNS` in `infra/docker-compose.yml` und `infra/.env.example`.

**Lokal abgenommen** (GlitchTip-Container, Dev-API, beide Frontends, Chrome):
- **Testfehler der API:** Er kommt an, Token in URL und Query als `[Filtered]`. Vom Request bleiben nur Methode, URL und User-Agent. Kein Cookie, kein weiterer Header, kein Benutzer, keine lokalen Variablen.
- **Nicht gemeldet:** ein 401 und Warnungen beim Start.
- **Tunnel:** Er reicht ein erlaubtes Projekt weiter, weist ein fremdes mit 403 ab, und nach 60 Meldungen pro Minute und Absender antwortet er mit 429.
- **Testfehler beider Frontends:**
  - Sie kommen an, mit `token=[Filtered]` und User-Agent.
  - Der Browser spricht nur mit der eigenen Seite und der API.
  - Schon die Meldung im Tunnel enthält den Token nicht mehr.
- **Source Maps:**
  - Ein Fehler aus dem gebauten Bundle erscheint als `src/monitoring.ts`, Zeile 44, mit Quelltextzeile.
  - Im Build und im Docker-Image liegt keine `.map`-Datei, das Token steht nicht in der Image-History.
  - Ohne Token baut alles wie bisher.

**Inbetriebnahme:**

*Betriebs-Instanz:*
1. ✅ Standort prüfen (Falkenstein oder Nürnberg) und den A-Eintrag `errors.hxcode.io` auf die Instanz setzen.
2. ✅ Repo dort aktualisieren und `infra-status/.env` aus der Vorlage anlegen: `GLITCHTIP_SECRET_KEY`, `GLITCHTIP_DB_PASSWORD`, Brevo-SMTP als `GLITCHTIP_EMAIL_URL` (Login und SMTP-Schlüssel, nicht der API-Schlüssel), `GLITCHTIP_FROM_EMAIL` als in Brevo bestätigter Absender.
3. ✅ In `infra-status/`: `docker compose up -d`. Caddy holt das Zertifikat für `errors.hxcode.io` selbst.
4. ✅ Konto anlegen: `docker compose exec glitchtip ./manage.py createsuperuser`. Danach auf `errors.hxcode.io` anmelden und die Zwei-Faktor-Anmeldung einschalten.
5. ✅ Organisation **HxRoom** mit dem Kürzel **`hxroom`** anlegen. Die erste Organisation ist auch bei abgeschaltetem Anlegen erlaubt. Weitere Organisationen für andere Apps: `ENABLE_ORGANIZATION_CREATION` kurz auf `true` setzen.
6. ✅ Drei Projekte mit genau diesen Kürzeln: **`hxroom-api`**, **`hxroom-coach`**, **`hxroom-bookingpage`**. Das Source-Map-Plugin verwendet die Kürzel. Je Projekt eine Alarmregel „neues Problem → Mail“.
7. ✅ Unter Profil → Auth Tokens ein Token mit `project:read`, `project:releases`, `org:read` anlegen.

*GitHub (Repository → Settings → Secrets and variables → Actions):*
- Secret `SENTRY_AUTH_TOKEN`: das Token aus Schritt 7
- Variablen `SENTRY_DSN_COACH` und `SENTRY_DSN_BOOKINGPAGE`: die DSNs der beiden Frontend-Projekte

*Produktion (`infra/.env`):*
- `SENTRY_DSN`: DSN von `hxroom-api`
- `SENTRY_TUNNEL_DSNS`: DSN von `hxroom-coach` und `hxroom-bookingpage`, kommagetrennt
- danach Push, die CI baut mit DSN und Source Maps, dann `./redeploy.sh`

*Abnahme in Produktion:*
- **API:** Im Betreiber-Backoffice in der Browser-Konsole `fetch('https://admin-api.hxroom.de/api/v1/monitoring/test-error', { method: 'POST', credentials: 'include' })` ausführen. Der Fehler erscheint in `hxroom-api`, die Alarm-Mail kommt an.
- **Coach-App:** `https://app.hxroom.de/?monitoring-test=1`.
- **Klientenseite:** `https://demo.hxroom.de/?monitoring-test=1`.
- **Je Frontend:** Der Fehler erscheint lesbar (Quelldatei und Zeile). In der Netzwerkansicht stehen nur Anfragen an die eigene Seite und `api.hxroom.de`. Mit eingeschaltetem uBlock Origin kommt der Fehler trotzdem an.
