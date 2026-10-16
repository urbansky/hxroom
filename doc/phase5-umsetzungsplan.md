# Phase 5 – Umsetzungsplan

*Umfang von Phase 5 siehe `zeitplan.md`. Technische Grundlage ist `technisches-konzept.md` (§13 Backup, §16 offene Punkte, §17 Sicherheit & DSGVO).*

## Ziel

Nach Phase 5 beginnt das Marketing. Interessierte Coaches buchen eine Produktvorführung auf `demo.hxroom.de`, probieren HxRoom danach selbst als Coach aus und geben Feedback. Beta-Tester arbeiten dabei mit echten Klienten. **Zieltermin: 01.11.2026.**

## Reihenfolge

Phase 5 läuft in zwei Etappen. Für die Vorführungen genügt ein Teil der Punkte, sie können deshalb vor dem Ende der Phase beginnen. Weil schon Vorführ-Buchungen echte Personendaten sind, stehen Backup und Rechtliches vorn.

**Etappe A – vorführbereit (Ziel ~15.10.2026)**

1. ✅ Backup und Fehlerüberwachung
2. ✅ Erinnerungsmails 24 h / 1 h vor dem Termin
3. ✅ Buchungsseite vollständig: echte Inhalte des Coachs statt Platzhaltertexten
   - 3.1a ✅ Impressum des Coachs mit Buchungssperre
   - 3.1b ✅ gemeinsame Datenschutzerklärung für alle Seiten
4. ✅ `demo.hxroom.de` einrichten. Danach sind Vorführungen möglich. Den Knopf „Vorführung buchen“ auf der Landingpage bringt Schritt 9.

**Etappe B – Beta-Coaches (Ziel 01.11.2026)**

5. AGB und AVV bei der Registrierung, Datenschutz-Kasten im Warteraum
6. ✅ Probe-Sitzung mit sich selbst, Onboarding-Checkliste, „Kommt bald“-Seiten ausblenden
7. ✅ Feedback-Knopf, Aktivität der Coaches im Betreiber-Backoffice
8. Terminseite, breitere Klientenseite, Abschlusskarte
9. Landingpage inhaltlich und gestalterisch überarbeiten – geplant

**Wenn die Zeit nicht reicht:** Schritt 8, die Backoffice-Aktivität (übergangsweise per SQL) und die überarbeitete Onboarding-Checkliste können nach dem Beta-Start kommen. Vor dem 01.11. unverzichtbar sind Backup, Fehlerüberwachung, Rechtstexte, Buchungsseite, Erinnerungen, Probe-Sitzung, Feedback-Knopf und die überarbeitete Landingpage.

**Außerhalb des Codes:** AGB und AVV liefert der Betreiber, ebenso die Freigabe der neuen Abschnitte der Datenschutzerklärung (Schritt 3.1b). Sie haben Vorlauf und sollten früh angestoßen werden.

---

## Schritt 1 · Backup und Fehlerüberwachung ✅

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

**Stand:** ✅ in Betrieb und in Produktion abgenommen. Aufbau, Ablauf und Wiederherstellung beschreibt `technisches-konzept.md` §13.

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
- ✅ Am nächsten Morgen liegen die Stände der Nacht im Bucket, die Checkly-Monitore sind grün.
- ✅ **Object Lock:** Ein von Hand gelöschter Stand (`rclone deletefile`) verschwindet aus der Ansicht, die Version bleibt erhalten (`mc ls --versions hb/hxroom-backup/db/daily/`). Die Skripte melden trotz Sperre „Fertig“. Das ist lokal nicht prüfbar, weil RustFS Object Lock nicht sicher beherrscht.
- ✅ **Wiederherstellungstest** nach §13 mit dem echten Stand, auf einer fremden Maschine: Die Zeilenzahlen stimmen mit der Produktion überein. Erst danach gilt das Backup als funktionierend.

*Danach:* ✅ §16 Punkt 03 erledigt, §13 steht auf „aktiv“.

### 1b · Fehlerüberwachung mit GlitchTip

**Stand:** ✅ in Betrieb und in Produktion abgenommen. API, Coach-App und Klientenseite melden an `errors.hxcode.io`, die Frontends über den Tunnel, mit lesbaren Stacktraces aus den Source Maps. Wie die Fehlerüberwachung arbeitet, beschreibt `technisches-konzept.md` §17.

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

*GitHub (Repository → Settings → Secrets and variables → Actions):* ✅
- Secret `SENTRY_AUTH_TOKEN`: das Token aus Schritt 7
- Variablen `SENTRY_DSN_COACH` und `SENTRY_DSN_BOOKINGPAGE`: die DSNs der beiden Frontend-Projekte

*Produktion (`infra/.env`):* ✅
- `SENTRY_DSN`: DSN von `hxroom-api`
- `SENTRY_TUNNEL_DSNS`: DSN von `hxroom-coach` und `hxroom-bookingpage`, kommagetrennt
- danach Push, die CI baut mit DSN und Source Maps, dann `./redeploy.sh`

*Abnahme in Produktion:* ✅
- **API:** Im Betreiber-Backoffice in der Browser-Konsole `fetch('https://admin-api.hxroom.de/api/v1/monitoring/test-error', { method: 'POST', credentials: 'include' })` ausführen. Der Fehler erscheint in `hxroom-api`, die Alarm-Mail kommt an.
- **Coach-App:** `https://app.hxroom.de/?monitoring-test=1`.
- **Klientenseite:** `https://demo.hxroom.de/?monitoring-test=1`.
- **Je Frontend:** Der Fehler erscheint lesbar (Quelldatei und Zeile). In der Netzwerkansicht stehen nur Anfragen an die eigene Seite und `api.hxroom.de`. Mit eingeschaltetem uBlock Origin kommt der Fehler trotzdem an.

---

## Schritt 2 · Erinnerungsmails ✅

**Stand:** ✅ in Betrieb und in Produktion abgenommen. Wie die Erinnerungen arbeiten, beschreibt `technisches-konzept.md` §12 („Erinnerungsmails“).

**Umfang:** Der Klient bekommt 24 Stunden und 1 Stunde vor dem Termin eine Mail mit dem Warteraum-Link. Die 1-h-Erinnerung meldet den gerade geöffneten Warteraum. Keine Erinnerung an den Coach, feste Texte. Beides kann später über die Benachrichtigungs-Einstellungen (Funktionsliste 7.06) dazukommen.

**Umgesetzt:**

- `bookings/booking-reminders.ts`: Fälligkeitsregel `isReminderDue` (nur bestätigt, keine Spontan-Termine, Fenster mit Nachholgrenze, entfällt bei Bestätigung nach Fälligkeit), Tests in `booking-reminders.spec.ts`
- `bookings/booking-reminder.service.ts`: Lauf alle 5 Minuten, Beanspruchen per `UPDATE … RETURNING`, Freigabe bei gescheitertem Versand
- `mail/templates/client/booking-reminder.tsx`: eine Vorlage, zwei Varianten (`24h`, `1h`), Render-Tests in `templates.spec.ts`
- `bookings/booking-formatting.ts`: `formatTimeLabel`, `relativeDayLabel` („heute“, „morgen“, Datum nach Kalendertag in Berlin)
- Migration `0025`: Spalten `reminder_24h_sent_at`, `reminder_1h_sent_at` an `bookings`

