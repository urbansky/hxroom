# Konzept: Kalenderabgleich und Ausnahmen

*Ergänzt die Verfügbarkeit (Funktion 2.01 in `funktionen/backoffice-coach.md`): Zeiträume einzeln sperren oder freigeben, belegte Zeiten aus externen Kalendern übernehmen und die eigenen Termine als Kalender-Abo ausgeben. Ohne OAuth, über iCal-Adressen. Stand der Umsetzung in Abschnitt 9.*

## 1. Zweck und Umfang

Die Wochenzeiten sagen, wann ein Coach grundsätzlich arbeitet. Sie wissen nichts vom Zahnarzttermin am Dienstag, vom Workshop beim Firmenkunden oder vom Urlaub. Ohne Abgleich bucht ein Klient genau in solche Lücken, und der Coach muss absagen. Das kostet Vertrauen auf beiden Seiten.

**Umfang:**
- **Ausnahmen:** einen Zeitraum sperren (Urlaub, freier Nachmittag) oder zusätzlich freigeben (Samstagvormittag in dieser Woche)
- **Import:** bis zu 5 externe Kalender über ihre iCal-Adresse; belegte Zeiten blockieren Slots auf der Buchungsseite
- **Feed:** eine private iCal-Adresse pro Coach mit allen Terminen aus HxRoom zum Abonnieren in Google, Apple oder Outlook
- **Kalenderdatei in der Coach-Mail:** neue Buchungen lassen sich sofort mit einem Klick übernehmen, auch wenn das Abo noch nicht nachgeladen hat

Alle vier Bausteine gibt es in allen Plänen: Der Abgleich verhindert Doppelbuchungen und gehört zur Grundfunktion der Buchung.

**Nicht enthalten:**
- Anbindung über die Google- oder Microsoft-API (OAuth), Echtzeit-Sync
- Schreiben in einen fremden Kalender (CalDAV)
- Ausnahmen je Angebot; Ausnahmen gelten für alle Angebote
- wiederkehrende Ausnahmen („jeden zweiten Freitag frei“); dafür gibt es die Wochenzeiten und den importierten Kalender

## 2. Ausnahmen: Zeiträume sperren und freigeben

Eine Ausnahme ist ein fester Zeitraum mit Datum, kein Wochenmuster.

| Art | Wirkung | Beispiele |
|---|---|---|
| **Gesperrt** | Kein Slot überschneidet sich mit dem Zeitraum, auch wenn er in den Wochenzeiten liegt | Urlaub 03.–14.08., Do 14–18 Uhr Arzt |
| **Freigegeben** | Der Zeitraum ist buchbar wie ein zusätzliches Zeitfenster, auch außerhalb der Wochenzeiten | Sa 10–13 Uhr, einmalig |

- **Felder:** Art, Beginn, Ende, Schalter „ganztägig“ (dann nur Datum von–bis, Ende einschließlich), Notiz (optional, nur für den Coach, z. B. „Urlaub“).
- **Freigaben** liegen an einem einzelnen Tag und haben immer Uhrzeiten. Ganztägig oder über mehrere Tage ergäben sie Slots rund um die Uhr. Sperren dürfen ganztägig sein und mehrere Tage umfassen, höchstens ein Jahr.
- **Sperren gewinnt:** Überschneiden sich eine Freigabe und eine Sperre, gilt die Sperre. Auch importierte belegte Zeiten (Abschnitt 3) blockieren Freigaben.
- **Bestehende Termine bleiben.** Legt der Coach eine Sperre über bestehende Termine, zeigt der Dialog vor dem Speichern: „In diesem Zeitraum liegen 2 Termine. Sie bleiben bestehen.“ mit Links auf die Termine. HxRoom sagt nichts automatisch ab.
- **Vergangene Ausnahmen** blendet die Liste aus. Sie haben auf die Buchbarkeit keine Wirkung mehr.

## 3. Belegte Zeiten aus externen Kalendern

### 3.1 Einrichten

Der Coach fügt eine iCal-Adresse hinzu und gibt ihr einen Namen („Privat“, „Praxis“). Die Seite erklärt kurz, wo die Adresse zu finden ist:

