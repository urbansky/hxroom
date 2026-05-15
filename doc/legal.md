# HxRoom – Rechtliche Texte
*Impressum, Datenschutzerklärung, AGB, AVV – Struktur, Verantwortlichkeiten, offene Fragen.*

> Dieses Dokument ist **kein Rechtstext**, sondern eine Landkarte: Welche Dokumente brauchen wir, wo gelten sie, wer ist juristisch verantwortlich, was muss inhaltlich rein. Die finalen Texte werden mit einem Fachanwalt für IT-Recht / Datenschutz erstellt oder mit einem belastbaren Generator (siehe Abschnitt 9) entworfen und anwaltlich gegengeprüft.

---

## 1. Warum das nicht trivial ist

HxRoom hat **drei unterschiedliche Rechtsverhältnisse** und **vier Domain-Kontexte** – jeder mit eigenen Pflichten:

| Verhältnis | Parteien | Rechtsnatur |
|---|---|---|
| **A** Betreiber ↔ Coach | HxRoom (Betreiber) ↔ zahlender Coach | SaaS-Vertrag (B2B) + AVV |
| **B** Coach ↔ Klient | Coach ↔ Endkunde (Privatperson) | Coachingvertrag (B2C, **außerhalb** HxRoom) |
| **C** Betreiber ↔ Besucher | HxRoom ↔ jeder Besucher der Marketing-Seite | Informationspflichten (TMG/DSGVO) |

| Domain | Sichtbarer Anbieter | Impressum-Verantwortung | Datenschutz-Verantwortung |
|---|---|---|---|
| `hxroom.de` | HxRoom (Betreiber) | **Betreiber** | **Betreiber** (Verantwortlicher) |
| `app.hxroom.de` | HxRoom (Betreiber) | **Betreiber** | **Betreiber** (Verantwortlicher für Coach-Daten) |
| `admin.hxroom.de` | HxRoom (Betreiber) | intern, kein öffentliches Impressum nötig | – |
| `[slug].hxroom.de` | **Coach** (Branding) | **Coach** (Inhalteanbieter) | **Coach** (Verantwortlicher für Klientendaten), HxRoom = **Auftragsverarbeiter** |

> **Kernprinzip:** Auf den Coach-Subdomains tritt der **Coach** als Anbieter auf – nicht HxRoom. Das ist die ganze Idee von White-Label. Rechtlich heißt das: **der Coach** ist verantwortlich für Inhalte, Impressum und Datenschutz gegenüber dem Klienten. HxRoom liefert ihm nur das technische Werkzeug – und einen sauberen Auftragsverarbeitungsvertrag.

---

## 2. DSGVO-Rollen im Detail

| Datenfluss | Verantwortlicher (Art. 4 Nr. 7 DSGVO) | Auftragsverarbeiter (Art. 28) |
|---|---|---|
| Besucher von `hxroom.de` | Betreiber | – |
| Coach-Account-Daten (Name, E-Mail, Zahlung) | Betreiber | Stripe, Brevo, Hetzner, Ionos |
| Klienten-Daten in Coach-Workspaces (Name, Termine, Notizen, Video) | **Coach** | **Betreiber** – und über ihn die Unter-Auftragsverarbeiter |
| Newsletter-Empfänger (Marketing-Liste) | Betreiber | Brevo |

> Konsequenz: Der Betreiber braucht **einen AVV mit jedem Coach** – und der Coach braucht eine Datenschutzerklärung gegenüber **seinen** Klienten. HxRoom hilft dabei (Generator, siehe `funktionen/backoffice-coach.md` Punkt 7.03), aber **die Verantwortung bleibt beim Coach**.

---

## 3. Impressum

### 3.1 Auf `hxroom.de` / `app.hxroom.de` (Betreiber-Impressum)
Pflicht nach **§ 5 DDG** (vormals § 5 TMG) und **§ 18 MStV**. Inhalt:

- Vollständiger Name + Anschrift des Betreibers
- Kontakt: E-Mail, Telefon
- Rechtsform (Einzelunternehmen / UG / GmbH)
- Vertretungsberechtigter (bei Gesellschaften)
- USt-IdNr. (falls vorhanden) bzw. Hinweis auf Kleinunternehmer §19 UStG
- Handelsregister / Registernummer (falls Gesellschaft)
- Inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV
- Hinweis auf OS-Plattform der EU + Bereitschaft / Nicht-Bereitschaft zur Verbraucherschlichtung (§ 36 VSBG)

### 3.2 Auf `[slug].hxroom.de` (Coach-Impressum)
Hier tritt der **Coach** als Anbieter auf → er braucht **sein eigenes** Impressum. HxRoom muss:

- Im Coach-Backoffice ein **Pflichtfeld „Impressum-Daten"** beim Onboarding einfordern (Rechtsform, Anschrift, USt-IdNr., Vertretung, Aufsichtsbehörde falls relevant)
- Diese Daten automatisch auf `/impressum` der Subdomain rendern
- Coach kann freitext-mäßig ergänzen (z.B. Berufsbezeichnung, Verbandsmitgliedschaft)
- Coach signiert per Klick: **„Diese Angaben sind korrekt und vollständig"** – HxRoom übernimmt **keine** Haftung für unvollständige Coach-Angaben (das muss in den HxRoom-AGB stehen).

> **Designentscheidung offen:** Soll HxRoom den Coach **technisch zwingen**, ein Impressum zu hinterlegen, bevor er live geht? → Empfehlung: **Ja.** Verhindert dass Coaches versehentlich ohne Impressum betrieben werden – schützt den Coach und uns vor Abmahnungen.

---

## 4. Datenschutzerklärung

### 4.1 Auf `hxroom.de` (Marketing-Seite)
Verantwortlicher: Betreiber. Inhalte gemäß Art. 13 DSGVO:

- Server-Logs (IP, User-Agent → berechtigtes Interesse Art. 6 Abs. 1 lit. f)
- Cookies & Tracking (siehe Abschnitt 7)
- Kontaktformular / E-Mail-Kontakt
- Newsletter-Anmeldung (Brevo, Double-Opt-In) → siehe `newsletter-brevo.md`
- Hosting (Hetzner, DE)
- Eingebettete Inhalte / externe Dienste (sollten **minimiert** sein – kein YouTube-Embed ohne Klick-Wall, keine externen Fonts)
- Rechte der Betroffenen (Auskunft, Löschung, Beschwerde bei Aufsichtsbehörde)

### 4.2 Auf `app.hxroom.de` (Coach-App)
Verantwortlicher: Betreiber. Datenarten:

- Account-Daten (Name, E-Mail, Passwort-Hash via better-auth)
- Zahlungsdaten (über Stripe; HxRoom speichert keine Kartendaten – nur Stripe-Customer-ID)
- Coach-Profilinhalte (Logo, Foto, Buchungstexte – idR keine personenbezogenen Daten Dritter)
- Nutzungs-Logs (Login-Zeiten, Aktionen) für Sicherheit & Support
- Speicherort: Hetzner DE, Object Storage Hetzner Frankfurt, Brevo EU, Stripe EU (SCCs)

### 4.3 Auf `[slug].hxroom.de` (Coach-Subdomain, Klientensicht)
Verantwortlicher: **Coach**. HxRoom liefert eine **Template-Datenschutzerklärung**, die der Coach übernimmt und an seine Praxis anpasst:

- Wer ist Verantwortlicher (= Coach)
- Welche Daten werden bei Buchung erhoben (Name, E-Mail, Telefon, Anliegen)
- Was passiert während des Videocalls (LiveKit, kein dauerhaftes Recording im MVP)
- Welche Notizen macht der Coach (Sitzungsnotizen, ggf. KI-Zusammenfassung)
- Auftragsverarbeiter HxRoom + Unter-Auftragsverarbeiter (Liste aus 4.4)
- Aufbewahrungsfristen (vom Coach festzulegen)
- Rechte der Klienten

### 4.4 Liste der Unter-Auftragsverarbeiter (HxRoom-seitig)
Diese Liste muss öffentlich sein und im AVV stehen. Stand heute:

| Dienst | Zweck | Standort | Garantie |
|---|---|---|---|
| Hetzner Online GmbH | Hosting, Object Storage | DE (Nürnberg, Falkenstein, Frankfurt) | EU, AVV |
| Stripe Payments Europe Ltd. | Zahlungen | IE / LU | SCCs, eigener AVV |
| Brevo (Sendinblue SAS) | Transaktional + Newsletter | FR / DE | EU, AVV |
| Ionos SE | DNS + IMAP-Postfächer | DE | EU, AVV |
| Let's Encrypt | TLS-Zertifikate | – | kein Datentransfer |

> **Offen:** Sollen wir LiveKit-Cloud als Fallback nutzen? → Falls ja, **kein US-Transfer** sondern EU-Region erzwingen, sonst SCC-Pflicht.

---

## 5. AGB – zwei verschiedene Sets

### 5.1 HxRoom-AGB (Betreiber ↔ Coach, B2B)
Inhalte:

- Vertragsgegenstand: SaaS-Nutzung HxRoom inkl. Subdomain
- Plan-Tarife, Laufzeit, Kündigung (monatlich/jährlich), automatische Verlängerung
- Trial-Bedingungen (14 Tage, kein Kreditkartenzwang, danach Auto-Conversion **nur** mit ausdrücklicher Zustimmung – sonst Account-Pause)
- Zahlungspflicht, Zahlungsverzug, Sperre
- Provisionsmodell (Basic-Plan: 10 % auf Zahlungen, siehe `pricing.md`) – wann fällig, wie abgerechnet, wie verrechnet
- Verfügbarkeit / SLA (vorsichtig formulieren – kein 99,9 % zusichern bevor wir es liefern können)
- Pflichten des Coaches: korrekte Impressum-Angaben, kein Verstoß gegen Gesetze, keine Heilversprechen ohne entsprechende Qualifikation, keine Inhalte die HxRoom in Verruf bringen
- Haftungsbeschränkung (typisch: Vorsatz/grobe Fahrlässigkeit unbeschränkt, sonst auf vertragstypisch vorhersehbaren Schaden begrenzt)
- Datenschutz-Bezug → AVV ist integraler Bestandteil
- Kündigung & Datenexport (Coach bekommt Klientendaten als Export, 30 Tage Aufbewahrung nach Kündigung dann Löschung)
- Gerichtsstand, anwendbares Recht (Deutsches Recht, Gerichtsstand Sitz Betreiber)
- AGB-Änderungen (Zustimmungsmechanismus für wesentliche Änderungen)

### 5.2 Coach-AGB (Coach ↔ Klient, B2C)
**Nicht** unsere Verantwortung – aber wir liefern ein **Template**, sonst stehen viele Coaches ohne da. Inhalte:

- Vertragsgegenstand: Coaching-Sitzung (klar: kein Heilversprechen, keine Therapie im Sinne PsychThG)
- Stornobedingungen, Rückerstattung
- Verhalten bei technischen Störungen (alternative Sitzung, Rückerstattung)
- Schweigepflicht des Coaches (vertraglich, da keine berufliche Schweigepflicht §203 StGB)
- Widerrufsrecht bei Fernabsatzverträgen (§ 312g BGB) – Coaches müssen das **immer** belehren

> Template ist „Später" im Funktionsplan (`backoffice-coach.md` Punkt 7.03). Bis dahin: klarer Hinweis im Coach-Onboarding: **„Du brauchst eigene AGB. HxRoom liefert kein Template – aktuell."**

---

## 6. AVV – Auftragsverarbeitungsvertrag