**Lokal abgenommen** (Dev-API, Versand über Brevo an die Adresse des Betreibers):
- Von fünf Testterminen bekamen genau zwei eine Mail: 24 h vorher (vor drei Tagen bestätigt) die 24-h-Erinnerung, 55 Minuten vorher die 1-h-Erinnerung.
- Keine Mail ging an den kurzfristig bestätigten Termin, den Spontan-Termin und den abgesagten.
- Als Brevo zunächst ablehnte (IP nicht freigegeben), wurden die Vermerke freigegeben und beim nächsten Lauf beide Mails nachgeholt. Ein weiterer Lauf hat nichts doppelt verschickt.

**Inbetriebnahme:** Push und `./redeploy.sh`. Die Migration läuft beim Start der API. Danach bekommen alle bestätigten Termine der nächsten 24 Stunden ihre Erinnerungen, soweit sie vor dem Fälligkeitszeitpunkt bestätigt wurden.

**Abnahme in Produktion:** Eine Vorführung auf `demo.hxroom.de` für den nächsten Tag buchen und bestätigen. Die 24-h-Erinnerung kommt etwa 24 Stunden vorher, die 1-h-Erinnerung beim Öffnen des Warteraums, beide mit funktionierendem Link.

---

## Schritt 3 · Buchungsseite vollständig ✅

**Stand:** ✅ in Betrieb, auf `demo.hxroom.de` auf Handy und Rechner abgenommen.

**Ausgangslage:** Die Buchungsseite zeigt für jeden Coach dieselben Platzhalter:
- **Kopfbereich:** Titel, Ortszeile, Überschrift samt Text, Kennzahlen (Sitzungen, Bewertung), das Abzeichen „Verifiziert“, die Versprechen „DSGVO-konform“ und „Erstgespräch kostenlos“, ein Beispielfoto als Ersatz
- **„Über mich“:** Zitat, Vorstellungstext und Qualifikationen eines Beispiel-Coachs
- **Fußzeile:** Datenschutz, Impressum und AGB ohne Ziel, dazu „DSGVO-konform“

Der Coach pflegt in den Einstellungen bereits Name, Foto, Tagline, „Über mich“, Button-Text und Einleitung zum Button. Der öffentliche Endpunkt liefert davon nur Name und Foto.

**Inhaltsmodell:**

| Auf der Seite | Quelle |
|---|---|
| Überschrift im Kopfbereich | Tagline (vorhanden) |
| Text unter der Überschrift | Einleitung (`ctaIntro`, vorhanden) |
| Beide Buchungs-Buttons | Button-Text (vorhanden) |
| Titel auf der Profilkarte | **Berufsbezeichnung** (neu, z. B. „Systemischer Coach“) |
| Schlagworte auf der Profilkarte | **Schwerpunkte** (neu, bis zu 6) |
| „Über mich“-Text | Über mich (vorhanden) |
| Zitat | **Zitat** (neu, optional) |
| Qualifikationen | **Qualifikationen** (neu, Liste, optional) |
| Foto | Profilfoto (vorhanden). Ohne Foto die Initiale statt des Beispielbilds. |

- **Entfällt:** Kennzahlen, „Verifiziert“ und die Ortszeile. Bewertungen und eine Prüfung der Coachs gibt es nicht.
- **Versprechen:** nur belegbare Fakten: „Kein Konto nötig“, „Videogespräch im Browser“, „Server in Deutschland“. Aus der Fußzeile verschwindet „DSGVO-konform“.
- **Leere optionale Felder** werden ausgeblendet, nie durch Beispieltext ersetzt.
- **Fußzeile:** Die Links auf Impressum, Datenschutz und AGB bleiben bis Schritt 3.1 ausgeblendet.

**Umgesetzt:**
- **Schema:** Migration `0026` mit den Spalten `job_title`, `topics` (Liste, bis 6 Schlagworte), `quote`, `qualifications` (Liste, bis 8 Einträge) an `booking_page`. Die Grenzen stehen in `bookingPageSchema`.
- **API:**
  - `PATCH /booking-page` speichert die neuen Felder.
  - `GET /organizations/:slug` liefert über `OrganizationService.findPublicProfile` das gepflegte Profil, `deletionScheduledFor` nicht mehr.
- **Coach-App** (Einstellungen → Buchungsseite):
  - „Profil“ hat jetzt auch Berufsbezeichnung und Schwerpunkte (als Schlagworte).
  - Neuer Bereich „Über mich“ mit Text, Zitat und Qualifikationen (eine pro Zeile).
  - Die Vorschau rendert dieselben Komponenten wie die Buchungsseite (`packages/ui/components/booking-page/`), aus dem Formular und damit schon beim Tippen. Sie ist nicht bedienbar (`inert`) und scrollt in ihrem Rahmen.
  - Von den geplanten Funktionen fallen „Subdomain“ und „Schwerpunkte“ weg.
  - Der Autosave hält fest, was er abgeschickt hat. Was während des Speicherns schon ins nächste Feld getippt wurde, geht so nicht verloren.
- **Klientenseite:**
  - Die Tagline ist die Überschrift, ohne Tagline der Name. Lange Taglines werden kleiner gesetzt.
  - Die Einleitung steht darunter, beide Buttons tragen den Button-Text, Standard ist „Termin buchen“.
  - Das Profilfoto (immer quadratisch) steht rund in der Mitte des Bildkopfs, ohne Foto an derselben Stelle die Initiale.
  - Angebotsseite: Berufsbezeichnung unter dem Namen, Button oben rechts mit dem Button-Text, Zeitzone beim gewählten Tag als MEZ bzw. MESZ, gewählter Kalendertag deutlich hervorgehoben.
  - „Über mich“ samt Sprungmarke und „Mehr erfahren“ erscheint nur mit Inhalt, auch auf der Angebotsseite (`hasBookingPageAbout`).
  - Leerzeilen im Text trennen Absätze. Vom Coach mitgetippte Anführungszeichen am Zitat entfallen.
- **Seed:** Anna mit allen Feldern, Martina mit Berufsbezeichnung und zwei Schwerpunkten, Tobias ohne Buchungsseite

**Lokal abgenommen** (Dev-Umgebung, Chrome, 1280 px und 390 px):
- Anna: Alle Felder erscheinen an ihrer Stelle, kein Platzhaltertext.
- Tobias ohne Buchungsseite: Name als Überschrift, Initiale statt Foto, kein „Über mich“, keine Sprungmarke, keine Lücken.
- Tobias über die Einstellungen befüllt: sieben Speichervorgänge kommen an, die Werte überstehen das Neuladen. Leere Zeilen in den Qualifikationen fallen weg, die lange Tagline bricht auf dem Handy sauber um.
- Martina (Löschung läuft) antwortet weiter mit 404.