| Anbieter | Weg | Hinweis |
|---|---|---|
| Google | Einstellungen → Kalender auswählen → „Privatadresse im iCal-Format“ | geheime Adresse, nur mit Link lesbar |
| Outlook / Microsoft 365 | Einstellungen → Kalender → Freigegebene Kalender → „Kalender veröffentlichen“ → „Kann nur sehen, wann ich beschäftigt bin“ → ICS-Link | übermittelt nur belegte Zeiten, ohne Titel |
| Apple iCloud | Kalender → Teilen → „Öffentlicher Kalender“ → Link kopieren | Warnhinweis: Jeder mit dem Link sieht die Termine |

`webcal://` wird als `https://` gelesen. Beim Speichern ruft HxRoom die Adresse sofort ab und bestätigt den Erfolg mit einer Zahl: „Verbunden. 23 belegte Zeiten in den nächsten 8 Wochen gefunden.“ Schlägt der Abruf fehl, wird nichts gespeichert und die Meldung sagt, woran es lag (Adresse nicht erreichbar, keine Kalenderdatei, Zugriff verweigert).

Jeder Kalender lässt sich einzeln pausieren, umbenennen und entfernen. Entfernen löscht auch seine belegten Zeiten.

### 3.2 Was blockiert

- Jeder Termin mit Status „beschäftigt“ (`TRANSP:OPAQUE`, auch wenn das Feld fehlt) blockiert seine Zeit.
- **Nicht** blockieren: Termine mit „frei“ (`TRANSP:TRANSPARENT`), abgesagte Termine (`STATUS:CANCELLED`) und Einladungen, die der Coach abgelehnt hat (`PARTSTAT=DECLINED` bei einer seiner Adressen).
- **Ganztägige Termine** blockieren nach demselben Status. Google legt sie standardmäßig als „frei“ an. Der Coach stellt deshalb je Kalender ein, ob ganztägige Termine immer blockieren („Ganztägige Termine blockieren immer“, Standard: aus). Das deckt den Fall ab, dass er seinen Urlaub als ganztägigen Termin einträgt.
- **Serientermine** werden mit ihren Ausnahmen (`RRULE`, `EXDATE`, geänderte Einzeltermine über `RECURRENCE-ID`) in einzelne Zeiten aufgelöst.
- **Eigene Termine werden übersprungen.** Trägt der Coach Termine aus HxRoom in denselben Kalender ein (Feed, Kalenderdatei aus einer Mail), erkennt der Import sie an der UID (`booking.id`) und zählt sie nicht doppelt.
- **Zeitraum:** ab heute bis zum Ende des Buchungsfensters plus eine Woche. Ältere und spätere Termine liest HxRoom nicht.

Gespeichert werden nur Beginn und Ende jeder belegten Zeit und der Kalender, aus dem sie stammt. Titel, Orte, Teilnehmer und Beschreibungen verlassen den Arbeitsspeicher des Abrufs nicht.

### 3.3 Wann abgeglichen wird

| Anlass | Verhalten | Mindestabstand seit letztem Abruf |
|---|---|---|
| **Regelmäßig** | Lauf alle 5 Minuten, ruft jeden aktiven Kalender ab, dessen letzter Abruf länger zurückliegt | 15 Minuten |
| **Aktivität im Backoffice** | Die Coach-App meldet sich beim Laden, beim Wechsel zurück in den Tab und beim Öffnen von „Termine“ oder „Verfügbarkeit“. Der Abgleich läuft im Hintergrund | 5 Minuten |
| **Knopf „Jetzt abgleichen“** | auf der Seite „Verfügbarkeit“ und in der Kopfzeile der Wochenansicht; wartet auf das Ergebnis und zeigt es an | 30 Sekunden |
| **Aufruf der Buchungsseite** | Lädt ein Klient die freien Zeiten, stößt das einen Abgleich im Hintergrund an. Die Antwort wartet nicht darauf | 10 Minuten |
| **Buchung abschicken** | Vor dem Anlegen einer Buchung wird abgeglichen, wenn die Daten älter sind; höchstens 5 Sekunden Wartezeit, danach gilt der letzte Stand | 10 Minuten |

