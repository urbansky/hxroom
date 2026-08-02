# HxRoom · Konzept: Angebote & Verfügbarkeiten

Entwurf v2 · Zwei-Stufen-Modell: Standard-Verfügbarkeit für alle Angebote, optionale Ausnahme pro Angebot.

**Änderung gegenüber v1:** Die ursprüngliche Slot→Angebote-Zuordnung (Coach wählt pro Verfügbarkeitsregel aktiv aus, welche Angebote dort gelten, Default = leer) wurde umgedreht. Grund: Für die Zielgruppe (nicht-technische Solo-Coaches, siehe `project.md`) ist "alles ist überall buchbar, außer ich sage explizit etwas anderes" der erwartbare Normalzustand. Ein Pflicht-Zuordnungsschritt pro neuem Slot hätte zu stillen "keine Termine buchbar"-Zuständen und Support-Tickets geführt. Außerdem sieht das bestehende Onboarding (`funktionen/backoffice-coach.md`, Checkliste "Logo → Buchungszeiten → erste Einladung") nur *eine* Verfügbarkeitskonfiguration vor, nicht eine pro Angebot.

---

## 1. Ziel

Bisher legt der Coach nur generische Verfügbarkeiten fest (Wochentag + Uhrzeit), ohne dass diese an ein konkretes Angebot gebunden sind. Es gibt kein eigenständiges Datenobjekt „Angebot" – Sitzungsdauer hing bisher direkt an der Buchung (`bookings.durationMinutes`).

Dieses Konzept führt **Angebote** als eigenes Objekt ein und verknüpft sie mit **Verfügbarkeiten**, sodass der Coach steuern kann: *„In diesem Zeitfenster biete ich diese Sitzungsformate an."*

## 2. Geltungsbereich v1

