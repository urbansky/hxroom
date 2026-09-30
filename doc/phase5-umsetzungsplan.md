# Phase 5 – Umsetzungsplan

*Begonnen 2026-09-30. Umfang von Phase 5 siehe `zeitplan.md`; technische Grundlage `technisches-konzept.md` (§13 Backup, §16 offene Punkte, §17 Sicherheit & DSGVO).*

## Ziel und Termin

Nach Phase 5 beginnt das Marketing. Interessierte Coaches buchen eine Produktvorführung auf `demo.hxroom.de`, probieren HxRoom danach selbst als Coach aus und geben Feedback. Beta-Tester dürfen mit echten Klienten arbeiten. **Zieltermin: 01.11.2026.**

## Reihenfolge

Phase 5 läuft in zwei Etappen. Die Vorführungen brauchen nur einen Teil der Punkte und können deshalb schon Mitte Oktober beginnen. Weil schon Vorführ-Buchungen echte Personendaten sind, stehen Backup und Rechtliches vorn.

**Etappe A – vorführbereit (Ziel ~15.10.2026)**

1. Backup und Fehlerüberwachung (siehe unten)
2. Erinnerungsmails 24 h / 1 h vor dem Termin
3. Buchungsseite vollständig, samt Impressum und Datenschutzerklärung in den Einstellungen des Coachs
4. `demo.hxroom.de` einrichten, Knopf „Vorführung buchen“ auf der Landingpage. Ab hier sind Vorführungen möglich.

**Etappe B – Beta-Coaches (Ziel 01.11.2026)**

5. AGB und AVV bei der Registrierung, Datenschutz-Kasten im Warteraum
6. Probe-Sitzung mit sich selbst, Onboarding-Checkliste, „Kommt bald“-Seiten ausblenden
7. Feedback-Knopf, Aktivität der Coaches im Betreiber-Backoffice
8. Terminseite, breitere Klientenseite, Abschlusskarte

**Wenn es eng wird:** Zuerst Schritt 8, die Backoffice-Aktivität (übergangsweise per SQL) und die überarbeitete Onboarding-Checkliste hinter den Beta-Start schieben. Unverzichtbar vor dem 01.11.: Backup, Fehlerüberwachung, Rechtstexte, Buchungsseite, Erinnerungen, Probe-Sitzung, Feedback-Knopf.

**Außerhalb des Codes, mit Vorlauf:** Die Rechtstexte (Impressum- und Datenschutz-Vorlage für Coaches, AGB, AVV) liefert der Betreiber. Sie sollten früh angestoßen werden, damit sie Ende Oktober kein Engpass sind.

---

## Schritt 1 · Backup und Fehlerüberwachung *(geplant 2026-09-30)*

Zwei Teile mit je eigener Abnahme und eigenem Commit: erst **1a Backup**, dann **1b Fehlerüberwachung**.

### Ausgangslage

- **Backup:** Nichts aus §13 ist umgesetzt: kein `pg_dump`, kein zweiter Bucket, kein Alarm. Die Datenbank (`postgres:17-alpine`, Volume `postgres_data`) liegt allenfalls im Server-Backup von Hetzner. Die Dateien liegen in Hetzner Object Storage in Falkenstein (`fsn1`, Bucket `hxroom-files`) ohne jede Kopie.
- **Fehlerüberwachung:** Es gibt keine. Fehler stehen nur in `docker compose logs`.

### 1a · Backup

**Aufbau:** Ein eigener Container `backup` im Compose-Stack. Er enthält `postgresql17-client` (passend zum Server), `rclone`, `age` und einen Cron-Dienst, dazu drei kleine Skripte unter `infra/backup/`. Die API bleibt unberührt, und ein Deploy unterbricht keinen laufenden Backup-Lauf.

**Ablauf jede Nacht:**

1. **03:00 Datenbank:** `pg_dump`, komprimiert und mit `age` verschlüsselt, geht in den Backup-Bucket unter `db/daily/`. Sonntags kommt eine Kopie nach `db/weekly/`, am Monatsersten nach `db/monthly/`. Danach wird aufgeräumt: 7 Tage, 4 Wochen, 3 Monate (GFS-Schema aus §13).
2. **03:30 Dateien:** Die Dateien werden in denselben Backup-Bucket gespiegelt (`files/current/`). Was im Original gelöscht wurde, wandert 30 Tage in einen Papierkorb (`files/deleted/<Datum>/`, über `rclone sync --backup-dir`) und verschwindet dann. So lässt sich ein versehentliches Löschen rückgängig machen, und trotzdem ist nach 30 Tagen wirklich gelöscht, was gelöscht werden sollte.
3. **Meldung:** Jeder Lauf meldet Start, Erfolg oder Fehler an einen Totmannschalter. Bleibt eine Erfolgsmeldung aus, kommt eine Mail. Das erfasst auch den Fall, dass der Job gar nicht erst läuft. Zusätzlich schickt ein Fehler direkt eine Mail über die Brevo-API.