Die letzten beiden Anlässe schließen die Lücke dort, wo sie Schaden anrichtet: Ein Termin, den der Coach vor zwölf Minuten eingetragen hat, soll nicht mehr buchbar sein.

Neben jedem Kalender steht der Stand: „Abgeglichen vor 3 Minuten“. Die Kopfzeile der Wochenansicht zeigt den ältesten Stand aller Kalender mit dem Knopf daneben.

### 3.4 Fehler

- **Ein fehlgeschlagener Abruf ändert nichts.** Die zuletzt bekannten belegten Zeiten gelten weiter. Würden sie verworfen, wären auf einen Schlag alle privaten Termine buchbar.
- Der Kalender zeigt den Fehler an („Letzter Abruf fehlgeschlagen: Adresse antwortet nicht“) und wann zuletzt erfolgreich abgeglichen wurde.
- Schlägt der Abruf **6 Stunden lang** fehl, bekommt der Coach eine Mail mit dem Grund und dem Link zur Einstellung. Danach keine weitere Mail, bis der Kalender wieder einmal erfolgreich war.
- Ein Banner in der Coach-App weist auf den Fehler hin, solange er besteht.

## 4. Termine im eigenen Kalender (Feed)

Jeder Coach hat eine private Adresse, die alle seine Termine aus HxRoom als Kalender liefert. Er abonniert sie einmal in Google, Apple oder Outlook; danach erscheinen neue, verlegte und abgesagte Termine dort von selbst.

- **Inhalt:** alle Termine ab 30 Tagen in der Vergangenheit, ohne abgesagte und ohne Probe-Sitzungen. Unbestätigte Buchungen erscheinen als vorläufig (`STATUS:TENTATIVE`) mit „(unbestätigt)“ im Titel.
- **Titel:** „{Angebot} · {Klientenname}“. Eine Einstellung „Ohne Klientennamen“ setzt nur das Angebot ein, für Coachs, die keine Namen in einem fremden Kalender haben möchten.
- **Beschreibung:** Link auf die Terminseite in HxRoom (`/bookings/:id`), von dort geht es in die Sitzung. Keine Kontaktdaten, keine Nachricht des Klienten.
- **UID** ist die `booking.id`, wie in den Kalenderdateien der Mails.
- **Adresse erneuern:** erzeugt eine neue Adresse, die alte liefert sofort nichts mehr (`404`). Für den Fall, dass die Adresse in falsche Hände geraten ist.

**Verzögerung durch den Kalender des Coachs.** Wie oft ein Abo neu geladen wird, bestimmt der abonnierende Kalender, nicht HxRoom:

| Kalender | Takt |
|---|---|
| Apple Kalender (Mac) | einstellbar beim Abonnieren („Automatisch aktualisieren“, ab 5 Minuten); mit Ort „iCloud“ gilt das Abo auch auf iPhone und iPad |
| Outlook klassisch (Windows) | folgt dem Vorschlag des Feeds (`X-PUBLISHED-TTL`), sofern „Abonnement gemäß Empfehlung des Herausgebers aktualisieren“ aktiv ist; manuell über Senden/Empfangen |
| Outlook im Web, Outlook.com, neues Outlook | etwa alle 3 bis 4 Stunden, nicht einstellbar |
| Google Kalender | teils nur alle 12 bis 24 Stunden, nicht einstellbar |

Der Feed schlägt 15 Minuten vor (`X-PUBLISHED-TTL:PT15M`, `REFRESH-INTERVAL;VALUE=DURATION:PT15M`). Die Anleitung auf der Einstellungsseite empfiehlt Apple-Nutzern, beim Abonnieren „Alle 5 Minuten“ oder „Alle 15 Minuten“ zu wählen, und nennt die Verzögerung bei Outlook im Web und Google offen. Für die Zeit bis zum nächsten Abruf gibt es die Kalenderdatei in der Mail (unten).

### Kalenderdatei in der Mail an den Coach