**Inbetriebnahme:** Push und `./redeploy.sh`. Die Migration läuft beim Start der API.

**Abnahme in Produktion:** ✅ Auf `demo.hxroom.de` mit den eigenen Inhalten auf Handy und Rechner geprüft, ohne Fehler in der Konsole.

---

## Schritt 3.1 · Impressum und Datenschutzerklärung ✅

**Stand:** ✅ 3.1a und 3.1b in Betrieb und abgenommen. Grundlage ist `legal.md` (§3 Impressum, §4 Datenschutzerklärung). Wie Impressum und Sperre arbeiten, beschreibt `technisches-konzept.md` §6.

**Ziel:**
- **Impressum:** Jede Buchungsseite hat unter `/impressum` die Angaben des Coachs und einen Block zu HxRoom als technischem Betreiber.
- **Datenschutzerklärung:** Es gibt eine gemeinsame Erklärung für alle Personengruppen (Besucher von hxroom.de, Coachs, Klienten). hxroom.de, die Coach-App und die Buchungsseiten zeigen denselben Text. Auf der Buchungsseite unter `/datenschutz` ist der Coach automatisch als Verantwortlicher eingetragen.
- **Buchungssperre:** Ohne Impressum ist eine Buchungsseite zu sehen, aber nicht buchbar.
- **Links überall:** Die Fußzeile der Buchungsseite und die Mails an Klienten verlinken Impressum und Datenschutzerklärung der Buchungsseite.

Zwei Teile, jeweils mit eigener Abnahme und eigenem Commit. 3.1a hängt an keinem neuen Text und kann vorher live gehen.

### 3.1a · Impressum und Buchungssperre ✅

**Datenmodell:** neue Spalten an `booking_page`, Migration `0027`, Grenzen als Zod-Schema in `@hxroom/shared`

| Spalte | Inhalt |
|---|---|
| `imprint_mode` | `form`, `link` oder leer |
| `imprint` (JSON) | Pflicht: Name bzw. Firma, Straße, PLZ, Ort, Land, E-Mail, Telefon. Bei Unternehmen zusätzlich Rechtsform und Vertretungsberechtigte, bei UG, GmbH und PartG der Registereintrag. Falls vorhanden: USt-IdNr. oder Wirtschafts-ID. Freiwillig: Zusatz |
| `imprint_url` | Link auf das eigene Impressum |
| `imprint_confirmed_at` | Zeitpunkt der Bestätigung „Diese Angaben sind korrekt und vollständig“ |
| `privacy_url` | Link auf eine eigene, zusätzliche Datenschutzerklärung (optional) |
| `terms_url` | Link auf die eigenen AGB (optional, `legal.md` §5.2) |

„Impressum vollständig“ heißt: Die Pflichtfelder bzw. der Link sind gefüllt, und die Bestätigung liegt vor.

**API:**
- `GET` und `PUT /booking-page/legal`: ausdrückliches Speichern statt Autosave, damit die Bestätigung immer für genau einen gespeicherten Stand gilt. Ohne Bestätigung `400`, jedes Speichern setzt `imprint_confirmed_at` neu.
- Öffentlich: `GET /organizations/:slug/imprint` liefert die Angaben bzw. den Link. Das öffentliche Profil bekommt `bookable` sowie `privacyUrl` und `termsUrl`.
- **Sperre:** `BookingsService.create` lehnt ohne vollständiges Impressum mit `403 Bookings are not available for this coach yet` ab. Spontan-Termine, die der Coach selbst anlegt, bleiben erlaubt.

**Coach-App:**
- **Neue Seite `/settings/legal` („Rechtliches“).** Sie ersetzt `/settings/privacy`, der alte Pfad leitet weiter, der Menüpunkt heißt „Rechtliches“.
  - **Impressum:** Auswahl zwischen Formular und Link, Felder, Bestätigung, „Speichern“, „Vorschau ansehen ↗“.
  - **Datenschutzerklärung:** optionaler Link auf eine eigene Erklärung. Der Verweis auf die gemeinsame Erklärung kommt mit 3.1b.
  - **AGB:** optionaler Link auf die eigenen AGB.
  - **„Kommt bald“:** AVV und Löschanfragen bleiben vorerst als Kacheln. Der Generator für Datenschutztexte entfällt.
- **Hinweise, solange das Impressum fehlt:** oben auf der Seite „Buchungsseite“ („Ohne Impressum können Klienten noch nicht buchen → Rechtliches“) und als Schritt „Impressum hinterlegen“ in der Onboarding-Checkliste.

**Klientenseite:**
- **Route `/impressum`:** Block „Anbieter dieser Seite“ mit den Angaben des Coachs bzw. dem Link darauf, darunter der Block „Technischer Betrieb: HxRoom“.
- **Fußzeile** auf allen Seiten: „Impressum“, dazu „AGB“, wenn ein Link hinterlegt ist.
- **Ohne Impressum:** Hinweis „Buchungen sind bald möglich.“ statt der Buchungs-Buttons und auf der Angebotsseite statt des Kalenders. Die Seite selbst bleibt sichtbar.

**Mails an Klienten** (`mail/templates/client/*`): eine Fußzeile mit dem Link „Impressum“ auf die Buchungsseite des Coachs.

**Gemeinsamer Block zu HxRoom:** eine Komponente in `@hxroom/ui` mit den Angaben aus dem heutigen Impressum der Landingpage (Anbieter, Kontakt, inhaltlich Verantwortlicher), ohne den überholten Absatz „HxRoom ist in Entwicklung“. Die Landingpage nutzt sie unter `/impressum` ebenfalls, so stehen die Angaben nur an einer Stelle.

**Umgesetzt:** wie oben beschrieben, dazu:
- `LegalOperatorImprint` mit zwei Varianten: vollständig auf hxroom.de, auf der Buchungsseite nur Anbieter und Kontakt. Haftung und Streitbeilegung gehören zum Anbieter der Inhalte, auf der Buchungsseite also zum Coach.
- Stile der Rechtsseiten als `packages/ui/theme/legal.css`, aus dem Impressum der Landingpage übernommen
- Link „Impressum“ auch im Warteraum, der keine Fußzeile hat
- Formular mit den Regeln aus `bookingPageLegalSchema`, deutsche Fehlertexte; jede Änderung hebt die Bestätigung auf
- Formular kurz gehalten: erst „Als Einzelperson oder als Unternehmen?“, die Felder für Unternehmen erscheinen nur bei Bedarf. USt-IdNr. bzw. Wirtschafts-ID, Land und Zusatz sowie die eigenen Links liegen eingeklappt und öffnen sich, wenn darin etwas steht oder ein Fehler auftritt. Name und E-Mail sind aus Profil und Konto vorausgefüllt. Der Link auf ein eigenes Impressum ist eine Zeile unter dem Formular.
- Die jeweils andere Form (Angaben bzw. Link) bleibt beim Wechsel gespeichert, maßgeblich ist `imprint_mode`.
- Seed: Anna (Einzelunternehmen) und Martina (GmbH) mit Impressum, Tobias ohne
- Tests in `booking-page/legal.spec.ts` und `mail/templates/templates.spec.ts`

