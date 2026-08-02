# Idee: Klienten-Matching über mehrere Buchungen hinweg

Status: **Integriert** (2026-08-02) in `technisches-konzept.md` (clients-/bookings-Schema, §7 Authentifizierung, §12 BullMQ), `funktionen/angebote-verfuegbarkeiten.md` (Klienten-Buchungsflow, offene Fragen) und `funktionen/backoffice-coach.md` (Funktionen 02 und 04). Diese Datei bleibt als Herleitung/Begründung erhalten, ist aber nicht mehr die primäre Quelle – Änderungen künftig in den Hauptdokumenten vornehmen.

## Problem

Ein Coach führt mit demselben Klienten oft mehrere Sitzungen durch. Damit die Klientenverwaltung (CRM) funktioniert – Sitzungshistorie, Notizen-Chronik, Paketpreise, Umsatzübersicht – müssen mehrere Buchungen zuverlässig demselben Klienten-Datensatz zugeordnet werden. Das ist ein **Must-have**, kein Nice-to-have: Ohne verlässliche Zuordnung zerfällt die Kontinuität der Coaching-Beziehung, die den eigentlichen Wert des Produkts ausmacht.

## Warum nicht: Klienten-Accounts

Wurde geprüft und verworfen. Ein Pflicht-Account für Klienten würde:

- der bestehenden Produktentscheidung widersprechen ("Klient → kein Account, kein Login → Zugang nur via signiertem Token", siehe `technisches-konzept.md` §8, aktiv beworben in `blog/online-coaching-ohne-account.md`)
- Reibung genau an der Stelle einführen, an der Coaches am empfindlichsten sind: dem Erstkontakt/kostenlosen Erstgespräch
- das eigentliche Problem nicht lösen – nichts hindert dieselbe Person daran, sich mit einer zweiten E-Mail ein zweites Konto anzulegen. Das Fragmentierungsproblem ist ein Identitätsproblem, kein Auth-Problem.

## Marktvergleich (zur Einordnung)

- **Calendly**: natives Contacts-Feature (seit 2024), matcht automatisch über die E-Mail-Adresse, aktualisiert Kontaktprofile bei jeder Buchung. Keine Merge-Funktion für Duplikate durch unterschiedliche E-Mail-Adressen derselben Person – bekannte Schwäche, auch in der eigenen Community dokumentiert.
- **Cal.com**: kein persistentes Matching überhaupt. `Attendee` hängt direkt an der jeweiligen Buchung, kein Unique-Constraint auf E-Mail, keine übergeordnete Kontakt-Tabelle. Positioniert sich bewusst als reine Scheduling-Infrastruktur, nicht als CRM.
- Kein Wettbewerber im Segment löst das Problem sauber – HxRoom kann sich hier differenzieren.

## Was ein Coach tatsächlich erwartet

Der Coach denkt in Beziehungen, nicht in Datensätzen. Kernanforderungen daraus:

- Es soll einfach funktionieren, ohne dass er das System verstehen muss.
- **Er behält die Kontrolle** – er kennt seine Klienten oft besser als jeder Algorithmus und muss falsche Zuordnungen jederzeit korrigieren können.
- Die Plattform soll seine bestehende Praxis respektieren (Bestandsklienten, manuelle Anlage), nicht ersetzen.
- Der Buchungsprozess darf seinen professionellen Auftritt gegenüber dem Klienten nicht stören (keine unnötige Hürde für den Klienten).
- Geschäftliche Daten (Pakete, Rechnungen, Umsatz) dürfen durch fehlerhafte Zuordnung nicht durcheinandergeraten.

## Konzept: drei Bausteine

### 1. E-Mail-Matching (Basis)

