# Vorschlag: CRM – Klientenbeziehung pflegen

*Status: Vorschlag, noch nicht in `zeitplan.md` eingeplant. Erweitert Abschnitt 3 „Klienten-Verwaltung (CRM)“ aus `backoffice-coach.md` und berührt 4.04 (Aufgaben), 5.02 (Pakete) und 5.04 (Umsatzübersicht).*

## 1. Zweck und Maßstab

Coachs sehen ihre Klienten als Kunden und wollen die Beziehung pflegen: Interessenten nicht verlieren, laufende Begleitungen im Blick behalten, sich nach dem Abschluss wieder melden. HxRoom unterstützt das als **einfaches CRM** (`project.md`): Pflege der Kundenbeziehung ja, Vertriebssoftware nein. Das ist auch die Abgrenzung zu Werkzeugen mit umfangreichem CRM wie CoachAccountable.

**Vorhanden:**
- Klientenliste und Klientenseite mit Terminen, Notizen-Chronik und Dateien
- Coaching-Ziele und interne Notiz als Freitext
- Klient manuell anlegen, Buchungen zuordnen, Klient löschen mit Protokoll

**Grundsätze:**
- HxRoom weist den Coach hin, schreibt aber Klienten nicht von sich aus an.
- Hinweise verschwinden von selbst, sobald sich die Lage geändert hat (z. B. ein neuer Termin steht).
- Status und Kennzahlen entstehen aus den vorhandenen Terminen; der Coach muss nichts doppelt pflegen.

## 2. Anwendungsfälle

| Bereich | Anwendungsfall |
|---|---|
| Vom Interessenten zum Klienten | Erstgespräch geführt, aber kein Folgetermin: der Coach soll nachfassen. Woher kommen Klienten (Empfehlung, Website, LinkedIn)? |
| Laufende Begleitung | Ein Coaching hat einen Umfang („10 Sitzungen bis März“), ein Anliegen und Ziele. Wie viel ist davon schon genutzt, was ist erreicht? |
| Beziehung pflegen | „In 3 Monaten nachfragen, wie es mit dem neuen Job läuft.“ Ein aktiver Klient hat seit Wochen keinen Termin mehr. |
| Business-Coaching | Eine Firma zahlt, gecoacht wird ihr Mitarbeiter, Ansprechpartner ist HR. Die Rechnung geht an die Firma, die Inhalte bleiben beim Coach. |
| Ordnen und finden | Klienten nach Status, Schlagwort oder Herkunft filtern; Bestandsklienten aus dem bisherigen System übernehmen. |
| Auswertung | Wie viele Erstgespräche werden zu Klienten, und warum die anderen nicht? Umsatz je Klient und je Firma. |
| Kommunikation | Mails an einzelne Klienten mit Vorlagen; Check-in nach Abschluss; Testimonials einholen. |

## 3. Stufe 1 · Beziehung pflegen (~25 h)

*Der Coach sieht, wo jeder Klient steht und um wen er sich kümmern sollte.*

| Baustein | Inhalt | h | Bezug |
|---|---|---:|---|
| **Status im Lebenszyklus** | Interessent · aktiv · pausiert · abgeschlossen · nicht weitergeführt. Aus den Terminen abgeleitet, vom Coach übersteuerbar. „Abgeschlossen“ übernimmt die Rolle des Archivs. | 4 | ersetzt 3.07 |
| **Wiedervorlagen** | Pro Klient „Erinnere mich am … an …“. Dashboard-Karte „Fällig“, Hinweis auf der Klientenseite. | 5 | neu |
| **Nachfassen nach dem ersten Termin** | siehe Abschnitt 4 | 4 | neu |
| **Inaktivitäts-Hinweis** | Aktiver Klient ohne Termin seit x Wochen und ohne nächsten Termin; gleiche Karte und Aktionen wie das Nachfassen | 2 | neu |
| **Herkunft & Schlagworte** | Herkunft als Auswahl mit Freitext („Empfehlung durch …“), freie Schlagworte | 3 | erweitert 3.05 |
| **Suche & Filter** | Volltext über Name, E-Mail und Schlagworte; Filter nach Status, Schlagwort, Herkunft und letztem Termin | 3 | 3.06 |
| **CSV-Import** | Bestandsklienten mit Zuordnung der Spalten, Vorschau und Erkennung von Dubletten über die E-Mail-Adresse | 4 | erweitert 3.03 |

**Fertig, wenn** ein Coach seine Bestandsklienten importiert hat, ein Erstgespräch ohne Folgetermin nach 7 Tagen im Dashboard auftaucht und eine Wiedervorlage pünktlich erscheint.

**Abhängigkeiten:** keine.

