# Konzept: Termine manuell anlegen

*Funktion 2.04 „Termin manuell anlegen / einladen“ aus `funktionen/backoffice-coach.md`, zweiter Teil: Termine zu einem gewählten Zeitpunkt, einzeln oder mehrere in einem Vorgang (2.09). Der erste Teil, der Spontan-Termin, ist umgesetzt.*

## 1. Zweck und Umfang

Der Coach vereinbart Termine oft direkt mit dem Klienten: am Ende einer Sitzung, am Telefon, per Mail. Er trägt sie selbst ein, und der Klient bekommt alles, was er braucht: Termin, Kalendereintrag und den Weg in den Warteraum.

**Umfang:**
- Termine in der Zukunft für einen bestehenden Klienten oder eine E-Mail-Adresse
- einzeln oder bis zu 25 in einem Vorgang (Abschnitt 5)

**Nicht enthalten:**
- persönliche Nachricht des Coachs in der Mail
- vergangene Sitzungen nachtragen
- eine Serie gesammelt absagen; abgesagt wird je Termin
- Pakete mit Guthaben und Bezahlung (5.02)
- Verschieben (2.06); Abschnitt 4 nennt nur die Mail, die es dafür braucht

## 2. Anlegen

### Einstiege

| Wo | Wie | Vorbelegt |
|---|---|---|
| Klientenseite | Knopf „Termin anlegen“ im Kopf, neben „Spontan-Termin“ | Klient |
| Terminseite und Abschlusskarte nach dem Call | „Folgetermin anlegen“ (im ⋯-Menü bzw. als zweite Aktion der Karte) | Klient, Angebot, gleiche Uhrzeit eine Woche später |
| Termine | Knopf im Kopf; in der Wochenansicht Klick auf eine freie Stelle | Datum und Uhrzeit |

### Dialog

Ein Modal, aufgebaut wie der Spontan-Termin (UX-04):

- **Wer:** bestehender Klient oder E-Mail-Adresse, mit „Als Klient anlegen“. Gehört die Adresse schon einem Klienten, hängt der Termin an ihm.
- **Angebot:** vorausgewählt ist das Angebot des letzten Termins dieses Klienten, sonst das einzige aktive. Es bestimmt die Dauer. Ohne Angebot wählt der Coach die Dauer (30, 45, 60, 90 Min.).
- **Wann:** Datum und Uhrzeit, Uhrzeit im Viertelstundenraster
- **Wiederholen:** siehe Abschnitt 5
- **Hinweiszeile** über den Knöpfen: „{Name} bekommt eine E-Mail mit Kalendereintrag und dem Link zum Warteraum.“ Bei einer neuen Adresse steht die Adresse ausgeschrieben da, damit ein Tippfehler auffällt.

### Prüfungen

- **Überschneidung** mit einem anderen Termin des Coachs, einschließlich Puffer: Warnung mit Name und Uhrzeit des anderen Termins. Speichern bleibt möglich („Trotzdem anlegen“).
- **Außerhalb der Verfügbarkeit:** leiser Hinweis, kein Hindernis. Mindestvorlauf und Buchungsfenster der Buchungsseite gelten nicht.
- **Vergangenheit:** nicht möglich. Liegt der Beginn in weniger als 15 Minuten, verweist der Dialog auf den Spontan-Termin.
- **Gleiche Startzeit** wie ein bestehender Termin: abgelehnt (Index `bookings_org_start_active_unique`).

Nach dem Speichern zeigt eine Meldung den angelegten Termin mit „Link kopieren“, wie beim Spontan-Termin. Auf der Buchungsseite ist die Zeit sofort belegt, denn die Slot-Berechnung blockiert jeden nicht abgesagten Termin.

### Status

Ein manueller Termin entsteht direkt als `confirmed`, ohne Bestätigungslink. Der Coach hat ihn persönlich abgesprochen und gibt die Adresse selbst ein. Ein Tippfehler bei einer neuen Adresse fällt in der Hinweiszeile auf, und der Link steht zusätzlich zum Kopieren bereit.

## 3. Kennzeichnung

- Herkunft `manual` in `bookings.origin`, neben `booking_page`, `ad_hoc` und `test`
- Kein Abzeichen in Agenda und Kacheln
- Im Verlauf der Terminseite: „Von dir angelegt“; einen Schritt „Bestätigt“ gibt es nicht
- Zählt in allen Kennzahlen wie eine Buchung

## 4. Information des Klienten

### Grundsätze

