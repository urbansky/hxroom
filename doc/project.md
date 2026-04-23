# Sitzraum – Projektdokumentation
*Dein digitaler Raum für echte Gespräche.*

---

## 1. Die Ausgangssituation

Als selbständiger Software-Entwickler mit Expertise im Bereich **Videoconferencing** reagiere ich auf den rückläufigen Freelancer-Markt mit einem eigenen SaaS-Produkt. Ziel: Vom Auftragnehmer zum Produktbesitzer – mit wiederkehrendem Einkommen statt Stundensätzen.

---

## 2. Produkt-Idee

**White-Label Videocall-Plattform für Coaches & Life Coaches**

Coaches und Therapeuten nutzen heute Zoom oder Google Meet – generische Tools, die sich anfühlen wie ein Firmen-Meeting, nicht wie ein vertrauensvolles Gespräch. Sitzraum gibt ihnen einen gebrandeten, DSGVO-konformen digitalen Empfangsraum – von der Buchung bis zur Nachbereitung, vollständig in ihrem Namen.

---

## 3. Arbeitstitel & Positionierung

### Name: **Sitzraum**
Der Name erinnert an „Sitzung" – die natürliche Sprache von Coaches. Warm, menschlich, sofort verständlich.

### Kernbotschaft
> **„Deine Klienten verdienen mehr als einen Zoom-Link."**

### Tagline
> *Sitzraum – Einfach. Professionell. Deins.*

### Positionierung
- **Für wen:** Solo-Coaches und Life Coaches, die professionell online arbeiten wollen – ohne IT-Stress
- **Gegen wen:** Zoom, Teams, Google Meet – generische Tools für Firmenmeetings
- **Was anders:** Kein Videocall-Tool, sondern ein kompletter digitaler Empfang – von der Buchung bis zum Abschluss der Sitzung

### Botschaft nach Kontext

**Landingpage Headline:**
> *Dein Coaching. Dein Raum. Dein Name.*
> Kein Zoom. Kein Setup. Kein Stress – für dich und deine Klienten.

**LinkedIn-Post:**
> Ich habe mal einen Coach gefragt, wie er seine Online-Sitzungen macht.
> „Ich schicke einen Zoom-Link" sagte er.
> Sein Klient muss sich anmelden. Einen Account erstellen. Die App runterladen.
> Und dann erscheint er in einem Raum der aussieht wie ein Firmen-Meeting.
> Das ist nicht das Gefühl das du verkaufst.
> Sitzraum gibt dir einen digitalen Raum der sich anfühlt wie du.

**Kalt-E-Mail:**
> Ich baue gerade ein Tool speziell für Coaches: einen gebrandeten Online-Raum wo deine Klienten ohne Account, ohne Download, einfach per Link erscheinen – mit deinem Logo, deinem Namen, deinem Kalender. Würdest du 15 Minuten investieren um es zu sehen?

### Emotionaler Kern
Coaches verkaufen Vertrauen. Vertrauen beginnt beim ersten Eindruck.
**Sitzraum verkauft nicht Software – Sitzraum verkauft einen professionellen ersten Eindruck.**

---

## 4. Zielgruppe

**Primär:** Solo-Coaches & Life Coaches (DACH-Markt)

Warum diese Nische zuerst:
- Weniger reguliert als Ärzte/Therapeuten → schnellerer Markteintritt
- Hohe Zahlungsbereitschaft für Professionalitäts-Tools
- Gut erreichbar über LinkedIn & Facebook-Gruppen
- Großer und wachsender Markt

**Spätere Erweiterung möglich:**
- Therapeuten & Psychologen
- Heilpraktiker & Ärzte
- Rechtsanwälte & Steuerberater

---

## 5. Features & Differenzierung gegenüber Zoom/Meet