**Lokal abgenommen** (Dev-Umgebung, Chrome, Rechner und Handy):
- Anna: `/impressum` zeigt ihre Angaben und den Block zu HxRoom, die Fußzeile verlinkt dorthin, Buchen geht.
- Tobias ohne Impressum: Hinweis statt Buttons, die API lehnt eine Buchung mit `403` ab, `/impressum` meldet das fehlende Impressum. In der Coach-App zeigen Checkliste, Seite „Buchungsseite“ und deren Vorschau den Hinweis.
- Formular: Ohne Bestätigung und ohne Pflichtfelder wird nichts gesendet, ohne Telefon ebenso. Eine Änderung hebt das Häkchen auf. Nach dem Speichern ist Tobias buchbar.
- Wechsel auf Link mit AGB: `/impressum` zeigt den Link, die Fußzeile „AGB“. Die gespeicherten Angaben bleiben erhalten.
- `/settings/privacy` leitet auf `/settings/legal` weiter.
- hxroom.de/impressum sieht aus wie zuvor, ohne den Absatz „in Entwicklung“, auch im Produktions-Build.

### 3.1b · Gemeinsame Datenschutzerklärung ✅

**Text:** eine Komponente `LegalPrivacyPolicy` in `@hxroom/ui`, gegliedert nach Personengruppen:
1. **Allgemein und Besucher von hxroom.de:** die heutige Erklärung der Landingpage, unverändert übernommen (Verantwortlicher, Hosting und Server-Logs, Newsletter, Plausible, Schriften, Cookies, Rechte, Beschwerde, Drittland, keine automatisierte Entscheidung, Änderungen).
2. **Coachs (app.hxroom.de):** neu, als Entwurf. Konto und Anmeldung, Mails, Fehlerüberwachung, Backups, Löschung des Kontos.
3. **Klienten einer Buchungsseite:** neu, als Entwurf. Verantwortlich ist der jeweilige Coach, HxRoom verarbeitet im Auftrag. Inhalt:
   - Daten aus der Buchung
   - Bestätigungs- und Erinnerungsmails
   - Warteraum und Videocall ohne Aufzeichnung
   - Chat und Dateien samt Virenprüfung
   - Notizen des Coachs
   - Löschfristen und Unterauftragsverarbeiter
   - Verweis auf eine eigene Erklärung des Coachs, falls hinterlegt

   Auf der Buchungsseite setzt die Komponente Name und Kontakt des Coachs ein, auf hxroom.de steht „siehe Impressum der jeweiligen Buchungsseite“.

Die neuen Abschnitte folgen Stil und Aufbau des vorhandenen Textes, mit Karten für Zweck, Rechtsgrundlage und Speicherdauer. Inhaltlich halten sie sich an den tatsächlichen technischen Stand (`technisches-konzept.md` §12, §13, §17). Der Betreiber hat den Text freigegeben.

**Einbindung:**
- `/datenschutz` auf hxroom.de und auf der Buchungsseite
- Fußzeile der Buchungsseite und Mails an Klienten: zusätzlich „Datenschutz“
- „Rechtliches“ in der Coach-App: Verweis „So sieht sie aus“ auf die eigene Datenschutzerklärung
- Die Coach-App verlinkt wie bisher auf hxroom.de.

**Damit der Text stimmt, dazu umgesetzt:**
- **Klienten löschen** (Funktionsliste 7.04, Art. 17 DSGVO): `DELETE /api/v1/clients/:id`, auf der Klientenseite unter „Klient löschen“ mit Bestätigungsdialog.
  - Gelöscht werden der Klient, seine Termine samt Notizen, Chat und geteilten Dateien. Dazu gehören auch unbestätigte Anfragen derselben Organisation mit derselben E-Mail-Adresse, die keine `client_id` haben.
  - Die Dateien im Speicher werden nach dem Commit entfernt.
  - Anstehende Termine sperren die Löschung (`409`). Der Coach sagt sie zuerst ab, damit der Klient seine Absage-Mail bekommt.
  - Löschprotokoll in `client_deletions` (Migration `0028`): nur IDs und Anzahlen.
- **Server-Logs nach 14 Tagen gelöscht:** Alle Container schreiben ins Systemjournal (`logging: journald` in `infra/docker-compose.yml`). `infra/journald/hxroom.conf` begrenzt das Journal auf 14 Tage und 1 GB.

**Lokal abgenommen** (Dev-Umgebung, Chrome):
- hxroom.de/datenschutz und `anna.hxroom.localhost/datenschutz` zeigen alle 14 Abschnitte, auf der Buchungsseite mit Annas Angaben in Abschnitt 8, auf hxroom.de mit dem allgemeinen Verweis. Rechner und Handy, auch im Produktions-Build der Landingpage.
- Die Fußzeile der Buchungsseite verlinkt Impressum und Datenschutz.
- Klient mit anstehenden Terminen: Der Dialog erklärt die Sperre, die API antwortet `409`.
- Peter Lang (zwei vergangene Termine, dazu eine Notiz, eine Chatnachricht mit Datei und eine verfallene Anfrage ohne `client_id`): Nach dem Löschen sind Klient, alle drei Termine, Notiz, Nachricht, Dateieintrag und das Objekt im Speicher weg, das Protokoll steht. Peter als Klient von Martina bleibt unberührt.

### Abnahme im Browser

- **Anna ohne Impressum:** Die Seite zeigt den Hinweis statt der Buttons, die API lehnt eine Buchung mit `403` ab, die Checkliste zeigt den offenen Schritt.
- **Anna mit Formular:** `/impressum` zeigt beide Blöcke, Buchen geht wieder. **Mit Link:** Der Block verweist auf den Link.
- **Bestätigung:** Ohne Haken wird nicht gespeichert, eine Änderung setzt den Zeitpunkt neu. Ohne Telefon wird nicht gespeichert.
- **Ansichten:** Rechner und Handy. Die Fußzeile zeigt die Links auf allen Seiten der Buchungsseite, die Mails tragen sie ebenfalls.
- **Mit 3.1b:** `/datenschutz` zeigt Anna als Verantwortliche, hxroom.de den allgemeinen Verweis. Der Text ist auf allen Seiten derselbe.

### Inbetriebnahme

Sobald 3.1a ausgerollt ist, sind alle Buchungsseiten ohne Impressum gesperrt, auch `demo.hxroom.de`. Deshalb direkt nach dem Redeploy unter Einstellungen → Rechtliches das eigene Impressum eintragen.

