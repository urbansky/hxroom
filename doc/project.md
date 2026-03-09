# HxRoom – Projektdokumentation
*Dein digitaler Raum für echte Gespräche.*

---

## 1. Die Ausgangssituation

Als selbständiger Software-Entwickler mit Expertise im Bereich **Videoconferencing** reagiere ich auf den rückläufigen Freelancer-Markt mit einem eigenen SaaS-Produkt. Ziel: Vom Auftragnehmer zum Produktbesitzer – mit wiederkehrendem Einkommen statt Stundensätzen.

---

## 2. Produkt-Idee

**White-Label Videocall-Plattform für Coaches & Life Coaches**

Coaches und Therapeuten nutzen heute Zoom oder Google Meet – generische Tools, die sich anfühlen wie ein Firmen-Meeting, nicht wie ein vertrauensvolles Gespräch. HxRoom gibt ihnen einen gebrandeten, DSGVO-konformen digitalen Empfangsraum – von der Buchung bis zur Nachbereitung, vollständig in ihrem Namen.

---

## 3. Arbeitstitel & Positionierung

### Name: **HxRoom**
Der Name erinnert an „Sitzung" – die natürliche Sprache von Coaches. Warm, menschlich, sofort verständlich.

### Kernbotschaft
> **„Deine Klienten verdienen mehr als einen Zoom-Link."**

### Tagline
> *HxRoom – Einfach. Professionell. Deins.*

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
> HxRoom gibt dir einen digitalen Raum der sich anfühlt wie du.

**Kalt-E-Mail:**
> Ich baue gerade ein Tool speziell für Coaches: einen gebrandeten Online-Raum wo deine Klienten ohne Account, ohne Download, einfach per Link erscheinen – mit deinem Logo, deinem Namen, deinem Kalender. Würdest du 15 Minuten investieren um es zu sehen?

### Emotionaler Kern
Coaches verkaufen Vertrauen. Vertrauen beginnt beim ersten Eindruck.
**HxRoom verkauft nicht Software – HxRoom verkauft einen professionellen ersten Eindruck.**

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

| Feature | Zoom/Meet | HxRoom |
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

| Plan | Preis | Für wen |
|---|---|---|
| **Trial** | 0 € / 14 Tage | Alle Features testen, kein Kreditkartenzwang |
| **Pro** | 79 €/Monat | Solo-Coach, unlimitierte Sitzungen, alle Features |
| **Studio** | 149 €/Monat | Bis zu 3 Coaches, gemeinsamer Kalender |

**Jahresabo:** 2 Monate gratis (entspricht ~17% Rabatt) → reduziert Churn

### Feature-Übersicht nach Plan

| Feature | Trial | Pro | Studio |
|---|---|---|---|
| Branding & eigene Domain | ✅ | ✅ | ✅ |
| Buchung + automatischer Link | ✅ | ✅ | ✅ |
| DSGVO + kein Klienten-Account | ✅ | ✅ | ✅ |
| Automatische Erinnerungen | ✅ | ✅ | ✅ |
| KI-Notizen & Zusammenfassung | ✅ | ✅ | ✅ |
| Integrierte Bezahlung | ✅ | ✅ | ✅ |
| Klienten-CRM | ✅ | ✅ | ✅ |
| Mehrere Coaches | ❌ | ❌ | bis 3 |
| Laufzeit | 14 Tage | unlimitiert | unlimitiert |

> **Designprinzip:** Im Trial alles freischalten – kein künstliches Einschränken. Der Coach soll den vollen Wert erleben, damit die Kaufentscheidung auf echter Erfahrung basiert, nicht auf Versprechen.

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
| `hxroom.io` | Landingpage | öffentlich |
| `app.hxroom.io` | Coach-Backoffice | Login erforderlich |
| `admin.hxroom.io` | Betreiber-Backoffice | intern |
| `[slug].hxroom.io` | Klienten-Subdomain des Coaches | öffentlich, kein Login |

**Beispiel:** `anna.hxroom.io` → gebrandete Buchungsseite, Warteraum & Videocall von Anna Bergmann.

**Pro-Feature (CNAME):** Coaches können ihre eigene Domain zeigen lassen – `coaching.anna-bergmann.de` zeigt auf `anna.hxroom.io`, HxRoom bleibt unsichtbar.

---

## 12. Nächste Schritte

- [ ] Landingpage texten & bauen
- [ ] Tech-Stack & MVP-Scope definieren
- [ ] Erste 5 Coaches für Beta-Test identifizieren
- [ ] LinkedIn-Profil auf HxRoom ausrichten

---

## 13. Namens-Recherche & Kandidaten

Recherchiert und bewertet im Rahmen der Markenstrategie. Kriterien: Verfügbarkeit, internationale Lesbarkeit, kein Umlaut, Assoziation zum Produkt.

| Name | Verfügbarkeit | International lesbar | Assoziation | Bewertung |
|---|---|---|---|---|
| **HxRoom** | ✅ frei | ✅ kein Umlaut | Sitzung, Raum, Vertrauen | ⭐⭐⭐⭐⭐ |
| **Wunderroom** | ✅ komplett frei | ✅ kein Umlaut | Positiv, einladend, Raum | ⭐⭐⭐⭐⭐ |
| **Sitzly** | ✅ komplett frei | ✅ kein Umlaut | Sitzung, modern, SaaS-tauglich | ⭐⭐⭐⭐ |
| **Wundercall** | ✅ komplett frei | ✅ kein Umlaut | Direkt, klar, Call-Bezug | ⭐⭐⭐ |
| **Conva** | ❓ ungeprüft | ✅ kein Umlaut | Konversation, professionell | ❓ |
| **Tala** | ❓ ungeprüft | ✅ kein Umlaut | „Sprechen" (Schwedisch), warm | ❓ |
| **Coachroom** | ⚠️ .com geparkt | ✅ kein Umlaut | Coaching + Raum, beschreibend | ⭐⭐ |
| **Roomly** | ⚠️ .io geparkt | ✅ kein Umlaut | Raum – falsche Assoziation (Airbnb) | ⭐⭐ |
| **Sessio** | ❌ vergeben | ✅ kein Umlaut | Sitzung (Lateinisch) | ausgeschieden |
| **Coachly** | ❌ mehrfach vergeben | ✅ kein Umlaut | Coaching | ausgeschieden |
| **Parlo** | ❌ vergeben (ServiceNow) | ✅ kein Umlaut | Sprechen (Italienisch) | ausgeschieden |

### Empfehlung

**HxRoom** bleibt der stärkste Name – emotional, warm, kein Umlaut, frei und ideal für den DACH-Markt. Als internationale Alternative bietet sich **Wunderroom** an: positiv besetzt, einladend, komplett unbelegt und weltweit lesbar.

> **Strategie-Option:** HxRoom für DACH-Launch, Wunderroom als Reserve für spätere Internationalisierung.