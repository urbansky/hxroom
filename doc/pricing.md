# HxRoom – Pricing-Modell

*Stand: April 2026 · Zielmarkt: DACH · Zielgruppe: Solo-Coaches & Life Coaches*

---

## Die vier Pläne

| | **Trial** | **Basic** | **Pro** | **Studio** |
|---|:---:|:---:|:---:|:---:|
| **Preis** | 0 € | 19 €/Monat | 59 €/Monat | 99 €/Monat |
| **Provision** | – | 10 % all-inclusive | 0 % | 0 % |
| **Stripe-Gebühr** | – | inklusive | weitergegeben (~1,5 % + 0,25 €) | weitergegeben (~1,5 % + 0,25 €) |
| **Laufzeit** | 14 Tage | unlimitiert | unlimitiert | unlimitiert |
| **Coaches** | 1 | 1 | 1 | bis 5 |
| **Sitzungen** | unlimitiert | unlimitiert | unlimitiert | unlimitiert |

> **Gebühren-Prinzip:** Bei Basic ist die 10 %-Provision all-inclusive – keine weiteren Zahlungsgebühren. Bei Pro und Studio wird die Stripe-Gebühr 1:1 weitergegeben; HxRoom verdient keine Marge auf der Zahlung.

### Features im Detail

| Feature | Trial | Basic | Pro | Studio |
|---|:---:|:---:|:---:|:---:|
| Vollständiges Branding (Logo, Farben) | ✅ | ✅ | ✅ | ✅ |
| Eigene Subdomain (`name.hxroom.io`) | ✅ | ✅ | ✅ | ✅ |
| Integrierte Buchung + automatischer Link | ✅ | ✅ | ✅ | ✅ |
| Kein Account / kein Download für Klienten | ✅ | ✅ | ✅ | ✅ |
| Digitaler Warteraum mit Branding | ✅ | ✅ | ✅ | ✅ |
| DSGVO-konform (Server DE, AVV inklusive) | ✅ | ✅ | ✅ | ✅ |
| Automatische Erinnerungen (E-Mail/SMS) | ✅ | ✅ | ✅ | ✅ |
| Sitzungsnotizen & KI-Zusammenfassung | ✅ | ✅ | ✅ | ✅ |
| Klienten-CRM | ✅ | ✅ | ✅ | ✅ |
| Integrierte Bezahlung (Stripe) | ✅ | ✅ | ✅ | ✅ |
| Provision auf Zahlungen | – | **10 % (all-in)** | **0 %** | **0 %** |
| Stripe-Gebühr | – | inklusive | **~1,5 % + 0,25 €** | **~1,5 % + 0,25 €** |
| iCal-Kalender-Abo | ✅ | ✅ | ✅ | ✅ |
| Google Calendar API Sync (bidirektional) | ❌ | ❌ | ✅ | ✅ |
| Eigene Domain via CNAME | ❌ | ❌ | ✅ | ✅ |
| Mehrere Coaches | ❌ | ❌ | ❌ | bis 5 |
| Gemeinsamer Kalender | ❌ | ❌ | ❌ | ✅ |
| Studioseite mit Coachliste & Einzelbuchung | ❌ | ❌ | ❌ | ✅ |
| Klientenübergabe zwischen Coaches | ❌ | ❌ | ❌ | ✅ |
| Studiobetreiber-Rolle (Coach-Verwaltung & Abrechnung) | ❌ | ❌ | ❌ | ✅ |

> **Prinzip:** Im Trial sind alle Features verfügbar – kein künstliches Einschränken. Der Coach soll den vollen Wert erleben, damit die Kaufentscheidung auf echter Erfahrung basiert.

---

## Break-even-Analyse: Basic → Pro

Ab wann lohnt sich der Wechsel von Basic (19 € + 10 % all-in) auf Pro (59 € + Stripe-Gebühr)?

**Stripe-Gebühr Pro/Studio:** ~1,5 % + 0,25 € pro Transaktion (EU-Karte, Standardsatz)

**Rechenweg (ohne per-Transaktion-Fix):**
`19 + 10 % × U = 59 + 1,5 % × U` → `8,5 % × U = 40` → **Break-even bei ~471 € Monatsumsatz**

Mit per-Transaktion-Fix (0,25 € × n Sitzungen) verschiebt sich der Break-even minimal nach oben – praktisch auf **~5 Sitzungen à 100 €** (= 500 €).

| Sitzungspreis | Sitzungen/Monat für Upgrade | Realistisch? |
|---|:---:|:---:|
| 80 €/Sitzung | 6 Sitzungen | Niedrig |
| 100 €/Sitzung | 5 Sitzungen | Sehr niedrig |
| 120 €/Sitzung | 4–5 Sitzungen | Niedrig |
| 150 €/Sitzung | 3–4 Sitzungen | Niedrig |
| 200 €/Sitzung | 3 Sitzungen | Sofort relevant |

**Konkret:** Ein Coach mit 100 €/Sitzung und **5 Klienten pro Monat** zahlt in Basic bereits gleich viel wie in Pro (inklusive Stripe) – und upgradet dann von selbst.

### Kostenvergleich nach Sitzungszahl (100 €/Sitzung)

*Basic: 19 € + 10 % · Pro: 59 € + 1,5 % + 0,25 €/Sitzung (Stripe)*