Normalisierte E-Mail-Adresse (lowercase, getrimmt) als Matching-Schlüssel, ein Klient pro `(Organization, E-Mail)` – analog zum bereits bestehenden Schema-Entwurf in `technisches-konzept.md` (`clients`-Tabelle, Unique-Constraint auf `organizationId + email`). Bei einer neuen Buchung wird geprüft, ob diese Kombination existiert: Treffer → verknüpfen, kein Treffer → neuer Klient.

### 2. Bestätigungspflicht per Mail – für jede Buchung

- Buchung entsteht zunächst im Status "wartet auf Bestätigung" (`pending`), Slot ist vorläufig reserviert.
- Klient erhält eine Mail mit einem signierten Bestätigungslink (derselbe Mechanismus, der später auch den Warteraum-Zugang gibt – keine zweite Mail nötig).
- Klick auf den Link → Buchung wird final (`confirmed`), Slot ist fix. **Erst jetzt** wird der Klienten-Datensatz endgültig angelegt bzw. verknüpft – so bleiben keine "Geister-Klienten" durch nie bestätigte Buchungen im System zurück.
- Keine Bestätigung innerhalb eines Zeitfensters (z. B. 30 Minuten) → Buchung verfällt automatisch (`cancelled`), Slot wird wieder frei.
- Nebeneffekt: Ein erfolgreicher Klick belegt, dass die Person tatsächlich Zugriff auf dieses Postfach hat – das macht das E-Mail-Matching aus Baustein 1 verlässlicher, nicht nur tippfehlerfrei.

**Offene Frage:** Bei sehr kurzfristigen Buchungen (Termin in 15 Minuten) ist ein fixes 30-Minuten-Zeitfenster zu lang. Zu klären: TTL an die Vorlaufzeit bis zum Termin koppeln, oder Bestätigung bei knappem Vorlauf direkt im Buchungsprozess selbst verlangen (kein Pending-Zustand nötig).

**Weitere offene Frage:** Gilt die Bestätigungspflicht auch für vom Coach manuell angelegte/eingeladene Termine (bestehende Funktion "Termin manuell anlegen / einladen")? Spricht für Konsistenz, könnte aber unnötige Reibung bei ohnehin persönlich abgesprochenen Terminen erzeugen.

### 3. Manuelle Zuordnung durch den Coach

- In der Terminübersicht bzw. beim Öffnen einer Buchung kann der Coach den zugeordneten Klienten jederzeit ändern – unabhängig vom Ergebnis des automatischen Matchings.
- Einfache Suche im eigenen Klientenstamm, keine technischen Details sichtbar.
- Deckt zwei Fälle ab: Korrektur eines falschen automatischen Matches (Coach weiß es besser) und Verknüpfung bei manuell angelegten Terminen direkt mit einem bestehenden Klienten statt nur über die E-Mail.
- Dies ist der aus Coach-Sicht wichtigste Baustein: das automatische Matching ist nur die unsichtbare Grundlage, die Kontrolle muss beim Coach liegen.

## Zusammenspiel

E-Mail-Matching trägt den Regelfall automatisch. Die Bestätigungspflicht erhöht die Verlässlichkeit dieses Signals (kein reines Vertrauen auf korrekt getippten Text mehr). Die manuelle Zuordnung ist das Sicherheitsnetz, das dem Coach in jedem Fall das letzte Wort gibt – unabhängig davon, was Baustein 1 und 2 ergeben haben.

## Betroffene Stellen im bestehenden Konzept (für spätere Integration)

- `technisches-konzept.md`: `clients`-Schema (Normalisierung ergänzen), `bookings.status`-Flow (Bestätigungsschritt einbauen), Beschreibung des Bestätigungsmail-Mechanismus in §8/§Buchungsflow.
- `funktionen/angebote-verfuegbarkeiten.md`: Abschnitt "Klienten-Buchungsflow" um Bestätigungsschritt ergänzen.
- `funktionen/backoffice-coach.md`: Abschnitt "Klienten-Verwaltung (CRM)" um neue Funktion "Buchung manuell einem Klienten zuordnen" ergänzen.