Für 3.1b auf dem Server:
1. ✅ Vor dem Redeploy das Journal einrichten: `sudo mkdir -p /etc/systemd/journald.conf.d && sudo cp infra/journald/hxroom.conf /etc/systemd/journald.conf.d/ && sudo systemctl restart systemd-journald`. Prüfen mit `systemd-analyze cat-config systemd/journald.conf | grep MaxRetentionSec`.
2. ✅ `git pull` und `./redeploy.sh`. Weil sich bei allen Diensten der Log-Treiber ändert, erstellt `up -d` diesmal **alle** Container neu, auch LiveKit. Also außerhalb eines Termins ausführen. Die Migration `0028` läuft beim Start der API.
3. ✅ Prüfen: `docker compose logs --tail 20 api` zeigt Ausgaben, `journalctl -t hxroom/hxroom-api-1 -n 5` ebenso. Die alten Docker-Logdateien verschwinden mit den neu erstellten Containern.
4. ✅ `demo.hxroom.de/datenschutz` zeigt deine Angaben in Abschnitt 8, hxroom.de/datenschutz den neuen Text.

---

## Schritt 4 · Vorführ-Seite `demo.hxroom.de` ✅

**Stand:** ✅ eingerichtet. Vorführungen sind buchbar.

- **Konto:** gewöhnliches Coach-Konto des Betreibers mit der Subdomain `demo`
- **Angebot:** „Produktvorführung“, 20 Minuten, kostenlos
- **Inhalte:** Tagline, Einleitung, Button-Text „Vorführung buchen“, Berufsbezeichnung, Schwerpunkte (die gezeigten Funktionen), Zitat, „Über mich“ und Qualifikationen des Betreibers
- **Landingpage:** Der Knopf „Vorführung buchen“ auf `demo.hxroom.de` kommt mit Schritt 9.

**Impressum:** seit Schritt 3.1a in der Fußzeile verlinkt, mit den Angaben des Betreibers.

---

## Schritt 6 · Probe-Sitzung, Checkliste, „Kommt bald“ ausblenden ✅

**Stand:** ✅ 6a, 6b und 6c umgesetzt, lokal und in Produktion abgenommen.

**Ziel:** Ein Beta-Coach erlebt HxRoom in wenigen Minuten selbst und stößt nirgends auf Ankündigungen, die noch nichts tun. Drei Teile, jeweils mit eigener Abnahme und eigenem Commit.

### 6a · Probe-Sitzung mit sich selbst

Der Coach spielt beide Rollen: am Rechner als Coach, auf dem Handy als Klient. Technisch eine Variante des Spontan-Termins (`CoachBookingsService.createAdHoc`), ohne Klient und ohne Mail.

**Ablauf:**
1. „Probe-Sitzung“ auf dem Dashboard (neben „Spontan-Termin“) oder als Schritt der Checkliste.
2. Ein Fenster zeigt einen QR-Code und den Link zum Warteraum sowie den Hinweis, auf einem Gerät das Mikrofon stummzuschalten oder Kopfhörer zu nutzen (sonst Rückkopplung).
3. Mit dem Handy kommt der Coach als Klient in den Warteraum seiner Buchungsseite.
4. Am Rechner führt „Zum Gespräch“ auf die vorhandene Call-Seite. Dort lässt er sich selbst ein und kann Chat, Dateien, Notizen und Weichzeichner ausprobieren.

**Umsetzung:**
- **API:** `POST /api/v1/bookings/test-session`
  - Termin mit neuer Herkunft `test` (`BookingOrigin` in `@hxroom/shared`): sofort, 15 Minuten, bestätigt, „Probe-Sitzung“.
  - Name und E-Mail des Coachs stehen nur am Termin, es entsteht **kein Eintrag in der Klientenliste**. Es geht keine Mail hinaus.
  - Die Antwort enthält den Link zum Warteraum. Ohne Subdomain gibt es wie beim Spontan-Termin `409`.
- **Sichtbar** im Kalender und in der Agenda auf dem Dashboard, mit dem Abzeichen „Probe-Sitzung“. Über den Termin findet der Coach zurück in den Call.
- **Zählt nicht:** in der Wochenkennzahl des Dashboards, bei den Sitzungen in der Coach-Liste des Betreiber-Backoffices (`admin-coaches.service.ts`) und bei den Erinnerungsmails.
- **Merker** `booking_page.test_session_at`, gesetzt beim Einlassen. Die Checkliste liest ihn, er bleibt auch nach dem Aufräumen stehen.
- **Aufräumen:** Ein nächtlicher Lauf löscht Probe-Sitzungen 24 Stunden nach ihrem Ende, samt Notizen, Chat und Dateien im Speicher.
- **QR-Code** im Browser mit `uqr` (ohne weitere Abhängigkeiten, keine Anfrage an Dritte).

**Umgesetzt** wie beschrieben (Migration `0029`, `TestSessionModal.vue`, `TestSessionCleanupService` täglich um 04:00), dazu:
- **Keine Absage-Mail:** Sagt der Coach eine Probe-Sitzung ab, geht keine Mail hinaus. Er wäre selbst der Empfänger.
- **Termin-Detail:** zeigt statt „Klient zuordnen“ einen Hinweis auf die Probe-Sitzung.
- **Erste Buchung:** Die Terminliste der API kennt den Filter `origin`. Die Checkliste fragt damit nur echte Termine ab, eine Probe-Sitzung hakt „Erste Buchung erhalten“ nicht ab.

**Lokal abgenommen** (Tobias ohne Klienten, Chrome mit simulierter Kamera, Handyformat für den Klienten):
- Fenster mit QR-Code und Link. Der Link führt auf dem „Handy“ in den Warteraum, „Zum Gespräch“ und „Klient einlassen“ bringen beide ins Gespräch.
- Danach: Herkunft `test`, kein Klient angelegt, Merker gesetzt, Wochenkennzahl weiter 0, Agenda mit Abzeichen, „Erste Buchung erhalten“ nicht abgehakt.
- Aufräumen: Eine auf 25 Stunden zurückdatierte Probe-Sitzung samt Datei im Speicher ist nach dem Lauf weg, der Merker bleibt.
- Produktions-Build der Coach-App mit `uqr` im Bundle.

### 6b · Checkliste auf die Beta ausrichten

Schritte: Buchungsseite gestalten · Sitzungsangebot anlegen · Verfügbarkeit festlegen · Impressum hinterlegen · **Probe-Sitzung machen** · **Buchungslink teilen** (statt „Erste Buchung erhalten“).

- „Buchungslink teilen“ ist erledigt, sobald der Coach den Link einmal kopiert hat (Merker `booking_page.link_shared_at`) oder es eine echte Buchung gibt.
- Die Erfolgsmeldung am Ende passt sich an.

**Umgesetzt:**
- **Merker** `booking_page.link_shared_at` (Migration `0030`), gesetzt über `POST /booking-page/link-shared`. `GET /booking-page` liefert beide Merker.
- **Schritte ohne eigene Seite:** Sie haben statt eines Ziels eine Aktion (`OnboardingStep.action`).
  - „Probe-Sitzung machen“ öffnet das Fenster der Probe-Sitzung.
  - „Buchungslink teilen“ kopiert den Link.