| Sitzungen/Monat | Basic-Kosten | Pro-Kosten (inkl. Stripe) | Ersparnis mit Pro |
|:---:|:---:|:---:|:---:|
| 1 | 29,00 € | 60,75 € | –31,75 € |
| 2 | 39,00 € | 62,50 € | –23,50 € |
| 3 | 49,00 € | 64,25 € | –15,25 € |
| 4 | 59,00 € | 66,00 € | –7,00 € |
| **5** | **69,00 €** | **67,75 €** | **Break-even ~** |
| 8 | 99,00 € | 73,00 € | **+26,00 €** |
| 10 | 119,00 € | 76,50 € | **+42,50 €** |
| 20 | 219,00 € | 94,00 € | **+125,00 €** |

> *Pro-Kosten je Sitzung: 59 € Abo + (100 € × 1,5 % + 0,25 €) × n Sitzungen*

---

## Kommunikation & Positionierung

### Kernbotschaft pro Plan

**Basic** – *"Starte ohne Risiko"*
> Kein Monatsabo das sich anfühlt wie eine Verpflichtung. Zahle nur wenn deine Klienten zahlen – 10 % all-inclusive, keine weiteren Gebühren. HxRoom verdient mit dir – nicht gegen dich.

**Pro** – *"Rechne einmal, profitiere für immer"*
> Ab 4 Sitzungen im Monat sparst du gegenüber Basic. Keine Provision, keine Überraschungen – ein fester Betrag, der kleiner ist als eine deiner Sitzungen.

**Studio** – *"Wachse mit deinem Team"*
> Für Coaches die expandieren: bis zu 5 Coaches, gemeinsamer Kalender, eine Rechnung. Der Studiobetreiber verwaltet das Team und übernimmt die Abrechnung – Klienten buchen direkt beim passenden Coach über die gemeinsame Studioseite.

### Preispsychologie

- **Anker:** Trial zeigt den vollen Wert → Basic wirkt fair, Pro wirkt clever
- **Selbsterklärter Upgrade:** Coaches rechnen selbst aus, wann Pro günstiger ist – kein Verkaufsgespräch nötig
- **"Wir verdienen nur wenn du verdienst"** – starke emotionale Botschaft für Basic
- **Pro-Framing:** *"Weniger als eine deiner Sitzungen pro Monat"* (bei 100 €/Sitzung: 59 % einer Sitzung)

---

## Bewertung des Modells

### Stärken ✅

**Für Coaches:**
- Null Risiko beim Einstieg (Basic ohne Vorabkosten)
- Natürlicher Upgrade-Trigger bei nur 4 Sitzungen/Monat
- Klare, ehrliche Kommunikation (keine versteckten Kosten)
- Alle Features ab dem ersten Tag

**Für HxRoom:**
- Basic generiert sofort Umsatz (19 € + Provision) ohne Salesaufwand
- Pro und Studio sind profitabler pro Coach und stabiler (weniger Churn)
- Provisions-Modell zwingt zur tiefen Plattform-Integration (Zahlung muss über HxRoom laufen)
- Datengetriebener Upgrade-Moment: System kann automatisch upgraden vorschlagen

### Risiken & Gegenmittel ⚠️

| Risiko | Wahrscheinlichkeit | Gegenmittel |
|---|:---:|---|
| Coaches zahlen außerhalb der Plattform (SEPA, PayPal) | Hoch | Provision nur auf HxRoom-Zahlungen – Anreize für In-App-Zahlung schaffen (automatische Quittungen, Steuerexport, Mahnwesen) |
| Basic-Nutzer upgraden nicht (bleiben bei wenigen Sitzungen) | Mittel | Onboarding-E-Mails mit Break-even-Rechner, Push bei Annäherung an Break-even |
| 10 % Provision wirkt hoch (Stripe nimmt schon ~1,5–2 %) | Mittel | Klares Framing: „10 % all-inclusive – keine versteckten Stripe-Gebühren obendrauf." Bei Pro/Studio transparent kommunizieren, dass Stripe-Gebühren durchgereicht werden – Coaches im oberen Segment kennen das. |
| Studio mit nur 5 Coaches wirkt einschränkend | Niedrig | Später erweiterbar: Studio+ mit mehr Coaches |
| Klientenübergabe ist datenschutzrechtlich heikel | Mittel | Explizite Einwilligung des Klienten als Pflichtschritt, AVV deckt Studio-internen Datenaustausch ab |

### Stripe-Gebühren: Festgelegte Regelung

| Plan | Stripe-Gebühr | Für den Coach sichtbar? |
|---|---|:---:|
| Basic | In den 10 % enthalten | Nein – eine Zahl, keine Überraschungen |
| Pro | 1:1 durchgereicht (~1,5 % + 0,25 €/Transaktion) | Ja – transparent als Zahlungsgebühr ausgewiesen |
| Studio | 1:1 durchgereicht (~1,5 % + 0,25 €/Transaktion) | Ja – transparent als Zahlungsgebühr ausgewiesen |

**Kommunikationspflicht:** In FAQ und Onboarding muss für Pro/Studio klar stehen: *„Stripe erhebt ~1,5 % + 0,25 € pro Transaktion. Diese Gebühr wird 1:1 an euch weitergegeben – wir verdienen nichts daran."* Das schafft Vertrauen und verhindert Support-Anfragen.

---

## Empfehlung: Launch-Strategie

1. **Beta-Phase:** Alle Erstnutzer bekommen Pro für 39 €/Monat – dauerhaft gesperrt (Gründer-Deal für erste 50 Coaches)
2. **Danach:** Modell wie oben live schalten
3. **Quick-Win-Botschaft:** *"HxRoom kostet dich weniger als eine halbe Sitzung – und bezahlt sich selbst, wenn dein nächster Klient bucht."*

---

*HxRoom · hxroom.io · Die Videoplattform für Coaches*