| Feature | Zoom/Meet | Sitzraum |
|---|---|---|
| Branding | ❌ Fremdes Logo | ✅ Komplett deins |
| Buchung integriert | ❌ Separates Tool | ✅ Alles in einem |
| Klienten-Login | ❌ Account nötig | ✅ Kein Account |
| Warteraum | ❌ Grau & generisch | ✅ Persönlich & gebrantet |
| DSGVO | ⚠️ Grauzone (US-Server) | ✅ Server DE, AVV inklusive |
| Erinnerungen | ❌ Manuell | ✅ Automatisch |
| Notizen | ❌ Extern | ✅ Integriert |
| Bezahlung | ❌ Separat | ✅ Integriert (Pro) |
| Klienten-Übersicht | ❌ Nicht vorhanden | ✅ Einfaches CRM |
| Sprache/Markt | ❌ International | ✅ DACH-fokussiert |

### Feature-Details

1. **Vollständiges Branding** – eigene Domain, Logo, Farben
2. **Integrierte Buchung** – Klient bucht → bekommt automatisch Link → fertig
3. **Digitaler Warteraum** – Willkommensnachricht, Foto, persönliche Note
4. **Kein Account für Klienten** – Browser-Link reicht, null Hürde
5. **DSGVO-konform by Design** – Server Deutschland, AVV inklusive
6. **Sitzungsnotizen & KI-Zusammenfassung** – direkt nach dem Call
7. **Automatische Erinnerungen** – 24h und 1h vorher per E-Mail/SMS
8. **Integrierte Bezahlung** – buchen und bezahlen in einem Schritt (Pro)
9. **Klienten-Übersicht** – letzter/nächster Termin, Notizen, einfaches CRM
10. **Gemacht für den deutschen Markt** – Deutsch, DACH-fokussiert, menschlicher Support

---

## 5a. Videokonferenz – Feature-Scope

### Core (nicht verhandelbar)

- **Video & Audio** via WebRTC – stabile Peer-to-Peer-Verbindung
- **Kein Account, kein Download für Klienten** – Browser-Link reicht
- **1:1 optimiert** – kein Multi-Participant-Overhead, keine Gruppenlogik
- **Auto-Reconnect** – stille Wiederverbindung bei Verbindungsabbruch

### Raum-Erfahrung

- **Warteraum mit Coach-Branding** – Logo, Foto, persönliche Willkommensnachricht
- **Einlass durch Coach** – Klient wartet, Coach lässt aktiv rein (kein automatischer Join)
- **Sitzungs-Timer** – sichtbar für den Coach, optional für den Klienten
- **Minimale UI während des Calls** – keine ablenkenden Toolbars, Fokus auf die Gesichter

### Coach-Tools im Call

- **Notiz-Seitenleiste** – nur für den Coach sichtbar, direkt im Call erreichbar
- **Mikrofon & Kamera toggle** – für beide Seiten
- **Klient stumm schalten** – für technische Notfälle
- **Screen-Sharing** – optional zuschaltbar, für beide Seiten

### Session-Ende

- **Definiertes Ende durch Coach** – kein abrupter Abbruch
- **Automatische Weiterleitung des Klienten** – z.B. auf eine Dankesseite oder Buchungsseite
- **Notizen gespeichert & der Sitzung zugeordnet** – direkt nach dem Call verfügbar

### Bewusst weggelassen

Folgende Features werden nicht gebaut – sie widersprechen der Positionierung als ruhiger, persönlicher Gesprächsraum:

- Chat während des Calls
- Aufzeichnung (Recording)
- Virtuelle Hintergründe
- Reactions / Emojis
- Breakout Rooms
- Teilnehmerliste / Gruppenlogik

---

## 6. Preismodell

### Struktur: Trial → Bezahlte Pläne (kein Freemium)

Bewusste Entscheidung gegen einen dauerhaft kostenlosen Plan: Freemium braucht Volumen (hunderte Nutzer) um zu funktionieren. In der Frühphase verwässert es das Signal – wer kostenlos nutzt, validiert nichts. Trial senkt die Einstiegshürde ohne den wahrgenommenen Wert zu senken.

| Plan | Preis | Provision | Für wen |
|---|---|---|---|
| **Trial** | 0 € / 14 Tage | – | Alle Features testen, kein Kreditkartenzwang |
| **Basic** | 19 €/Monat | 10 % auf Zahlungen | Einstieg ohne Risiko – HxRoom verdient mit dir |
| **Pro** | 59 €/Monat | 0 % | Solo-Coach ab 4 Sitzungen/Monat günstiger als Basic |
| **Studio** | 99 €/Monat | 0 % | Bis zu 5 Coaches, Studioseite, Klientenübergabe, Studiobetreiber-Rolle |