- Nur **Einzelsitzungen**. Ein Angebot entspricht genau einer Sitzung mit fester Dauer.
- **Pakete (Mehrfachsitzungen, z.B. „5er-Paket") werden aus der Roadmap für diese Version herausgenommen** und später als eigenständiges Konzept nachgezogen (Guthaben-Tracking, Paketkauf, Zuordnung mehrerer Bookings zu einem Kauf – siehe Abschnitt 7).
- Bezahlung/Stripe-Integration ist unabhängig davon und bleibt wie geplant ein späterer Ausbauschritt. Der Preis wird als Feld am Angebot geführt, aber in v1 rein informativ (keine Zahlungsabwicklung).

## 3. Datenmodell

### 3.1 Neue Tabelle `offers`

```typescript
export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  coachId: text('coach_id').notNull(),          // better-auth userId
  name: text('name').notNull(),                 // z.B. "Coaching-Sitzung"
  durationMinutes: integer('duration_minutes').notNull(),
  price: integer('price_cents'),                // optional, in Cent; null = kein Preis hinterlegt
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  useCustomAvailability: boolean('use_custom_availability').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
```

- `isActive`: Angebot kann pausiert werden, ohne vergangene Buchungen zu verlieren (kein Hard-Delete nötig).
- `sortOrder`: Reihenfolge auf der Buchungsseite frei steuerbar.
- `price` bewusst nullable: Coach kann Angebot ohne Preis anlegen (z.B. „auf Anfrage"), passt zum bestehenden „Erstgespräch kostenlos"-Fall.
- `useCustomAvailability`: **Kernschalter des Zwei-Stufen-Modells.** `false` (Default) = Angebot ist automatisch in der gesamten allgemeinen Verfügbarkeit des Coaches buchbar, keine weitere Konfiguration nötig. `true` = Angebot ist nur in den explizit zugeordneten Slots buchbar (siehe 3.2).

### 3.2 Stufe 2 – Ausnahme-Zuordnung: `offer_availability_slots`

Nur relevant für Angebote mit `useCustomAvailability = true`. Der Coach wählt aus seinen bestehenden Verfügbarkeitsslots eine Teilmenge aus, die für dieses Angebot gilt. Kein eigenes, unabhängiges Zeitraster pro Angebot – bewusst als **Teilmenge der bestehenden `availabilitySlots`**, damit es weiterhin nur eine Quelle für Zeitfenster gibt (kein doppeltes Pflegen von Wochenzeiten).

```typescript
export const offerAvailabilitySlots = pgTable('offer_availability_slots', {
  offerId: uuid('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  slotId: uuid('slot_id').notNull().references(() => availabilitySlots.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.offerId, table.slotId] }),
}));
```

**Buchbarkeits-Logik (Pseudocode):**

```
verfügbareSlots(offer):
  if offer.useCustomAvailability == false:
    return alle availabilitySlots des Coaches
  else:
    return availabilitySlots, verknüpft über offer_availability_slots für diese offerId
```

**Warum Teilmenge statt eigenem unabhängigem Zeitraster:** Einfacher zu pflegen (Checkbox-Liste statt neuer Wochenplan-Editor), passt zum "Ausnahme, nicht Regel"-Charakter von Stufe 2. Falls sich in der Praxis zeigt, dass Coaches für einzelne Angebote komplett andere Zeiten brauchen, die in keinem bestehenden Slot enthalten sind, legen sie diesen Slot einmalig in der allgemeinen Verfügbarkeit an (ggf. nur für sich selbst sichtbar relevant) und wählen ihn dann für das Angebot aus – kein Sonderfall im Datenmodell nötig.

### 3.3 Erweiterung `bookings`

```typescript
export const bookings = pgTable('bookings', {
  // ... bestehende Felder
  offerId: uuid('offer_id').references(() => offers.id),  // nullable
  offerName: text('offer_name'),      // Snapshot zum Buchungszeitpunkt
  durationMinutes: integer('duration_minutes').notNull(), // bleibt, wird aus Angebot übernommen
  // ...
});
```

- `offerId` ist **nullable**, damit manuell angelegte Termine ohne Angebotsbezug weiterhin funktionieren (siehe Funktion „Termin manuell anlegen").
- `offerName` und `durationMinutes` werden als **Snapshot** zum Buchungszeitpunkt aus dem Angebot kopiert. Grund: Ändert der Coach später Name oder Dauer eines Angebots, sollen vergangene/bestehende Buchungen unverändert bleiben (typisches E-Commerce-Muster, verhindert nachträgliche Dateninkonsistenz in Kalender und Rechnungen).

## 4. Coach-Workflow (Backoffice)

1. **Angebot anlegen** (neuer Bereich "Angebote", analog zum bestehenden Sitzungsformate-Mockup in `poc/backoffice-coach.html`): Name, Dauer, Preis, Aktiv-Schalter. Kein weiterer Pflichtschritt – das Angebot ist ab Speichern automatisch in der gesamten allgemeinen Verfügbarkeit buchbar (Stufe 1, Default).
2. **Optional: eigene Zeiten für dieses Angebot** – Schalter „Eigene Zeiten verwenden" direkt am Angebot (nicht am Slot). Aktiviert der Coach ihn, erscheint eine Checkbox-Liste seiner bestehenden Verfügbarkeitsslots ("Mo 9–17", "Di 9–12", …) zur Auswahl. Nur ausgewählte Slots gelten dann für dieses eine Angebot.
3. **Verfügbarkeiten konfigurieren** (unverändert bestehende Funktion): Coach pflegt seine Wochenzeiten wie bisher, ohne Angebotsbezug. Legt er einen neuen Slot an, gilt dieser automatisch für alle Angebote in Stufe 1. Für Angebote in Stufe 2 (`useCustomAvailability = true`) zeigt die UI einen Hinweis: „Diese Angebote nutzen eigene Zeiten und sind hier ggf. nicht automatisch enthalten: [Liste]" – damit der Coach aktiv entscheidet, ob der neue Slot auch für die Ausnahme-Angebote gelten soll, statt es zu vergessen.
4. Ein Angebot mit `useCustomAvailability = true` und **keiner** Slot-Auswahl ist auf der Buchungsseite nicht buchbar – die UI warnt in diesem Zustand deutlich sichtbar im Angebots-Bereich ("Kein Zeitfenster ausgewählt – Angebot aktuell nicht buchbar"), statt es still verschwinden zu lassen.

## 5. Klienten-Buchungsflow

1. Klient öffnet die Buchungsseite und sieht zunächst die Liste der aktiven Angebote (Name, Dauer, Preis).
2. Nach Auswahl eines Angebots wird serverseitig ermittelt: `useCustomAvailability = false` → alle Verfügbarkeitsslots des Coaches gelten; `= true` → nur die über `offer_availability_slots` zugeordneten Slots.
3. Innerhalb der ermittelten Slots werden buchbare Zeitfenster in der Länge `offer.durationMinutes` generiert – unter Berücksichtigung von Pufferzeit und bereits belegten Terminen (bestehende Logik bleibt gleich, nur die Dauer kommt jetzt vom Angebot statt fix vorgegeben).
4. Bei Buchung wird `offerId` gesetzt und `offerName`/`durationMinutes` als Snapshot übernommen, die Buchung entsteht mit Status `pending` und der Slot ist vorläufig reserviert.
5. **Bestätigungspflicht:** Der Klient erhält eine Mail mit einem signierten Bestätigungslink. Erst der Klick macht die Buchung final (`confirmed`) und legt den Klienten-Datensatz an bzw. verknüpft ihn mit einem bestehenden (E-Mail-Matching, siehe `idee-klienten-matching.md`). Ohne Klick innerhalb einer TTL verfällt die Buchung automatisch, der Slot wird wieder frei.

## 6. Migration Bestandsdaten

Für Coaches, die vor Einführung dieses Features bereits Verfügbarkeiten angelegt haben:

1. Migration erzeugt pro Coach automatisch ein Default-Angebot, z.B. „Coaching-Sitzung" mit der bisher verwendeten Standarddauer (60 min), `useCustomAvailability = false`.
2. Dadurch ist es dank Stufe 1 automatisch in der gesamten bestehenden Verfügbarkeit buchbar – **kein zusätzlicher Verknüpfungsschritt in `offer_availability_slots` nötig**, da Default-Angebote keine Einträge dort brauchen.
3. Bestehende `bookings` erhalten das Default-Angebot als `offerId` (Snapshot-Felder aus den vorhandenen `durationMinutes` übernommen).

So bleibt die Buchungsseite für Bestandscoaches ohne manuellen Eingriff funktionsfähig.

## 7. Out of Scope für v1 (Roadmap später)

- **Pakete / Mehrfachsitzungen**: Erfordert zusätzliches Konzept für Guthaben-Tracking (z.B. „3 von 5 Sitzungen verbraucht"), Verknüpfung mehrerer `bookings` zu einem Paketkauf, sowie Zahlungsabwicklung beim Paketkauf. Wird nach v1 als eigenständiges Konzept ausgearbeitet.
- **Preis-basierte Zahlungsabwicklung** (Stripe „Bezahlung bei Buchung"): Bleibt wie im bestehenden Funktionskatalog ein Pro-Feature, unabhängig von diesem Konzept.
- **Sitzungsformat-spezifische Pufferzeiten**: In v1 gilt eine globale Pufferzeit pro Coach, nicht pro Angebot.

## 8. Offene Fragen

| # | Frage | Auswirkung |
|---|---|---|
| 1 | Was passiert mit bestehenden Buchungen, wenn ein Coach ein Angebot komplett löscht (statt nur zu deaktivieren)? | Sollte durch Snapshot-Felder in `bookings` bereits abgefangen sein – zu verifizieren |
| 2 | Soll die Reihenfolge der Angebote auf der Buchungsseite pro Slot unterschiedlich sein, oder gilt global `sortOrder`? | Nur global in v1, sonst zusätzliche Komplexität |
| 3 | Schaltet ein Coach `useCustomAvailability` nachträglich von `true` zurück auf `false`, sollen die Einträge in `offer_availability_slots` gelöscht oder nur ignoriert werden? | Empfehlung: löschen, um verwaiste Daten zu vermeiden – zu bestätigen |
| 4 | Braucht das kostenlose Erstgespräch eine Begrenzung „einmal pro Klient"? | Nicht Teil dieses Konzepts, aber real genannter Bedarf – ggf. eigenes Ticket |
| 5 | Reicht die Teilmengen-Auswahl bestehender Slots (Stufe 2) in der Praxis, oder brauchen einzelne Coaches doch ein komplett unabhängiges Zeitraster pro Angebot? | Erst nach Nutzerfeedback zu Stufe 2 entscheiden |
| 6 | TTL für die Bestätigungspflicht bei sehr kurzfristigen Buchungen (Termin in wenigen Minuten) – Zeitfenster kappen oder Bestätigung direkt im Buchungsprozess verlangen? | Siehe `idee-klienten-matching.md`, zu entscheiden vor Umsetzung |
| 7 | Gilt die Bestätigungspflicht auch für vom Coach manuell angelegte/eingeladene Termine? | Für Konsistenz spricht Ja, für persönlich abgesprochene Termine ggf. unnötige Reibung – siehe `idee-klienten-matching.md` |
