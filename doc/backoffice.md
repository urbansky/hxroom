# HxRoom · Backoffice – Funktionsliste

Das Backoffice umfasst alle Funktionen **außerhalb des aktiven Videocalls** – von der Erstregistrierung des Coaches bis zur Nachbereitung einer Sitzung. Es ist der operative Kern von HxRoom: unsichtbar für den Klienten, unverzichtbar für den Coach.

---

## 1. Onboarding & Coach-Profil
*Ersteinrichtung und persönliche Identität des Coaches*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Registrierung & Trial-Aktivierung** | Konto anlegen ohne Kreditkarte, 14-tägiger Trial startet automatisch mit vollem Feature-Zugang. | MVP |
| 02 | **Branding-Setup** | Logo hochladen, Primärfarbe wählen, eigene Sub-Domain konfigurieren (z.B. anna.hxroom.io). | MVP |
| 03 | **Profilseite des Coaches** | Kurzbiografie, Foto, Schwerpunkte – sichtbar für Klienten im Warteraum und auf der Buchungsseite. | MVP |
| 04 | **Onboarding-Checkliste** | Geführter Setup-Flow mit Fortschrittsanzeige: Logo → Buchungszeiten → erste Einladung. Kein leeres Dashboard. | MVP |
| 05 | **Eigene Domain (CNAME)** | Vollständig weiße Domain, z.B. coaching.anna-bergmann.de – kein hxroom.io sichtbar. | Pro |

---

## 2. Buchung & Kalender
*Terminverwaltung, Verfügbarkeiten, Buchungsseite für Klienten*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Verfügbarkeitszeiten konfigurieren** | Wochentage und Uhrzeiten freigeben, Pufferzeit zwischen Terminen, Buchungsvorlaufzeit (mind. X Stunden). | MVP |
| 02 | **Öffentliche Buchungsseite** | Gebrandete Seite mit Zeitauswahl, Klientenformular und automatischer Bestätigung per E-Mail inklusive Raumlink. | MVP |
| 03 | **Terminübersicht (Dashboard-Kalender)** | Tages- und Wochenansicht aller gebuchten Sitzungen mit Klientenname, Dauer und direktem Link zum Raum. | MVP |
| 04 | **Termin manuell anlegen / einladen** | Coach kann Termin direkt erstellen und Einladungslink an Klienten per E-Mail schicken – ohne öffentliche Buchung. | MVP |
| 05 | **Automatische Erinnerungen** | E-Mail-Erinnerung 24h und 1h vor der Sitzung an Klient (und optional Coach), anpassbare Texte. | MVP |
| 06 | **Termin absagen & verschieben** | Coach oder Klient kann Termin stornieren – automatische Benachrichtigung, Freigabe des Slots. | MVP |
| 07 | **Kalender-Sync (Google / Apple)** | Gebuchte Termine erscheinen automatisch im externen Kalender des Coaches. Keine Doppelbuchungen. | Pro |
| 08 | **Wiederkehrende Termine** | Regelmäßige Sitzungsserien (z.B. wöchentlich für 8 Wochen) mit einmaliger Buchung anlegen. | Später |
| 09 | **Sitzungstypen & Dauer** | Verschiedene buchbare Formate definieren: Erstgespräch (30 min, kostenlos), Standardsitzung (60 min), Intensiv (90 min). | Später |

---

## 3. Klienten-Verwaltung (CRM)
*Übersicht, Geschichte und Kontext zu jedem Klienten*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Klientenliste** | Tabellarische Übersicht aller Klienten mit letzter Sitzung, Anzahl Sitzungen, nächstem Termin. | MVP |
| 02 | **Klientenprofil** | Kontaktdaten, Notiz-Historie, alle vergangenen Sitzungen auf einen Blick, persönliche Anmerkungen des Coaches. | MVP |
| 03 | **Klient manuell anlegen** | Coach kann Klienten direkt erfassen ohne vorherige Online-Buchung – für Bestandskunden aus anderen Systemen. | MVP |
| 04 | **Coaching-Ziele & Themen** | Strukturierte Felder für Ziele, Schwerpunkte und persönliche Hintergründe – sichtbar nur für den Coach. | MVP |
| 05 | **Klienten-Suche & Filter** | Volltext-Suche, filterbar nach Status (aktiv, inaktiv), Datum letzter Sitzung. | Später |
| 06 | **Klient archivieren / deaktivieren** | Beendete Coaching-Beziehungen archivieren, Daten bleiben erhalten, Klient taucht nicht mehr aktiv auf. | Später |

---

## 4. Notizen & Sitzungsnachbereitung
*Dokumentation während und nach jeder Sitzung*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Sitzungsnotizen** | Freie Notizen pro Sitzung – bereits im Call schreibbar (Seitenleiste), nachträglich bearbeitbar. | MVP |
| 02 | **Notizen-Chronik pro Klient** | Alle Sitzungsnotizen in zeitlicher Reihenfolge, direkt im Klientenprofil einsehbar. | MVP |
| 03 | **KI-Sitzungszusammenfassung** | Nach dem Call: automatisch generierte Zusammenfassung auf Basis der Coach-Notizen. Editierbar, nicht an Klienten gesendet. | MVP |
| 04 | **Aufgaben & nächste Schritte** | Strukturiertes Feld für Hausaufgaben / Aktionspunkte nach der Sitzung – bleibt im Klientenprofil sichtbar. | Später |
| 05 | **Notizen exportieren (PDF)** | Sitzungsnotizen als sauber formatiertes PDF exportieren – für eigene Ablage oder DSGVO-Auskunftspflicht. | Später |