**Break-even Basic → Pro:** Ab **400 € Monatsumsatz** über die Plattform (z. B. 4 Sitzungen à 100 €) lohnt sich der Wechsel zu Pro – Coaches erkennen das selbst, kein Verkaufsgespräch nötig.

> **Designprinzip:** Im Trial alles freischalten – kein künstliches Einschränken. Der Coach soll den vollen Wert erleben, damit die Kaufentscheidung auf echter Erfahrung basiert, nicht auf Versprechen.

→ Vollständige Preisdetails, Feature-Matrix und Positionierung: [pricing.md](pricing.md)

---

## 7. MVP-Scope (3 Killer-Features für den Start)

Nicht alle Features auf einmal – diese drei rechtfertigen den Wechsel:

1. **Branding** – sofort sichtbarer Unterschied, emotionaler Kaufgrund
2. **Buchung + automatischer Link** – größte Zeitersparnis für den Coach
3. **DSGVO + kein Klienten-Account** – größtes Vertrauensargument

Alles andere kommt nach den ersten zahlenden Kunden.

---

## 8. Go-to-Market – erste 10 Kunden

1. 5 Coaches aus dem Netzwerk direkt ansprechen → kostenloser Beta-Zugang für Feedback
2. LinkedIn-Posts über das Problem ("Warum Zoom für Coaches unprofessionell ist")
3. Facebook-Gruppen für Coaches & Heilpraktiker
4. 1 Case Study nach Beta → "Wie Anna Schmidt 30% mehr Buchungen hatte"
5. Kaltakquise per E-Mail an Coaches mit schlechter Online-Präsenz

### Marketing-Strategie (Detaildokument)

Die vollständige Marketing-Strategie umfasst zwei sofort startbare Kanäle – **Kalt-E-Mail** (CTA auf persönliche HxRoom-Coaching-Seite mit 15-min Live-Demo) und **LinkedIn-Direktansprache** – sowie weitere Aktionen wie Facebook-Gruppen, Beta-Testimonials, Podcast-Gastauftritte, SEO-Content, ein Affiliate-Programm und Kooperationen mit Coach-Ausbildungsinstituten.

→ Details, Templates & Zeitplan: [marketing.md](marketing.md)

---

## 9. Risiken & Gegenmittel

| Risiko | Gegenmittel |
|---|---|
| Zu viele Nischen gleichzeitig | Eine Nische zuerst, dann expandieren |
| Kunden wechseln nicht von Zoom | Zeigen dass es kein Ersatz, sondern Upgrade ist |
| Churn nach 1–2 Monaten | Onboarding verbessern, Erfolg sichtbar machen |
| Größere Player kopieren | Nische & persönlicher Support als Burggraben |

---

## 10. Der 90-Tage-Plan

### Monat 1 – Validieren ohne Code
- Landingpage bauen
- 20 Coaches ansprechen
- 5 zahlende Vorbesteller gewinnen (auch mit Rabatt)
- **Erst dann bauen**

### Monat 2 – MVP bauen
- Kernfunktionen: Videocall + Buchung + Branding
- Alles andere weglassen
- Beta-Kunden aktiv einbinden

### Monat 3 – Launch & erste Kunden
- Beta-Kunden zu echten zahlenden Kunden machen
- Erste Testimonials sammeln
- LinkedIn-Präsenz aufbauen

---

## 11. Domain-Struktur

| URL | Bereich | Zugang |
|---|---|---|
| `sitzraum.de` | Landingpage | öffentlich |
| `app.sitzraum.de` | Coach-Backoffice | Login erforderlich |
| `admin.sitzraum.de` | Betreiber-Backoffice | intern |
| `[slug].sitzraum.de` | Klienten-Subdomain des Coaches | öffentlich, kein Login |

**Beispiel (Solo):** `anna.sitzraum.de` → gebrandete Buchungsseite, Warteraum & Videocall von Anna Bergmann.

**Beispiel (Studio):** `mindflow.sitzraum.de` → Studioseite mit Coachliste; `mindflow.sitzraum.de/sarah` → Profil & Buchung von Sarah direkt.