Die Mail „Neue Buchung“ (`mail/templates/coach/booking-notification.tsx`) trägt eine Kalenderdatei mit dem Termin, dazu im Text die Links „In Google Kalender eintragen“ und „In Outlook eintragen“ (vorausgefüllte Eintragsseiten der Anbieter). Der Coach übernimmt den Termin damit sofort mit einem Klick.

- **Angebot, keine Einladung.** Die Datei ist `METHOD:PUBLISH` wie in den Klienten-Mails, keine Einladung (`REQUEST`), die der Kalender von selbst einträgt. So entsteht kein doppelter Eintrag, wenn der Coach den Feed nutzt und die Datei nicht anklickt.
- **Inhalt** wie im Feed: Titel, Link auf die Terminseite, gleiche UID (`booking.id`). Die Einstellung „Ohne Klientennamen“ gilt auch hier.
- **Absage:** Die Mail „Termin abgesagt“ an den Coach (`booking-cancelled-by-client.tsx`) trägt eine Datei mit derselben UID, höherer `SEQUENCE` und `STATUS:CANCELLED`. Apple und Outlook markieren damit einen übernommenen Eintrag als abgesagt; der Text weist darauf hin, einen selbst eingetragenen Termin sonst von Hand zu löschen. Im Feed verschwindet der Termin beim nächsten Abruf von selbst.
- **Doppelte Einträge:** Wer Feed und Mail-Datei nutzt, hat den Termin zweimal, im Abo-Kalender und im eigenen. Die Anleitung empfiehlt deshalb eines von beiden: Apple-Nutzern den Feed, Nutzern von Outlook im Web und Google den Feed als Übersicht und die Datei in der Mail nur, wenn sie den Termin sofort brauchen. Der Import (Abschnitt 3) zählt übernommene Termine an ihrer UID nicht als belegte Zeit.
- Manuell angelegte Termine lösen keine Mail an den Coach aus; dafür gibt es auf der Terminseite bereits „Kalendereintrag“.

## 5. Wirkung auf die Buchbarkeit

**Slots auf der Buchungsseite** entstehen aus:

```
Zeitfenster  = Wochenzeiten ∪ freigegebene Ausnahmen
Blockiert    = bestehende Buchungen ∪ gesperrte Ausnahmen ∪ importierte belegte Zeiten
Slots        = Raster in den Zeitfenstern, ohne Überschneidung mit Blockiert
```

Vorlaufzeit, Buchungsfenster und Pufferzeit gelten wie bisher. Die Pufferzeit wirkt nur auf das Raster, nicht um importierte Termine herum.

**Manuell angelegte Termine** (`funktionen/manuelle-termine.md`) prüfen weiterhin nur und blockieren nicht. Zu den bestehenden Hinweisen kommen zwei neue: „Liegt in einem gesperrten Zeitraum (Urlaub)“ und „Überschneidet sich mit einem Termin aus deinem Kalender ‚Privat‘“.

**Bestehende Termine**, die nachträglich mit einer importierten belegten Zeit kollidieren, bleiben bestehen. Die Wochenansicht zeigt beide Blöcke übereinander, sodass der Coach die Überschneidung sieht.

## 6. Oberfläche

**Seite „Verfügbarkeit“**, Reiter:

| Reiter | Inhalt |
|---|---|
| Zeiten | Wochenzeiten wie bisher |
| Ausnahmen | kommende Ausnahmen als Liste (Datum, Uhrzeit, Art als Badge, Notiz), Knopf „Ausnahme hinzufügen“ öffnet ein Slideover |
| Kalender | Abschnitt „Belegte Zeiten übernehmen“ (Liste der Kalender mit Stand, „Kalender hinzufügen“, „Jetzt abgleichen“) und Abschnitt „Termine in deinem Kalender“ (Adresse mit Kopierknopf, Anleitung je Anbieter, „Ohne Klientennamen“, „Adresse erneuern“) |
| Einstellungen | wie bisher |