- **`useBookingLink`** meldet jedes erfolgreiche Kopieren an die API und an einen gemeinsamen Zustand. So springt der Schritt sofort um, egal ob über Checkliste, Schnellzugriff oder Erfolgsmeldung kopiert wurde.
- **„Link kopieren“** auf der Seite „Buchungsseite“ hatte bisher keine Funktion und kopiert jetzt den Link.

**Lokal abgenommen** (Tobias, Chrome mit Zugriff auf die Zwischenablage):
- Sechs Schritte, „0 von 6“.
- „Probe-Sitzung machen“ öffnet das Fenster.
- „Buchungslink teilen“ kopiert `http://tobias.hxroom.localhost`, ist sofort abgehakt, der Merker steht in der Datenbank.
- Mit gesetztem Merker der Probe-Sitzung: nach dem Neuladen „2 von 6“.
- „Link kopieren“ auf der Seite „Buchungsseite“ kopiert den Link.

### 6c · „Kommt bald“ ausblenden

- **Menü:** Umsatz, Rechnungen, Warteraum, Benachrichtigungen und Plan & Abrechnung verschwinden, ebenso Notizen (aus Schritt 8 vorgezogen). Die Gruppe „Finanzen“ entfällt. „Rechtliches“ bleibt.
- **Alte Adressen** leiten aufs Dashboard. Die Seiten bleiben im Code.
- **Kacheln „Geplante Features“** in echten Seiten verschwinden ebenfalls: Buchungsseite, Rechtliches, Sitzungsangebote, Account, „Coaching-Ziele“ beim Klienten.
- **Ein Schalter:** Ausgeblendet wird über eine einzige Liste in der Coach-App. Kommt eine Funktion, nimmt man sie dort heraus.

**Umgesetzt:**
- **`app/utils/beta.ts`:** `BETA_HIDDEN_ROUTES` (die sechs Seiten) und `SHOW_UPCOMING_FEATURES` (Kacheln).
- **Menü:** Das Layout filtert danach. Gruppen, in denen nur die Überschrift bliebe, entfallen.
- **Weiterleitung:** `middleware/beta.global.ts` leitet ausgeblendete Seiten aufs Dashboard.
- **Kacheln:** `UpcomingFeature` zeigt ohne Schalter nichts. Die umgebenden Abschnitte prüfen ihn selbst, damit keine leeren Rahmen bleiben.

**Lokal abgenommen** (Anna, Chrome):
- Menü: Dashboard · Kalender, Sitzungsangebote, Verfügbarkeit, Buchungsseite · Klientenliste · Rechtliches.
- Die sechs alten Adressen führen aufs Dashboard, `/settings/privacy` weiter auf `/settings/legal`.
- Buchungsseite, Rechtliches, Account, Klientenseite und Sitzungsangebote ohne „Demnächst“ und ohne „Geplante Features“.

### Abnahme im Browser

- **Probe-Sitzung mit Tobias:**
  - starten, den Link in einem zweiten Browserfenster im Handyformat öffnen, sich einlassen
  - Chat und Datei ausprobieren, beenden
  - danach: Checkliste abgehakt, kein neuer Klient, Wochenkennzahl unverändert, Kalender und Agenda mit Abzeichen
- **Aufräumen:** Eine 25 Stunden alte Probe-Sitzung verschwindet samt Chat und Datei, der Merker bleibt.
- **Checkliste:** sechs Schritte, Link kopieren hakt „Buchungslink teilen“ ab.
- **Menü und Seiten:** nur noch echte Menüpunkte und keine Kacheln „Geplante Features“, alte Adressen leiten weiter. Rechner und Handy.

---

## Schritt 7 · Feedback-Knopf und Aktivität der Coachs ✅

**Stand:** ✅ 7a und 7b umgesetzt, lokal und in Produktion abgenommen, samt Mailversand an `FEEDBACK_EMAIL`.

**Ziel:** Beta-Coachs geben Rückmeldung, ohne die App zu verlassen. Der Betreiber sieht, wer HxRoom tatsächlich nutzt und wo jemand hängen bleibt. Zwei Teile, jeweils mit eigener Abnahme und eigenem Commit.

### 7a · Feedback-Knopf

**Ablauf:**
1. Der Menüpunkt „Feedback“ mit dem Abzeichen „Beta“ steht am unteren Rand des Menüs, über der Trennlinie zum Konto, auf jeder Seite des Coach-Backoffice.
2. Ein Fenster mit der Art (Problem · Idee · Sonstiges, vorbelegt „Sonstiges“) und einem Textfeld (Pflicht, höchstens 2000 Zeichen). Darunter der Hinweis, dass die aktuelle Seite mitgeschickt wird.
3. Nach dem Absenden: Toast „Danke für dein Feedback“, das Fenster schließt.

**Umsetzung:**
- **API:** `POST /api/v1/feedback` (`AuthGuard`), Schema `createFeedbackSchema` in `@hxroom/shared`: `category`, `message`, `page`.
  - `page` ist der Pfad der Seite ohne Query-String, etwa `/clients/abc123`. So landen keine Token oder Suchbegriffe im Feedback.
  - Dazu speichert die API den User-Agent aus dem Request, für Fehlermeldungen mit Browserbezug.
- **Tabelle `feedback`:** `id`, `organization_id` (Cascade), `user_id` (Cascade), `category`, `message`, `page`, `user_agent`, `created_at`. Wird ein Konto gelöscht, verschwindet das Feedback mit.
- **Mail an den Betreiber:** an die neue Variable `FEEDBACK_EMAIL`, Betreff „Feedback (Problem): Anna Beispiel“, Inhalt Text, Seite, Browser und Zeitpunkt. `replyTo` ist der Coach, der Betreiber antwortet also direkt aus dem Postfach.
  - Erst speichern, dann senden. Scheitert die Mail, bleibt das Feedback gespeichert, und die API protokolliert nur die Feedback-ID.
  - Ohne `FEEDBACK_EMAIL` wird nur gespeichert.
- **Betreiber-Backoffice:** neue Seite „Feedback“ (`/feedback`), neueste zuerst. Spalten Datum, Coach, Art, Seite und Text, Filter nach Art. Endpunkt `GET /api/v1/admin/feedback` hinter dem `AdminGuard`.
- **Missbrauchsschutz:** höchstens 20 Einsendungen pro Coach und Stunde, darüber `429`.

**Umgesetzt** wie beschrieben (Migration `0031`, `FeedbackModule`, `FeedbackModal.vue`, Mailvorlage `operator/feedback-received.tsx`, Seite `/feedback` im Betreiber-Backoffice). `FEEDBACK_EMAIL` steht in `infra/.env.example` und wird in `docker-compose.yml` an die API gereicht.