## 4. Nachfassen nach dem ersten Termin

### Erkennung

Ein Klient erscheint, wenn alles zutrifft:

- genau ein stattgefundener Termin (nicht abgesagt, vorbei)
- kein künftiger Termin, weder bestätigt noch offen
- der Termin liegt mindestens x Tage zurück (Vorgabe 7, in den Einstellungen änderbar)
- der Coach hat den Fall nicht erledigt oder auf später gelegt

Die Erkennung geht vom Verlauf aus, nicht vom Angebot: Wer direkt eine normale Sitzung bucht und nicht wiederkommt, ist derselbe Fall. Eine Markierung „Kennenlerngespräch“ am Angebot wäre eine optionale Verfeinerung.

### Wo der Coach es sieht

| Wo | Wie |
|---|---|
| Abschlusskarte nach dem Call | War es der erste Termin dieses Klienten, steht „Folgetermin anlegen“ vorn, daneben „Später erinnern“. |
| Dashboard | Karte „Nachfassen“, nur wenn es Fälle gibt: Name, erster Termin, wie lange her, Aktionen |
| Klientenliste | Badge „Nachfassen“ und passender Filter |
| Klientenseite | schmaler Hinweis oben mit denselben Aktionen |
| E-Mail an den Coach (optional) | höchstens eine Wochenübersicht am Montag, abschaltbar über die Benachrichtigungen (7.06) |

```
┌─ Nachfassen ───────────────────────────────────────────────┐
│ Erstgespräch geführt, noch kein weiterer Termin             │
│                                                             │
│ Julia Neumann     Erstgespräch am 21.10. · vor 14 Tagen     │
│   [Termin anlegen]  [Nachricht]  [Später ▾]  [Erledigt ▾]   │
└─────────────────────────────────────────────────────────────┘
```

### Aktionen

| Aktion | Wirkung |
|---|---|
| **Termin anlegen** | öffnet den Folgetermin-Dialog (`manuelle-termine.md`). Mit dem neuen Termin ist der Fall erledigt, auch wenn der Klient selbst über die Buchungsseite bucht. |
| **Nachricht** | öffnet das Mailprogramm des Coachs (`mailto:`) mit Betreff, kurzem Textvorschlag und Link zur Buchungsseite. HxRoom versendet nichts. |
| **Später** | Wiedervorlage in 1, 2 oder 4 Wochen; bis dahin ausgeblendet |
| **Erledigt** | optional mit Grund: kein Bedarf · Preis · passt nicht · meldet sich selbst · anderer Grund. Status „nicht weitergeführt“. |

Ein Fall, den niemand bearbeitet, verschwindet nach 60 Tagen und zählt als „nicht weitergeführt“. Die Gründe fließen in die Auswertung (Stufe 2): „Von 12 Erstgesprächen wurden 7 zu Klienten, häufigster Grund dagegen: Preis.“

## 5. Stufe 2 · Aufträge & Auftraggeber (~27 h)

*Coaching als Auftrag mit Umfang, Ziel und Rechnungsempfänger, nicht nur als Folge von Terminen.*

| Baustein | Inhalt | h | Bezug |
|---|---|---:|---|
| **Coaching-Auftrag** | Anliegen, vereinbarter Umfang, Zeitraum, Abschluss mit kurzem Fazit. Ein Klient kann nacheinander mehrere Aufträge haben; Termine hängen am Auftrag. | 6 | neu |
| **Kontingent** | „4 von 10 Sitzungen“: stattgefundene Termine zählen ab, Hinweis bei wenigen verbleibenden. Pakete über die Buchungsseite kaufen erst mit der Klientenzahlung (5.01). | 5 | 5.02 (teilweise) |
| **Firma als Auftraggeber** | Firma mit Ansprechpartner und Rechnungsadresse; Klient optional zugeordnet. Rechnungen gehen wahlweise an Klient oder Firma. Was die Firma erfährt (Termine, Anzahl), ist strikt getrennt von Notizen und Zielen. | 6 | neu |
| **Ziele mit Verlauf** | Ziel, Stand, erreicht; der bisherige Freitext wird übernommen | 3 | erweitert 3.05 |
| **Zeitleiste** | Termine, Absagen, Notizen, Dateien, Rechnungen und Wiedervorlagen eines Klienten in einer Spur | 3 | neu |
| **Auswertung** | je Klient: Sitzungen, Dauer der Beziehung, Umsatz; gesamt: aktive Klienten, Quote vom Erstgespräch zum Klienten mit Gründen, Herkunft, Umsatz je Firma | 4 | erweitert 5.04 |