1. **Sofort und einmal.** Die Mail geht gleich nach dem Speichern hinaus, eine pro Vorgang, auch bei mehreren Terminen.
2. **Feststellen, nicht anfragen.** Die Mail teilt einen vereinbarten Termin mit („ist eingetragen“). Eine Bestätigung braucht es nicht.
3. **Alles Nötige in einer Mail.** Ohne den Link mit Token kommt der Klient nicht in den Warteraum. Die Mail trägt ihn, und der Kalendereintrag trägt ihn ein zweites Mal.
4. **Danach gelten die bestehenden Regeln.** Erinnerungen, Absage und Warteraum funktionieren wie bei einer Buchung über die Buchungsseite.
5. **Absender ist der Coach.** Name des Coachs im Betreff, Reply-To an den Coach, Impressum und Datenschutz der Buchungsseite im Fuß.

Die Mail geht immer hinaus. Hat der Coach den Link schon auf anderem Weg geschickt, nutzt er zusätzlich „Link kopieren“.

### Ablauf

| Zeitpunkt | Mail an den Klienten | Inhalt |
|---|---|---|
| Beim Anlegen | **„Dein Termin bei {Coach}“** (neu) | Datum, Uhrzeit, Angebot, Dauer; Knopf „Zum Warteraum“ mit dem Hinweis, dass der Raum 60 Min. vorher öffnet; Kalendereintrag im Anhang; Absagelink im Fußtext |
| 24 h vorher | Erinnerung (besteht) | entfällt, wenn der Termin weniger als 24 h vor Beginn angelegt wurde |
| 1 h vorher | Erinnerung mit Link (besteht) | öffnet zeitgleich mit dem Warteraum |
| Absage durch den Coach | Absage-Mail (besteht) | mit Grund, falls angegeben |
| Verlegung (künftig, 2.06) | **„Dein Termin wurde verlegt“** | alter und neuer Zeitpunkt; Kalendereintrag mit derselben UID und höherer SEQUENCE, damit Kalender den alten Eintrag ersetzen |

Die Erinnerungsregel (`bookings/booking-reminders.ts`) schließt nur `ad_hoc` und `test` aus. `manual` fällt damit ohne Änderung unter die Erinnerungen. „Kurzfristig angelegt“ ergibt sich aus `confirmedAt` gleich Anlagezeitpunkt, wie bei einer kurzfristigen Buchung.

Liegt der Termin in weniger als 60 Minuten, ist der Warteraum beim Eintreffen der Mail schon offen. Die Mail sagt dann „Der Raum ist bereits geöffnet“.

Der Coach bekommt keine Mail. In seinem Kalender-Abo (2.07) erscheint der Termin wie jeder andere.

## 5. Mehrere Termine in einem Vorgang

Unter „Wann“ steht die Zeile **„Wiederholen“**: nicht, wöchentlich, alle zwei Wochen, dazu die Anzahl (2 bis 25). Daraus entsteht eine Liste konkreter Termine, die der Dialog sofort zeigt:

```
Wann        Di, 17.11. · 10:00
Wiederholen [wöchentlich ▾]  [5] Termine

  Di, 17.11. · 10:00
  Di, 24.11. · 10:00
  Di, 01.12. · 10:00   ⚠ überschneidet sich mit Jonas Feldmann, 10:30   [ändern] [×]
  Di, 08.12. · 10:00
  Di, 15.12. · 10:00
```

- Jede Zeile lässt sich einzeln verschieben oder streichen. Feiertage und Urlaub löst der Coach dort.
- Die Prüfungen aus Abschnitt 2 laufen je Zeile.
- Gespeichert werden **unabhängige Termine**: je ein eigener Token, eigene Erinnerungen, eigene Absage durch Coach oder Klient.
- Gespeichert wird alles oder nichts. Scheitert ein Termin, entsteht keiner, und der Dialog markiert die Zeile.
- Eine gemeinsame `series_id` verbindet die Termine. Terminseite und Klientenseite zeigen damit „Termin 2 von 5“, gezählt über die nicht abgesagten Termine der Serie in zeitlicher Folge.

**Mail:** eine Mail „Deine Termine bei {Coach}“ mit der Liste aller Termine. Jede Zeile hat eigene kleine Links „Zum Warteraum“ und „Absagen“, dazu eine Kalenderdatei mit einem Eintrag je Termin, jeder mit seinem eigenen Link. Der Text sagt, dass vor jedem Termin eine Erinnerung mit dem Link kommt.

## 6. Technische Umsetzung

Beschrieben in `technisches-konzept.md`, Abschnitt „Manuell angelegte Termine“.