**Lokal abgenommen** (Anna, Chrome):
- Ohne Text ist „Senden“ gesperrt. Bei 2001 Zeichen steht „Höchstens 2000 Zeichen.“ am Feld.
- „Problem“ von der Klientenseite: `204`, Toast, Fenster schließt. In der Datenbank stehen Pfad `/clients/seed-client-anna-1` und der User-Agent.
- An der API: `/bookings?token=geheim#x` wird als `/bookings` gespeichert, die 21. Einsendung in einer Stunde bekommt `429`.
- Löschen der Organisation (in einer zurückgerollten Transaktion) nimmt das Feedback mit.
- Betreiber-Backoffice: Eintrag mit Coach, Art, Seite und Text, der Filter nach Art wirkt.
- Ohne `FEEDBACK_EMAIL` wird nur gespeichert. Die Mailvorlage ist per Test abgedeckt.

**Nachtrag Betreiber-Backoffice:** Lange Nachrichten stehen in der Tabelle auf drei Zeilen gekürzt, ein Klick zeigt den vollen Text mit Coach, Seite und Browser im Fenster. Löschen geht aus der Zeile oder dem Fenster, immer mit Rückfrage (`DELETE /api/v1/admin/feedback/:id`, `404` bei unbekannter ID). Lokal abgenommen: Kürzung auf drei Zeilen, Volltext im Fenster, beide Löschwege, `404` und `403` für Coachs.

### 7b · Aktivität in der Coach-Liste

Die Coach-Liste des Betreiber-Backoffice (`/coaches`) bekommt neue Spalten. Vorhanden sind Coach, Subdomain, Registriert, Klienten, Sitzungen und Status.

| Spalte | Bedeutung |
|---|---|
| **Zuletzt aktiv** | letzte Anfrage des Coachs an die API, als „heute“, „gestern“ oder Datum. Leer, solange er nie angemeldet war. |
| **Angebote** | aktive Sitzungsangebote (`is_active`) |
| **Buchungen** | über die Buchungsseite eingegangene Termine (Herkunft `booking_page`), jeder Status |
| **Sitzungen** | wie bisher: gehaltene Sitzungen ohne Probe-Sitzungen |
| **Startklar** | Häkchen-Reihe: Impressum vollständig, Probe-Sitzung gemacht, Link geteilt. Tooltip nennt, was fehlt. |

**Umsetzung:**
- **`user.last_active_at`:** Der `AuthGuard` setzt das Feld nach einer erfolgreichen Prüfung, höchstens einmal pro Stunde und Coach. Den Zeitpunkt des letzten Schreibens merkt sich die API im Speicher, damit nicht jede Anfrage in die Datenbank schreibt. Übernommene Sitzungen (`session.impersonated_by`) zählen nicht.
- **Abfrage:** Angebote und Buchungen kommen als zwei weitere vorgruppierte Unterabfragen hinzu, nach dem Muster von `clientCounts` und `sessionCounts` in `admin-coaches.service.ts`. Die drei Merker für „Startklar“ kommen aus `booking_page` (`test_session_at`, `link_shared_at`) und aus `isImprintComplete`.
- **Sortieren:** nach „Zuletzt aktiv“, Angeboten und Buchungen, zusätzlich zu den bisherigen Spalten. Coachs, die nie aktiv waren, stehen bei absteigender Sortierung unten.
- **`CoachListItem`** in `@hxroom/shared` bekommt `lastActiveAt`, `offerCount`, `bookingCount` und `readiness` (drei Wahrheitswerte).

**Umgesetzt** wie beschrieben (Migration `0032`, `auth/activity-tracker.ts` mit Test). „Link geteilt“ gilt wie in der Checkliste auch dann als erledigt, wenn schon eine Buchung eingegangen ist.

**Lokal abgenommen** (Tobias und Betreiber, Chrome):
- Nach Tobias’ Anmeldung steht er auf „heute“, `user.last_active_at` ist gesetzt. Coachs ohne Anfrage seit der Migration haben „—“.
- Sortierung nach „Zuletzt aktiv“: in beiden Richtungen Tobias oben, die übrigen darunter.
- Angebote, Buchungen und „Startklar“ stimmen für alle vier Coachs mit SQL überein. Der Tooltip nennt die offenen Schritte.
- Mit gesetztem Merker der Probe-Sitzung bekommt Tobias das zweite Häkchen.

### Abnahme im Browser

- **Feedback (Anna):** auf der Klientenseite „Problem“ absenden. Danach stehen Toast, Zeile in der Datenbank und Seite `/clients/…` ohne Query-String. Die Mail geht über Brevo an `FEEDBACK_EMAIL` und trägt Anna als Antwortadresse.
- **Ohne Text:** Absenden gesperrt. Bei mehr als 2000 Zeichen erscheint eine Fehlermeldung am Feld.
- **Betreiber:** Die Seite „Feedback“ zeigt den Eintrag, und der Filter nach Art wirkt.
- **Aktivität:** Nach Annas Anmeldung steht sie in der Coach-Liste auf „heute“. Ein Coach ohne Anmeldung hat eine leere Zelle.
- **Kennzahlen gegen die Seed-Daten geprüft:** Angebote, Buchungen und „Startklar“. Für Tobias erscheint nach einer Probe-Sitzung das zweite Häkchen.
- **Konto löschen:** Annas Feedback verschwindet mit.

### Inbetriebnahme

- ✅ `FEEDBACK_EMAIL` in der `.env` des Servers setzen. `docker-compose.yml` reicht die Variable an die API durch.
- ✅ `git pull` und `./redeploy.sh` (Migrationen `0031` und `0032`)
- ✅ Ein Feedback aus der Produktion absenden, Mail und Eintrag im Betreiber-Backoffice prüfen.

---

## Schritt 9 · Landingpage überarbeiten

**Stand:** 9a umgesetzt im Branch `landing-relaunch`, Texte zur Freigabe.

**Ziel:** Die Landingpage (`apps/landing`, `hxroom.de`) ist die erste Station des Marketings. Sie zeigt das echte Produkt und führt zu zwei Aktionen: **„Vorführung buchen“** (Hauptaktion, `demo.hxroom.de`) und **„Kostenlos ausprobieren“** (Registrierung, `app.hxroom.de/auth/register`). Der Newsletter bleibt als Nebenoption am Ende.

**Bleibt:** Schriften (Cormorant Garamond, DM Sans), Farben (Salbei, Gold, Sand), heller und dunkler Modus, Du-Ansprache nach `marketing.md` §0, Abschnitt „Wer das baut“, Impressum und Datenschutz.

### Aufbau der Seite