**Termine, Wochenansicht:**
- Gesperrte Ausnahmen und importierte belegte Zeiten erscheinen als graue Fläche hinter den Terminen, oben beschriftet mit „Gesperrt · Urlaub“ bzw. „Belegt · Privat“. Keine Schraffur: Die steht in der Wochenansicht für unbestätigte Termine. Ein Klick auf eine Sperre öffnet sie zum Bearbeiten. Importierte Blöcke sind nicht anklickbar.
- Freigegebene Ausnahmen färben den Hintergrund des Zeitraums leicht ein.
- Im Kopf der Seite steht neben „Termin anlegen“ der zurückhaltendere Knopf „Zeit sperren“. Nach dem Speichern bestätigt ein Toast die Sperre, weil sie in der Agenda nicht zu sehen ist.
- Kopfzeile: Stand des Kalenderabgleichs mit Knopf (Abschnitt 3.3).

## 7. Datenschutz und Sicherheit

- **Datensparsamkeit:** Vom Import bleiben nur Zeiträume. Die Kalenderdatei wird nicht gespeichert und nicht geloggt, auch nicht im Fehlerfall.
- **Die iCal-Adressen sind Zugangsdaten.** HxRoom speichert sie verschlüsselt (AES-256-GCM, Schlüssel aus der Umgebung) und zeigt sie nach dem Speichern nur gekürzt an (`https://calendar.google.com/…/basic.ics`).
- **Abruf fremder Adressen (SSRF):** nur `https`, keine IP-Adressen aus privaten, Loopback- und Link-Local-Bereichen (geprüft nach der DNS-Auflösung und bei jeder Weiterleitung), höchstens 3 Weiterleitungen, 10 Sekunden Zeitlimit, höchstens 10 MB.
- **Feed-Token:** 32 Byte zufällig. Liegt er im Pfad, muss er aus allen Zugriffslogs gefiltert werden (`loggablePath` in der API, Caddy).
- **Rechtliches:** HxRoom verarbeitet Kalenderdaten des Coachs als Auftragsverarbeiter. Datenschutzhinweise und AVV brauchen dazu einen Absatz (Vorschlag für `recht/`, vor dem Start abzustimmen).
- **Kontolöschung und Export:** Kalender, belegte Zeiten, Ausnahmen und Feed hängen an der Organisation und werden mit ihr gelöscht. Der Datenexport enthält Ausnahmen und die Namen der Kalender, keine Adressen.

## 8. Technische Umsetzung

### Datenmodell

```typescript
export const availabilityExceptions = pgTable('availability_exceptions', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  kind:           text('kind').$type<'blocked' | 'available'>().notNull(),
  startTime:      timestamp('start_time').notNull(),
  endTime:        timestamp('end_time').notNull(),
  allDay:         boolean('all_day').notNull().default(false), // nur für die Anzeige
  note:           text('note'),
  createdAt / updatedAt
});

export const calendarImports = pgTable('calendar_imports', {
  id:                  text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId:      text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name:                text('name').notNull(),
  urlEncrypted:        text('url_encrypted').notNull(),
  urlHint:             text('url_hint').notNull(),          // gekürzte Anzeige
  isActive:            boolean('is_active').notNull().default(true),
  blockAllDay:         boolean('block_all_day').notNull().default(false),
  syncingSince:        timestamp('syncing_since'),          // Sperre gegen parallele Abrufe
  lastAttemptAt:       timestamp('last_attempt_at'),
  lastSuccessAt:       timestamp('last_success_at'),
  lastError:           text('last_error'),                  // Fehlercode, kein Inhalt
  failingSince:        timestamp('failing_since'),
  failureMailSentAt:   timestamp('failure_mail_sent_at'),
  etag / lastModified: text(...),                           // bedingter Abruf
  createdAt / updatedAt
});

export const calendarBusyTimes = pgTable('calendar_busy_times', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  calendarImportId: text('calendar_import_id').notNull().references(() => calendarImports.id, { onDelete: 'cascade' }),
  organizationId:   text('organization_id').notNull(),  // für die Abfrage in der Slot-Berechnung
  startTime:        timestamp('start_time').notNull(),
  endTime:          timestamp('end_time').notNull(),
}); // Index auf (organization_id, start_time)

// Feed: zwei Spalten an availability_settings
calendarFeedToken:        text('calendar_feed_token').unique(),
calendarFeedHideNames:    boolean('calendar_feed_hide_names').notNull().default(false),
```