**Fertig, wenn** ein Coach einen Auftrag über 10 Sitzungen für den Mitarbeiter einer Firma anlegt, die Termine abgezählt werden und die Rechnung an die Firma geht.

**Abhängigkeiten:** Rechnungsstellung aus Phase 8 (gleiches Datenmodell für Empfänger und Umsatz); für den Kauf von Paketen zusätzlich die Klientenzahlung (5.01).

## 6. Stufe 3 · Kommunikation & Klienten-Bereich

*Ohne Schätzung, abhängig von der Nachfrage aus der Praxis.*

- **Mailvorlagen und Versand aus HxRoom:** Mails landen in der Zeitleiste und ersetzen das `mailto:` beim Nachfassen.
- **Nachbetreuung:** Check-in-Erinnerung x Wochen nach Abschluss eines Auftrags.
- **Abschlussfeedback und Testimonials:** mit dokumentierter Einwilligung, optional auf der Buchungsseite.
- **Klienten-Bereich:** Termine, Aufgaben (4.04) und geteilte Dateien für den Klienten per Token-Link, ohne Account. Zu prüfen, ob das noch zum einfachen CRM passt.
- **Rundmails an Gruppen von Klienten:** nur nach rechtlicher Klärung (Abschnitt 8).

## 7. Datenmodell (Skizze)

| Stufe | Änderung |
|---|---|
| 1 | `clients`: `status`, `statusOverridden`, `source`, `sourceNote`, `tags`; Felder für das Nachfassen (`followUpClosedAt`, `followUpReason`) |
| 1 | neue Tabelle `client_reminders` (Klient, fällig am, Text, erledigt am) – trägt Wiedervorlagen und „Später“ beim Nachfassen |
| 2 | neue Tabellen `engagements` (Auftrag mit Umfang und Zeitraum), `client_goals`, `companies`; `bookings.engagementId`, `clients.companyId` |

Die Fälle für Nachfassen und Inaktivität werden per Abfrage ermittelt, nicht gespeichert. Einen eigenen Hintergrundjob braucht nur die optionale Wochenmail; dafür reicht der vorhandene Lauf der Erinnerungsmails.

## 8. Datenschutz

- **Gesundheitsdaten:** Strukturierte Felder zu Anliegen, Zielen und Hintergründen rücken näher an Art. 9 DSGVO. Feldbezeichnungen und Hilfetexte so wählen, dass sie nicht zur Erfassung von Diagnosen einladen.
- **Auftraggeber:** Was eine Firma sieht oder auf ihrer Rechnung steht, enthält keine Inhalte aus Notizen oder Zielen.
- **Einwilligungen:** Testimonials und Mails außerhalb der Terminabwicklung brauchen eine dokumentierte Einwilligung des Klienten.
- **Rundmails** sind Werbung im Sinne von UWG §7: Der Coach braucht eine Einwilligung oder die Bestandskunden-Ausnahme, HxRoom wäre Auftragsverarbeiter. Vor dem Bau rechtlich klären.
- **Auskunft je Klient (Art. 15) und Löschvorschlag nach Ablauf einer Aufbewahrungsfrist** gehören nicht zum CRM, sondern in die DSGVO-Prüfung vor dem Launch (Phase 9, ~4 h).

## 9. Einordnung in den Fahrplan

| Stufe | Aufwand | Zeitpunkt |
|---|---:|---|
| 1 · Beziehung pflegen | ~25 h | eigene Phase nach Phase 7 (Billing), damit der Meilenstein „zahlende Kunden“ nicht später kommt |
| 2 · Aufträge & Auftraggeber | ~27 h | zusammen mit Phase 8, weil sie das Datenmodell der Rechnungen teilt |
| 3 · Kommunikation & Klienten-Bereich | offen | nach dem Launch |

Stufe 1 und 2 zusammen verschieben den Launch um etwa 7 Wochen, Stufe 1 allein um etwa 3,5 Wochen (bei 7,2 h/Woche).

**Prüfpunkt nach Phase 7:** Feedback der Beta-Coaches auswerten.
- Nennen sie fehlende Klientenpflege als Hindernis, rückt Stufe 1 vor Phase 7.
- Spielt Business-Coaching mit Firmenkunden kaum eine Rolle, entfällt in Stufe 2 die Firma (~21 h).

## 10. Offene Fragen

1. Wie wichtig sind Coachs mit Firmenkunden – volle Stufe 2 oder ohne Firma?
2. Stufe 2 vor oder nach dem Launch?
3. Erkennung beim Nachfassen: reicht „erster Termin, danach nichts“, oder sollen Angebote als Erstgespräch markiert werden?
4. Vorgabe für x beim Nachfassen: 7 Tage?
5. Rundmails grundsätzlich vorsehen oder bewusst nicht?