**Wiederherstellung:** `restore-db.sh` lädt einen Stand, entschlüsselt ihn und spielt ihn in eine frische Datenbank ein. Die Anleitung kommt in die Doku. Durchgespielt wird sie einmal lokal und einmal auf dem Server, dort in eine Test-Datenbank, die danach wieder gelöscht wird. Erst dann gilt das Backup als funktionierend.

**Doku:**

- §13 beschreibt den Ist-Zustand statt des Plans.
- §16 Punkt 03 wird als erledigt markiert.
- Ein Betriebskapitel „Wiederherstellen“ kommt dazu.
- Für die spätere Vorlage der Datenschutzerklärung wird festgehalten, dass gelöschte Daten bis zu drei Monate in den Backups bleiben.

**Abnahme lokal**, gegen RustFS mit einem zweiten Bucket als Ersatz für den Backup-Bucket:

- Datenbank-Backup und Aufräumen laufen durch, die Dateien werden gespiegelt.
- Eine gelöschte Datei landet im Papierkorb.
- Die Wiederherstellung in eine frische Datenbank ergibt dieselbe Zeilenzahl pro Tabelle.
- Ein absichtlich falsches Passwort löst den Alarm aus.

**Vom Betreiber anzulegen** (eine Schritt-für-Schritt-Liste folgt bei der Umsetzung):

- ein eigenes Hetzner-Projekt mit Bucket in **Nürnberg (`nbg1`)**: anderer Standort als das Original, aber weiterhin Deutschland
- ein `age`-Schlüsselpaar. Der geheime Teil kommt in den Passwortmanager, nicht auf den Server.
- ein Konto beim Totmannschalter-Dienst

### 1b · Fehlerüberwachung

**Vorschlag: GlitchTip auf dem eigenen Server.** Das ist ein Open-Source-Nachbau von Sentry mit denselben SDKs. Er läuft unter einer eigenen Subdomain (z. B. `errors.hxroom.de`) mit einer eigenen Datenbank in unserem Postgres.

- **Wo er misst:** Die API bekommt `@sentry/nestjs`, Coach-App und Klientenseite das Vue- bzw. Nuxt-SDK.
- **Keine Drittanbieter-Requests von der Klientenseite:** Die Fehler gehen an den eigenen Server, der Grundsatz aus §17 bleibt gewahrt.
- **Datenschutz:** Vor dem Senden werden alle Tokens aus URLs entfernt, denn die Call-Links tragen ihren Zugangsschlüssel im Query-String. Namen und E-Mail-Adressen werden nicht übertragen, nur IDs.
- **Source Maps** lädt die CI hoch (`.github/workflows/docker-build.yml`), damit Fehler aus dem gebauten Code lesbar sind.
- **Alarm** per Mail über Brevo-SMTP.
- **Die neue Subdomain** kommt auf die Slug-Sperrliste (`packages/shared/src/slugs.ts`) und bekommt einen eigenen Caddy-Block.

**Abnahme:** je ein absichtlich ausgelöster Fehler in API, Coach-App und Klientenseite. Geprüft wird: Er erscheint in GlitchTip, lesbar, ohne Token in der URL, und die Alarm-Mail kommt an.

### Offene Entscheidungen (vor dem Start zu klären)

1. **Totmannschalter:** Empfohlen ist **healthchecks.io** (EU-gehostet, nur Pings, keine Personendaten, bis 20 Jobs kostenlos). Die Alternative wäre, nur per Brevo-Mail zu alarmieren. Die kommt aber nur, wenn das Skript überhaupt läuft.
2. **Fehlerüberwachung:**
   - **GlitchTip auf dem eigenen Server** (empfohlen): etwa 300–500 MB RAM zusätzlich, alle Daten bleiben bei uns.
   - **Sentry in der EU-Region:** Die Daten liegen in Frankfurt, der Anbieter ist aber ein US-Unternehmen.
   - **Minimal selbst gebaut:** Fehler per Mail, ohne Oberfläche und ohne gruppierte Fehlerliste.

   Der freie RAM des Servers entscheidet mit.
3. **Server-Backup von Hetzner:** Ist es eingeschaltet? Es bleibt als zusätzliche Schicht sinnvoll, ersetzt das eigene Backup aber nicht (gleiches Projekt, gleicher Standort).
