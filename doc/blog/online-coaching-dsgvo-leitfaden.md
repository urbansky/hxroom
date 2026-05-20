---
title: "Online-Coaching DSGVO-konform – der komplette Leitfaden"
description: "DSGVO im Online-Coaching: AVV, Datenschutzerklärung, Hosting-Standort, Klienten-Daten. Der praxisnahe Leitfaden für Solo-Coaches im DACH-Raum."
slug: "online-coaching-dsgvo-leitfaden"
date: 2026-05-15
updated: 2026-05-15
author: "Stefan Urbansky"
authorRole: "Gründer von HxRoom"
category: "DSGVO"
tags: ["DSGVO", "Datenschutz", "AVV", "Online-Coaching", "Compliance"]
keywords:
  - "DSGVO konformes Coaching Tool"
  - "Online-Coaching DSGVO"
  - "Datenschutz Coaching"
  - "AVV Videokonferenz Coach"
cluster: "B"
type: "pillar"
readingTime: 14
canonical: "https://hxroom.de/blog/online-coaching-dsgvo-leitfaden"
schema: "Article"
internalLinks:
  - "/funktionen/dsgvo"
  - "/preise"
  - "/vergleich/zoom"
---

# Online-Coaching DSGVO-konform anbieten – der komplette Leitfaden

> Du arbeitest mit Menschen, die dir Dinge erzählen, die sie sonst niemandem erzählen. Genau deshalb ist Datenschutz im Coaching keine Pflichtübung, sondern Teil deines Versprechens.

Wenn du als Coach online arbeitest, verarbeitest du sensible personenbezogene Daten – manchmal sogar besondere Kategorien gemäß Art. 9 DSGVO (Gesundheit, Religion, Sexualleben). Die meisten Coaches wissen das. Wenige setzen es konsequent um. Dieser Leitfaden zeigt dir, was wirklich zählt – ohne Juristen-Sprache, ohne Panikmache, aber mit den Punkten, an denen Abmahnungen und Bußgelder tatsächlich beginnen.

## Was du in diesem Artikel lernst

- Welche Daten du im Coaching überhaupt verarbeitest (mehr als du denkst)
- Was ein AVV ist und mit wem du einen brauchst
- Warum der Server-Standort entscheidend ist – und was „DSGVO-konform" wirklich heißt
- Welche Inhalte in deine Datenschutzerklärung gehören
- Die 5 typischsten Fehler, die ich bei Coach-Audits sehe
- Eine Checkliste, mit der du in einer halben Stunde sauber wirst

---

## 1. Welche Daten verarbeitest du überhaupt?

Coaching ist kein „bisschen Reden auf Zoom". Sobald du mit einem Menschen arbeitest, sammelst du Daten – oft, ohne es zu merken.

**Typische Datenkategorien im Solo-Coaching:**

- **Stammdaten:** Name, E-Mail, Telefon, Adresse (Rechnung)
- **Buchungsdaten:** Termin, Thema, Notiz zur Anfrage
- **Kommunikation:** E-Mails, WhatsApp-Nachrichten, Anrufnotizen
- **Sitzungsdaten:** Audio/Video während Calls, eventuelle Aufzeichnungen, geteilte Dokumente
- **Sitzungsnotizen:** Stichworte, Fortschrittsprotokolle, Therapietagebücher
- **Zahlungsdaten:** Rechnungen, ggf. Zahlungsstatus bei Stripe/PayPal
- **Marketingdaten:** Newsletter, Webinar-Anmeldungen, Tracking-Cookies

Ein Teil davon fällt unter besondere Kategorien (Art. 9 DSGVO), sobald Themen wie Burnout, Trauma, Beziehungen, Identität oder Gesundheit besprochen werden. Das verschärft die Anforderungen erheblich – ausdrückliche Einwilligung, höhere Sicherheitsanforderungen, dokumentierte Notwendigkeit jeder Verarbeitung.

> **Praxis-Hinweis:** Allein die Tatsache, dass jemand Klient bei einer „Burnout-Coachin" ist, ist eine Gesundheitsangabe – noch bevor das Gespräch begonnen hat.

---

## 2. Die Rechtsgrundlage: Warum darfst du diese Daten überhaupt verarbeiten?

Jede Datenverarbeitung braucht eine Rechtsgrundlage. Für Coaches sind drei davon relevant:

1. **Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):** Du brauchst Name und Kontakt, um den Coaching-Vertrag zu erfüllen. Klar.
2. **Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):** Etwa für eine schlanke E-Mail-Signatur mit deinem Telefon. Bei Sensiblem reicht das nicht.
3. **Einwilligung (Art. 6 Abs. 1 lit. a + Art. 9 Abs. 2 lit. a DSGVO):** Für Aufzeichnungen, für Newsletter, für besondere Datenkategorien.

Für die Sitzung selbst greift in der Regel die **Vertragserfüllung**. Sobald du aber **mitschneidest**, **transkribierst** oder **KI-Tools** zur Auswertung einsetzt, brauchst du eine **separate, dokumentierte Einwilligung**. Mündlich „darf ich aufnehmen?" reicht juristisch nicht aus.

---

## 3. AVV – Auftragsverarbeitungsvertrag

Sobald du einen externen Dienstleister einsetzt, der Daten **für dich** verarbeitet (Hosting, Videocall-Tool, Mail-Provider, CRM), bist du Auftraggeber, der Dienstleister ist Auftragsverarbeiter. Du brauchst einen **AVV gemäß Art. 28 DSGVO**.

**Mit wem du als Coach typischerweise einen AVV brauchst:**

| Tool/Dienst | AVV nötig? | Praxis |
|---|---|---|
| Videocall (Zoom, Teams, HxRoom) | Ja | Bei Zoom: AVV liegt im US-Vertragsmuster – problematisch (siehe weiter unten) |
| E-Mail (Google Workspace, Microsoft 365, mailbox.org) | Ja | Bei mailbox.org standardmäßig integriert |
| Newsletter (Brevo, Mailchimp, ActiveCampaign) | Ja | Bei US-Anbietern AVV plus Risiko-Bewertung |
| Buchung (Calendly, Cal.com, HxRoom) | Ja | Calendly ist US-basiert, AVV vorhanden – Schrems-II-Thematik bleibt |
| Cloud-Speicher (Dropbox, iCloud, Nextcloud) | Ja | Eigener Nextcloud-Server: kein AVV mit dir selbst nötig |
| Rechnungstool (sevDesk, Lexoffice) | Ja | Standardvertrag im Login-Bereich abrufbar |
| Zahlungsanbieter (Stripe, PayPal) | Teils | Stripe sieht sich oft als „eigenständig Verantwortliche" |

**Wichtig:** Ein AVV ist kein Stück Papier zum Ablegen. Du musst nachweisen können, dass du ihn aktiv abgeschlossen hast – per Online-Klick im Anbieter-Backend oder als unterschriebenes Dokument im Ordner.

Mehr zum Thema: [Was ist ein AVV und brauche ich als Coach einen?](was-ist-ein-avv-coach.md)

---

## 4. Hosting-Standort: Warum „in Deutschland" zählt

Seit dem **Schrems-II-Urteil** des EuGH (2020) ist die Datenübermittlung in die USA grundsätzlich problematisch. Das **EU-US Data Privacy Framework** von 2023 hat die Lage rechtlich vorerst stabilisiert, ist aber bereits wieder vor Gericht angegriffen worden.

**Was das praktisch bedeutet:**

- Sobald du ein US-Tool benutzt (Zoom, Google Meet, Microsoft Teams), liegt eine Datenübermittlung in ein Drittland vor.
- Du musst diese Übermittlung **transparent in deiner Datenschutzerklärung benennen**.
- Du musst ein **technisches und organisatorisches Sicherheitsniveau** sicherstellen, das die Risiken kompensiert – Standardvertragsklauseln, Verschlüsselung, ggf. zusätzliche Maßnahmen.
- Klienten könnten widersprechen. Ein einzelner Widerspruch kann dich zwingen, das Tool zu wechseln.

**Die einfache Alternative:** Tools, die ausschließlich auf EU- oder Deutschland-Servern hosten. Damit verschwindet die Drittlandsproblematik komplett aus deiner Datenschutzerklärung.

Genau deshalb hostet HxRoom alles in Frankfurt am Main: kein Datentransfer in die USA, kein Schrems-II-Risiko, ein einziger Satz weniger in deiner Datenschutzerklärung.

Mehr dazu: [Server in Deutschland: Warum das für Coaches der Game-Changer ist](server-in-deutschland-coaching.md)

---

## 5. Deine Datenschutzerklärung – was wirklich drinstehen muss

Eine Datenschutzerklärung ist kein Copy-Paste-Werk. Sie muss zu **deinen** tatsächlich eingesetzten Tools passen. Wer eine Standard-Vorlage von 2019 verwendet, hat in der Regel 30 % falsch.