**Pro/Studio-Feature (CNAME):** Coaches und Studios können ihre eigene Domain zeigen lassen – `coaching.anna-bergmann.de` bzw. `mindflow-coaching.de` zeigt auf die jeweilige Sitzraum-Subdomain, Sitzraum bleibt unsichtbar.

---

## 12. Nächste Schritte

- [ ] Landingpage texten & bauen
- [ ] Tech-Stack & MVP-Scope definieren
- [ ] Erste 5 Coaches für Beta-Test identifizieren
- [ ] LinkedIn-Profil auf Sitzraum ausrichten

---

## 13. Namens-Recherche & Kandidaten

Recherchiert und bewertet im Rahmen der Markenstrategie. Kriterien: Verfügbarkeit, internationale Lesbarkeit, kein Umlaut, Assoziation zum Produkt, Passung zur Produktfamilie hxcode.io.

| Name | Verfügbarkeit | International lesbar | Assoziation | Bewertung |
|---|---|---|---|---|
| **HxRoom** 🏆 | ✅ komplett frei | ✅ kein Umlaut | Raum, Produktfamilie hxcode.io, modern | ⭐⭐⭐⭐⭐ |
| **HxTalk** | ✅ komplett frei | ✅ kein Umlaut | Gespräch, Produktfamilie hxcode.io | ⭐⭐⭐⭐⭐ |
| **HxSpace** | ✅ komplett frei | ✅ kein Umlaut | Raum, offen, Produktfamilie hxcode.io | ⭐⭐⭐⭐ |
| **Sitzraum** | ✅ frei | ✅ kein Umlaut | Sitzung, Raum, Vertrauen | ⭐⭐⭐⭐⭐ |
| **Wunderroom** | ✅ komplett frei | ✅ kein Umlaut | Positiv, einladend, Raum | ⭐⭐⭐⭐⭐ |
| **Sitzly** | ✅ komplett frei | ✅ kein Umlaut | Sitzung, modern, SaaS-tauglich | ⭐⭐⭐⭐ |
| **Wundercall** | ✅ komplett frei | ✅ kein Umlaut | Direkt, klar, Call-Bezug | ⭐⭐⭐ |
| **Coachroom** | ⚠️ .com geparkt | ✅ kein Umlaut | Coaching + Raum, beschreibend | ⭐⭐ |
| **Roomly** | ⚠️ .io geparkt | ✅ kein Umlaut | Raum – falsche Assoziation (Airbnb) | ⭐⭐ |
| **Sessio** | ❌ vergeben | ✅ kein Umlaut | Sitzung (Lateinisch) | ausgeschieden |
| **Coachly** | ❌ mehrfach vergeben | ✅ kein Umlaut | Coaching | ausgeschieden |
| **Parlo** | ❌ vergeben (ServiceNow) | ✅ kein Umlaut | Sprechen (Italienisch) | ausgeschieden |
| **Wunderraum** | ❌ vergeben (Wien, Coaching) | ✅ kein Umlaut | Raum, Coaching | ausgeschieden |
| **Zeitraum** | ❌ vergeben (Erlangen, Coaching) | ✅ kein Umlaut | Zeit + Raum | ausgeschieden |
| **Roomio** | ❌ mehrfach vergeben | ✅ kein Umlaut | Raum-Buchung | ausgeschieden |

### Entscheidung: HxRoom 🏆

**HxRoom** ist der finale Top-Favorit. Die Entscheidung basiert auf folgenden Stärken:

1. **Produktfamilie** – passt nahtlos in die hxcode.io-Linie neben hxmeet.io
2. **Raum-DNA** – behält das Kernkonzept „Raum" aus dem ursprünglichen Arbeitstitel Sitzraum
3. **Komplett frei** – kein einziger Treffer bei der Recherche
4. **International** – kein Umlaut, weltweit lesbar und aussprechbar
5. **Kurz & modern** – SaaS-tauglich, einprägsam

> **Produktname:** HxRoom  
> **Domain:** hxroom.io  
> **Dachmarke:** hxcode.io  
> **Arbeitstitel (intern/DACH):** Sitzraum