| # | Abschnitt | Inhalt und Gestaltung |
|---|---|---|
| 1 | **Navigation** | Fest oben. Desktop: Logo, Sprungmarken (So funktioniert’s · Für wen · Über mich · Fragen), Knopf „Vorführung buchen“. Handy: Logo und Knopf. |
| 2 | **Hero** | Desktop zweispaltig: links Kennzeichen „Beta – jetzt kostenlos testen“, Überschrift, ein Satz, beide Aktionen; rechts Screenshot des Warteraums im Browserrahmen. Handy: Überschrift, Satz, Aktionen, Bild. Die Aktionen sind auf dem ersten Bildschirm sichtbar. |
| 3 | **Vertrauenszeile** | Schmale Zeile mit Symbolen: Server in Deutschland · AVV inklusive · Klienten ohne Konto · Kein Zoom-Link. |
| 4 | **Das Problem** | Dunkles Salbei-Band mit einer großen Aussage („Du verkaufst Vertrauen. Dein Tool verkauft Firmen-Meeting.“) und einem kurzen Absatz, ohne Karten. |
| 5 | **So funktioniert’s** | Produkt-Tour aus Sicht des Klienten in vier Stationen, Bild und Text im Wechsel: Buchungsseite → Bestätigungsmail → Warteraum → Gespräch. Echte Screenshots. |
| 6 | **Für dich als Coach** | Raster mit sechs Funktionen, die es heute gibt: Buchungsseite mit deinem Namen, Kalender und Verfügbarkeit, Erinnerungsmails, Notizen während des Gesprächs, Chat und Dateien im Call, Probe-Sitzung mit dir selbst. Dazu ein Screenshot des Dashboards. |
| 7 | **Für wen** | Zielgruppen als lockere Reihe von Abzeichen, darunter „Nicht gemacht für“. |
| 8 | **Wer das baut** | Wie bisher, mit Foto. |
| 9 | **Fragen** | Überarbeitete FAQ (siehe unten). |
| 10 | **Abschluss** | Beide Aktionen, eine persönliche Zeile von Stefan mit Foto. Darunter klein: „Lieber erst mal Neuigkeiten?“ mit dem Newsletter-Formular. |
| 11 | **Fußzeile** | Zweispaltig: Produkt (Vorführung, Ausprobieren, Anmelden) und Rechtliches (Impressum, Datenschutz, Kontakt), Hell/Dunkel-Schalter. |

**Rhythmus:** Die Hintergründe wechseln zwischen warmem Weiß, Sand und dem dunklen Salbei-Band. Jeder Abschnitt hat sein eigenes Layout. Fließtext etwas größer und im dunkleren Textton.

### Inhaltliche Korrekturen

- „Early Access · Launch Q4 2026“ und „In Entstehung“ werden zu „Beta – jetzt kostenlos testen“.
- „Kein Chat“ entfällt. Chat und Dateien im Call gibt es.
- Die Fußnote „Diese drei Dinge gibt es ab Launch …“ entfällt. Erinnerungsmails und Notizen gibt es.
- Der gezeichnete Warteraum mit „Gestaltungsentwurf · Anna ist eine Beispiel-Coach“ wird durch echte Screenshots ersetzt.
- **FAQ:**
  - „Wann geht HxRoom live?“ wird zu „Kann ich HxRoom schon nutzen?“ (Beta, kostenlos, mit echten Klienten).
  - „Was wird es kosten?“: kostenlos in der Beta, Preise zum regulären Start, Orientierung ab etwa 19 €/Monat.
  - „Gibt es schon Kunden / Testimonials?“ wird zu „Wie läuft eine Vorführung ab?“ (20 Minuten, kostenlos, über `demo.hxroom.de`).
  - Die übrigen Fragen bleiben und werden geprüft.

### Teile

**9a · Aufbau, Gestaltung und Texte**
- Neue Abschnitte nach der Tabelle. Bestehende Komponenten werden umgebaut oder ersetzt.
- Ziele der Aktionen über die Build-Konfiguration (`runtimeConfig.public`, wie `apiUrl`), lokal `hxroom.localhost`. So führen die Knöpfe lokal auf `demo.hxroom.localhost` und `app.hxroom.localhost`.
- Screenshots zunächst als Platzhalter im richtigen Seitenverhältnis.
- Texte nach den Korrekturen oben. Stefan sieht sie im Browser und gibt sie frei.

**Umgesetzt:**
- **Neu:** `TrustBar`, `TourSection`, `CoachFeaturesSection`, `LandingCtas` (beide Aktionen, Plausible-Ereignisse `demo_click` und `register_click`), `ScreenFrame` (Browserrahmen, ohne Bild ein Platzhalter), `SectionLabel`, `useLandingLinks()`.
- **Umgebaut:** Hero, Problem-Band, Für wen, FAQ (Fragen in `utils/faq.ts`, daraus auch das FAQPage-JSON-LD), Abschluss mit aufklappbarem Newsletter, Fußzeile, Navigation.
- **Entfallen:** `VisionSection`, `MockupPreview`, `public/anna.jpg`.
- **Ziele der Aktionen:** `runtimeConfig.public.rootDomain`. Der Produktions-Build zeigt auf `hxroom.de`, `nuxt dev` auf `hxroom.localhost`.
- **Symbole im Bundle** (`icon.clientBundle.scan`). Der Produktions-Build fragt keine fremden Hosts an.

**Lokal geprüft:**
- Desktop hell und dunkel, Handy hell: kein waagerechter Überlauf, keine Anfragen an Dritte.
- Die Sprungmarken landen auf ihren Abschnitten, das Newsletter-Formular klappt auf.
- Der Produktions-Build enthält `https://demo.hxroom.de`, `https://app.hxroom.de/auth/register` und die neue FAQ.

**9b · Screenshots**
- **Quelle:** die Inhalte von `demo.hxroom.de` (Texte, Foto, Angebot „Produktvorführung“), lokal in Stefans Konto nachgestellt. So lassen sich die Bilder jederzeit neu erzeugen.
- **Motive:** Buchungsseite, Bestätigungsmail (die gerenderte Vorlage), Warteraum, Gespräch aus Sicht des Coachs mit Notizen, Dashboard.
- **Format:** WebP in doppelter Auflösung unter `apps/landing/public/screens/`, heller Modus, mit `width`/`height` und `loading="lazy"` außer im Hero.

**9c · Suchmaschinen und Aufräumen**
- Titel, Beschreibung und JSON-LD (`FAQPage`, `SoftwareApplication`) passend zu den neuen Texten.
- `public/llms.txt` nachziehen (`apps/landing/CLAUDE.md`).
- Die Seite `/old` und die Komponenten, die nur sie verwendet, entfallen. `/old` verschwindet aus der `robots.txt`.

### Abnahme im Browser

- **Desktop (1440 px) und Handy (390 px), hell und dunkel:** Die Aktionen stehen auf dem ersten Bildschirm. Keine Zeile bricht unglücklich um, nichts läuft waagerecht über.
- **Links:** „Vorführung buchen“ führt auf die Vorführ-Buchungsseite, „Kostenlos ausprobieren“ auf die Registrierung, die Sprungmarken auf ihre Abschnitte. Das Newsletter-Formular meldet weiterhin an.
- **Keine Anfragen an Dritte** beim Laden der Seite (Symbole und Schriften kommen von der eigenen Domain).
- **Produktions-Build** (`nuxt generate`): Die vorgerenderte Startseite enthält Texte, Aktionen und JSON-LD.

### Inbetriebnahme

- `git pull` und `./redeploy.sh`, danach hxroom.de auf Desktop und Handy prüfen.
- Google Search Console: Startseite neu indexieren lassen.