---

## 5. Bezahlung & Abrechnung
*Zahlungsabwicklung, Rechnungen, Honorarverwaltung*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Bezahlung bei Buchung (Stripe)** | Klient bezahlt direkt beim Buchen – Termin wird erst nach Zahlung bestätigt. Stripe-Integration, keine Zahlungsdaten bei HxRoom. | Pro |
| 02 | **Honorar konfigurieren** | Preis pro Sitzungstyp festlegen, Währung (EUR), optionale Pakete (z.B. 5 Sitzungen zum Paketpreis). | Pro |
| 03 | **Automatische Rechnungsstellung** | Nach jeder bezahlten Sitzung erhält der Klient automatisch eine DSGVO-konforme Rechnung per E-Mail. | Pro |
| 04 | **Umsatzübersicht** | Monatliche und jährliche Übersicht der Einnahmen, filterbar nach Klient und Sitzungstyp. | Pro |
| 05 | **Rechnungen exportieren** | Alle Rechnungen als ZIP (PDF) herunterladen – für Steuerberater und Jahresabschluss. | Später |
| 06 | **Stornierung & Rückerstattung** | Konfigurierbare Stornobedingungen (z.B. kostenlos bis 24h vorher), automatische Rückerstattung via Stripe. | Später |

---

## 6. Digitaler Empfang & Warteraum
*Was der Klient sieht – vor und nach der Sitzung*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Gebrandeter Warteraum** | Klient öffnet Link und landet in einem persönlichen Warteraum mit Foto, Name und Willkommensnachricht des Coaches. | MVP |
| 02 | **Willkommensnachricht anpassen** | Freitext-Feld für persönliche Worte an den wartenden Klienten, z.B. „Ich bin gleich da – mach es dir bequem." | MVP |
| 03 | **Danke-Seite nach Sitzung** | Klient wird nach Sitzungsende weitergeleitet – konfigurierbar: Dankestext, Link zur nächsten Buchung, externe URL. | MVP |
| 04 | **Technik-Check für Klienten** | Beim ersten Betreten des Warteraums: Kamera & Mikrofon automatisch prüfen, Hinweis bei Problemen. | Später |
| 05 | **Klienten-Fragebogen (Intake)** | Optionales Formular vor der ersten Sitzung: Ziele, Erwartungen, Vorerfahrungen – Antworten im Klientenprofil gespeichert. | Später |

---

## 7. DSGVO, Datenschutz & Account
*Compliance, Vertragliches, Account-Verwaltung*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **AVV automatisch bereitstellen** | Auftragsverarbeitungsvertrag (AVV) wird bei Registrierung automatisch abgeschlossen – kein manueller Aufwand. | MVP |
| 02 | **Server-Standort Deutschland** | Alle Daten auf deutschen Servern (Hetzner / AWS Frankfurt) – Coach kann dies gegenüber Klienten nachweisen. | MVP |
| 03 | **Datenschutztexte-Generator** | Automatisch generierte Datenschutzerklärung und AGB für die Buchungsseite des Coaches – rechtlich geprüft, anpassbar. | Später |
| 04 | **Datenlöschung auf Anfrage** | Coach kann Klientendaten DSGVO-konform löschen, automatisches Protokoll der Löschung. | MVP |
| 05 | **Plan-Verwaltung & Upgrade** | Aktuellen Plan einsehen, auf Pro / Studio upgraden, Jahresabo aktivieren, Zahlungsmethode hinterlegen. | MVP |
| 06 | **E-Mail-Benachrichtigungen konfigurieren** | Coach stellt ein, welche Benachrichtigungen er erhält: neue Buchung, Stornierung, Sitzungserinnerung. | MVP |

---

## 8. Studio – Multi-Coach
*Für kleine Teams: mehrere Coaches unter einer Marke*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Weitere Coaches einladen** | Admin lädt bis zu 2 weitere Coaches per E-Mail ein – jeder hat eigene Sitzungsräume, teilen das Studio-Branding. | Studio |
| 02 | **Gemeinsamer Kalender** | Überblick über alle Coaches und deren Termine, Klienten können den passenden Coach buchen. | Studio |
| 03 | **Rollen & Berechtigungen** | Admin kann Rechnungen und alle Klienten sehen; Coaches sehen nur ihre eigenen Daten. | Studio |
| 04 | **Studio-Umsatzübersicht** | Konsolidierte Einnahmenübersicht für alle Coaches des Studios, aufschlüsselbar nach Person. | Studio |

---

## Legende

| Prio | Bedeutung |
|---|---|
| **MVP** | Kern-MVP · erste zahlende Kunden |
| **Pro** | Ab Pro-Plan freigeschaltet |
| **Später** | Nach den ersten Kunden · Backlog |
| **Studio** | Nur im Studio-Plan |