Pflicht nach Art. 28 DSGVO. **MVP-Feature** (`backoffice-coach.md` Punkt 7.01: „AVV automatisch bereitstellen").

Pragmatische Umsetzung:

- AVV-Text als Vertragsbestandteil bei Registrierung (Coach klickt „Ich stimme AGB und AVV zu")
- PDF jederzeit downloadbar im Backoffice
- Standard-AVV nach Muster der Aufsichtsbehörden (z.B. BayLDA / DSK) – wenig Spielraum für Anpassungen
- Liste der Unter-Auftragsverarbeiter (siehe 4.4) **integraler Bestandteil**
- Mechanismus für Änderungen: Benachrichtigung an Coach mit Widerspruchsrecht (z.B. wenn neuer Sub-AV hinzukommt)

> **Wichtig:** AVV muss in **Textform** geschlossen werden – Klick beim Onboarding reicht (Art. 28 Abs. 9 DSGVO: „elektronisches Format" zulässig).

---

## 7. Cookies, Tracking, Consent

Position: **so wenig wie möglich**, damit wir kein Consent-Banner brauchen – das passt zur Marke (ruhig, vertrauensvoll, kein Tracking-Theater).

### 7.1 Was wir **nicht** wollen
- Google Analytics
- Facebook Pixel
- LinkedIn Insight Tag (außer wir starten Ads – dann erst einbauen)
- Externe Fonts von Google
- YouTube-Embeds ohne Click-Wall

### 7.2 Was wir vermutlich brauchen
- **Session-Cookie** (technisch notwendig, kein Consent nötig nach § 25 Abs. 2 TTDSG)
- **Stripe-Cookies** im Checkout (technisch notwendig für Zahlung)
- **Brevo-Tracking** im Newsletter? → wenn ja, dann **mit Consent** beim Anmelden

### 7.3 Wenn wir später tracken müssen
- Plausible Analytics (self-hosted, Cookie-frei) oder Matomo on-prem → bevorzugt
- Erst dann Consent-Banner notwendig, wenn echte Tracking-Cookies gesetzt werden

> **Designentscheidung:** Starten **ohne** Consent-Banner. Marketing-Wirkung ist ein Wettbewerbsvorteil – „die einzige Coaching-Plattform die euch nicht trackt".

---

## 8. Coach-spezifische Risiken (Heilversprechen, Berufsrecht)

Wichtig für unsere AGB-Klauseln (Pflichten des Coaches):

- **Lebensberatung ≠ Heilkunde:** Coach darf keine Diagnosen stellen, keine Heilung versprechen. Sonst Konflikt mit Heilpraktikergesetz / PsychThG.
- HxRoom schließt das in den AGB aus („Coach versichert, kein Heilversprechen abzugeben") – schützt **uns** bei Abmahnungen.
- Spätere Zielgruppen (Therapeuten, Ärzte) brauchen **deutlich strengeres** Datenschutzregime (Gesundheitsdaten Art. 9 DSGVO, ggf. § 203 StGB) → eigener Tariff, eigene Verträge. **Nicht im MVP.**

---

## 9. Wer schreibt die Texte? Generator vs. Anwalt

| Dokument | Empfehlung | Begründung |
|---|---|---|
| Impressum (Betreiber) | Selbst aus Mustertext | Standardisiert, geringes Risiko |
| Datenschutzerklärung `hxroom.de` | Generator (z.B. eRecht24, Dr. Schwenke) + Selbstcheck | Standardisiert, wenig Spezialfälle |
| Datenschutzerklärung `app.hxroom.de` | **Anwalt** | Komplexer Datenfluss (Stripe, Brevo, LiveKit, Whisper) |
| HxRoom-AGB (B2B) | **Anwalt** | Provisionsmodell, Haftung, SaaS-Spezifika – einmal richtig machen |
| AVV | Mustertext der DSK / BayLDA + Anwalt-Review | Wenig Spielraum, aber Sub-AV-Liste muss passen |
| Coach-Impressum-Generator (in der App) | Eigene UI, Text-Logik aus Mustertext | Wir liefern Vorlage, Coach füllt aus |
| Coach-AGB-Template | Anwalt (später, wenn Feature kommt) | Wir verteilen es an alle Coaches – Qualität muss stimmen |

> **Pragmatik:** Initial-Investition Anwalt: realistisch **1.500 – 3.000 €** für HxRoom-AGB + AVV + Datenschutz-App. Das ist gut investiertes Geld vor dem ersten zahlenden Kunden.

---

## 10. Offene Fragen zur Klärung

1. **Rechtsform des Betreibers:** Einzelunternehmen, UG, oder GmbH? → Bestimmt Impressums-Inhalt, Haftung, AGB-Klauseln.
2. **Anschrift im Impressum:** Privatadresse oder Geschäftsadresse / Coworking / virtuelle Anschrift?
3. **Kleinunternehmer §19 UStG** zu Beginn oder direkt umsatzsteuerpflichtig?
4. **Erlaubt Trial → Auto-Conversion?** Wenn ja, dann ist es ein „kostenpflichtiger Probevertrag" – braucht klare Belehrung. Wenn nein, ist es ein „echter Trial" – einfacher rechtlich.
5. **Anwalt jetzt oder erst vor dem ersten zahlenden Kunden?** → Empfehlung: **vor dem ersten zahlenden Kunden**, also Ende Monat 2 / Anfang Monat 3 im 90-Tage-Plan.
6. **Verbraucherschlichtung:** Teilnahme oder nicht? → Empfehlung: **nicht** verpflichtend, sondern explizit ablehnen (B2B-Geschäft).
7. **Wo sitzt der Gerichtsstand?** Hängt von Wohnort des Betreibers ab.
8. **Sollen wir den Coach beim Onboarding zwingen, sein Impressum zu hinterlegen, bevor seine Subdomain live geht?** → Empfehlung: **ja** (siehe 3.2).
9. **Coach-AGB-Template:** MVP oder „Später"? → Aktuell „Später" (`backoffice-coach.md`). Risiko: Coaches gehen ohne AGB live. Workaround: dickes Onboarding-Disclaimer.
10. **Newsletter-Marketing-AVV** (`newsletter-brevo.md` läuft über Brevo): existiert der AVV mit Brevo schon? → Falls nicht: vor Newsletter-Launch abschließen.

---

## 11. Nächste Schritte

- [ ] Rechtsform-Entscheidung treffen → blockiert alles weitere
- [ ] AVV-Muster der DSK herunterladen und durchgehen
- [ ] Anwalt-Briefing vorbereiten: dieses Dokument + `technisches-konzept.md` Abschnitte 1–3
- [ ] eRecht24 / Dr. Schwenke-Konto evaluieren als Generator-Quelle
- [ ] Coach-Impressum-Pflichtfelder in `backoffice-coach.md` ergänzen (`§5 DDG`-Daten als Pflichtfeld vor Go-Live)
- [ ] Im Onboarding-Flow Trial-Conversion-Logik rechtssicher beschreiben

---

*Verweise: [`project.md`](project.md) · [`technisches-konzept.md`](technisches-konzept.md) · [`funktionen/backoffice-coach.md`](funktionen/backoffice-coach.md) · [`newsletter-brevo.md`](newsletter-brevo.md)*