Ein erfolgreicher Abruf ersetzt die belegten Zeiten seines Kalenders in einer Transaktion (löschen, einfügen). Überlappende Zeiten werden vorher zusammengefasst.

### Slot-Berechnung

`computeAvailableSlots` (`apps/api/src/availability/slot-calculation.ts`) bekommt zusätzlich `extraWindows: DateRange[]` für freigegebene Ausnahmen. Sie werden mit den Zeitfenstern der Wochenzeiten des jeweiligen Tages vereinigt, damit überlappende Fenster keine doppelten Slots erzeugen. Gesperrte Ausnahmen und belegte Zeiten gehen in die bestehenden `excludeRanges`. `resolveOfferAndSlots` in `OrganizationService` lädt alles; sie dient der Slot-Anzeige und der Buchungserstellung, damit gilt die Sperre an beiden Stellen. `isWithinAvailability` berücksichtigt freigegebene Ausnahmen ebenfalls.

### Endpunkte

| Methode und Pfad | Zweck |
|---|---|
| `GET/POST /api/v1/availability-exceptions`, `PATCH/DELETE …/:id` | Ausnahmen |
| `GET/POST /api/v1/calendar-imports`, `PATCH/DELETE …/:id` | Kalender verwalten; `POST` ruft sofort ab |
| `POST /api/v1/calendar-imports/sync` | Abgleich aller Kalender, Body `{ trigger: 'activity' \| 'manual' }`; Mindestabstand serverseitig |
| `GET /api/v1/calendar-feed`, `PATCH`, `POST …/regenerate` | Feed-Adresse und Einstellung |
| `GET /api/v1/calendar-feeds/:token.ics` | öffentlicher Feed, ohne Session |

### Abruf und Läufe

- **Parser:** `ical.js` (Mozilla, auch in Thunderbird) für Zeitzonen und Serientermine.
- **`CalendarImportSyncService`:** `@Cron` alle 5 Minuten, höchstens 3 Abrufe gleichzeitig. Alle Anlässe aus Abschnitt 3.3 laufen über dieselbe Methode; `syncingSince` verhindert doppelte Abrufe desselben Kalenders. Nach einem Abgleich mit geänderten Zeiten meldet der Ereigniskanal (SSE) der Coach-App, dass sie die Wochenansicht neu laden soll.
- **Fehler-Mail:** neue Vorlage `mail/templates/coach/calendar-import-failing.tsx`.
- **Feed:** Erzeugung über `mail/ics.ts`, erweitert um `STATUS`, `SEQUENCE` und Kopfzeilen für den Kalender (`X-WR-CALNAME`, `X-PUBLISHED-TTL`, `REFRESH-INTERVAL`).
- **Coach-Mails:** `BookingsService` hängt an „Neue Buchung“ und „Termin abgesagt“ die Datei aus `buildBookingIcs` an, wie bei den Klienten-Mails. Die Links für Google und Outlook entstehen in einem kleinen Helfer neben `mail/ics.ts`.

## 9. Reihenfolge der Umsetzung

1. **Ausnahmen** ✅ umgesetzt: Tabelle, Endpunkte, Erweiterung der Slot-Berechnung, Reiter „Ausnahmen“, Blöcke in der Wochenansicht, Hinweis beim manuellen Anlegen. Legt die Grundlage, auf der der Import aufsetzt.
2. **Import:** Tabellen, Abruf mit SSRF-Schutz und Verschlüsselung, Lauf, Reiter „Kalender“, Anlässe aus 3.3, Fehler-Mail.
3. **Feed und Coach-Mails:** Token, öffentlicher Endpunkt, Logfilter, Abschnitt „Termine in deinem Kalender“; Kalenderdatei und Links in „Neue Buchung“ und „Termin abgesagt“.

**Abnahme:** je Schritt im Browser: Sperre setzen → Slot verschwindet auf der Buchungsseite; privaten Termin im Google-Kalender anlegen → nach „Jetzt abgleichen“ ist der Slot weg; Feed in Apple Kalender abonnieren → Buchung erscheint, Absage verschwindet.