**Pflichtbestandteile (vereinfacht):**

1. **Verantwortlicher** (du, mit Kontaktdaten)
2. **Zwecke und Rechtsgrundlagen** jeder Verarbeitung
3. **Empfänger / Auftragsverarbeiter** (alle Tools mit Namen)
4. **Drittlandübermittlung** (USA, UK, sonstige)
5. **Speicherdauer** je Datenkategorie
6. **Betroffenenrechte** (Auskunft, Berichtigung, Löschung, Widerspruch)
7. **Beschwerderecht** bei der Aufsichtsbehörde
8. **Cookies & Tracking** (falls vorhanden, mit Consent-Banner)

**Praxistipp:** Erstelle deine Datenschutzerklärung mit einem aktuellen Generator (z. B. eRecht24 Premium oder Dr. Schwenke), aber **passe jeden Block händisch an deine tatsächlichen Tools an**. Der Generator weiß nicht, ob du Calendly oder HxRoom nutzt.

---

## 6. Klienten-Aufklärung – jenseits der Datenschutzerklärung

Die Datenschutzerklärung muss **vor** dem ersten Datenkontakt erreichbar sein. Im Coaching reicht das aber oft nicht:

- **Aufzeichnungen:** Vor jeder Aufnahme musst du **aktiv** fragen und die Einwilligung **dokumentieren** (etwa per E-Mail-Bestätigung).
- **Sitzungsnotizen mit KI:** Falls du Tools wie Otter.ai oder Fireflies nutzt – du brauchst informierte Einwilligung und musst transparent machen, **welcher Dienstleister** transkribiert und **wo** die Daten liegen.
- **Drittpersonen in der Sitzung:** Paartherapie, Teamcoaching – jeder Beteiligte muss aufgeklärt sein.

Ich empfehle: Lege deinen Klienten beim Erstkontakt eine **einseitige Klienteninformation** vor („Was passiert mit meinen Daten?"). Das ist transparent, schafft Vertrauen – und schützt dich nachweisbar.

---

## 7. Technische und organisatorische Maßnahmen (TOM)

Die DSGVO verlangt von dir „geeignete technische und organisatorische Maßnahmen" (Art. 32). Was heißt das für ein Solo-Coaching-Setup?

**Pragmatischer Mindeststandard:**

- Festplatte verschlüsselt (FileVault, BitLocker)
- Bildschirmsperre nach 5 Minuten
- Passwörter über Passwortmanager (1Password, Bitwarden), niemals in Klartext
- Zwei-Faktor-Authentifizierung für alle Coach-Konten
- Backups verschlüsselt, idealerweise EU-Cloud (Hetzner Storage Box, Strato HiDrive)
- Keine ungesicherten USB-Sticks mit Klientendaten
- Klare Trennung zwischen Privat- und Coaching-Geräten (zumindest separate Nutzer-Profile)

**Dokumentationspflicht:** Du musst diese Maßnahmen **schriftlich** festhalten. Eine einseitige TOM-Liste reicht für die meisten Solo-Coaches.

---

## 8. Verzeichnis von Verarbeitungstätigkeiten (VVT)

Auch als Einzelkämpferin oder Einzelkämpfer brauchst du ein **Verzeichnis der Verarbeitungstätigkeiten**, sobald du regelmäßig sensible Daten verarbeitest – und das tust du im Coaching immer.

Ein VVT für Solo-Coaches kann eine Excel-Liste mit fünf Spalten sein:

| Verarbeitung | Zweck | Rechtsgrundlage | Datenkategorien | Empfänger / Tool |
|---|---|---|---|---|
| Buchung | Termin vereinbaren | Vertragserfüllung | Name, E-Mail, Thema | HxRoom |
| Videocall | Coaching-Sitzung | Vertragserfüllung | Video/Audio | HxRoom |
| Rechnung | Honorarabrechnung | gesetzliche Pflicht | Name, Adresse, Betrag | sevDesk |
| Newsletter | Marketing | Einwilligung | Name, E-Mail | Brevo |

Aktualisiere das mindestens jährlich – oder wenn du ein Tool wechselst.

---

## 9. Die 5 typischsten DSGVO-Fehler im Coaching

1. **Zoom-Link in der Bio** – kein AVV abgeschlossen, keine Erwähnung in der Datenschutzerklärung.
2. **Aufzeichnung ohne Einwilligung** – „Ich nehme das mal kurz auf für meine Notizen" reicht nicht.
3. **WhatsApp für Klientenkommunikation** – Meta hat keinen AVV für Privat-Accounts.
4. **Veraltete Datenschutzerklärung** – nennt Tools, die du gar nicht mehr nutzt; verschweigt Tools, die du seit Monaten nutzt.
5. **Keine Datenlöschung nach Ende der Coaching-Beziehung** – steuerliche Aufbewahrungsfristen ja, aber gilt das auch für Sitzungsnotizen? Nein. Trenne!

Tiefere Analyse: [Die 5 größten DSGVO-Fehler in der Online-Coaching-Praxis](dsgvo-fehler-online-coaching.md)

---

## 10. Deine DSGVO-Checkliste (30 Minuten)

Diese Punkte gehst du heute durch – fertig sind die meisten Solo-Coaches damit in einer halben Stunde:

- [ ] Liste alle Tools auf, mit denen du Klienten-Daten verarbeitest
- [ ] Prüfe pro Tool: AVV abgeschlossen? (Login → Datenschutz/Compliance-Bereich)
- [ ] Server-Standort jedes Tools dokumentieren (EU / USA / sonstige)
- [ ] Datenschutzerklärung gegen tatsächliche Tool-Liste abgleichen
- [ ] Klienteninformation für Erstkontakt vorbereiten (einseitig)
- [ ] Verzeichnis der Verarbeitungstätigkeiten als Tabelle anlegen
- [ ] TOM-Liste schreiben (eine Seite reicht)
- [ ] Backup-Strategie prüfen: Wo, wie oft, wie lange?
- [ ] Festplatte verschlüsselt? 2FA überall aktiv?
- [ ] Löschroutine für Klientendaten nach Coaching-Ende definieren

---

## Wie HxRoom dich entlastet

HxRoom ist gebaut, damit du dich um Coaching kümmern kannst, nicht um Datenschutz-Architektur:

- **Server in Frankfurt** (Schrems-II-frei)
- **AVV per Klick** im Coach-Backoffice
- **Keine Klienten-Accounts nötig** – weniger Daten, weniger Risiko
- **Verschlüsselte Sitzungen** standardmäßig
- **Konfigurierbare Aufbewahrungsfristen** für Aufzeichnungen und Notizen
- **DSGVO-konforme Standardtexte** für Buchungs- und Erinnerungsmails

Wenn du Lust hast, dir das live anzuschauen: [HxRoom kostenlos testen](https://hxroom.de/preise) – ohne Kreditkarte, ohne Anruf.

---

## Häufige Fragen (FAQ)

**Brauche ich einen Datenschutzbeauftragten als Solo-Coach?**
Nein – in der Regel nicht. Die Pflicht greift erst ab 20 Personen, die ständig automatisiert Daten verarbeiten, oder bei besonders sensiblen Kerntätigkeiten in großem Umfang.

**Reicht Zoom mit AVV?**
Rechtlich „in Ordnung" mit AVV und Hinweis in der Datenschutzerklärung – aber: US-Anbieter, CLOUD-Act, Schrems-II-Risiko bleibt. Wer auf Nummer sicher gehen will, wechselt zu einem EU-Anbieter.

**Was passiert bei einer Datenpanne?**
Innerhalb von 72 Stunden meldepflichtig an die Aufsichtsbehörde, ggf. Information der Betroffenen. Halte einen schlanken Vorfall-Prozess bereit: Wer wird informiert, wer dokumentiert, wer kommuniziert?

**Brauche ich für mein Sekretariat einen separaten AVV?**
Wenn dein Sekretariat (z. B. Virtuelle Assistenz) auf Klientendaten zugreift: ja. Auch hier reicht in der Regel ein Standard-AVV-Template.

---

*Geschrieben von Stefan Urbansky, Gründer von HxRoom. Stefan baut seit über 15 Jahren Videokonferenz-Systeme – jetzt für Coaches. Fragen? Schreib mir direkt: stefan@hxroom.de*

**Verwandte Artikel:**

- [Was ist ein AVV und brauche ich als Coach einen?](was-ist-ein-avv-coach.md)
- [Server in Deutschland: Warum das für Coaches der Game-Changer ist](server-in-deutschland-coaching.md)
- [Die 5 größten DSGVO-Fehler in der Online-Coaching-Praxis](dsgvo-fehler-online-coaching.md)
- [Zoom für Coaches: 7 Gründe, warum es nicht mehr reicht](zoom-fuer-coaches-warum-es-nicht-mehr-reicht.md)
