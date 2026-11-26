# HxRoom – Handbuch auf hxroom.de (Konzept)

Ein öffentliches Handbuch unter `hxroom.de/handbuch`, das jede Funktion von HxRoom erklärt – mit Screenshots, in Abschnitte gegliedert, mit Navigation. Ergänzt die Landingpage (verkauft) und den Blog (fängt Probleme ab) um die Ebene „so funktioniert es genau“.

---

## 1. Ziele

1. **Suchmaschinen:** Viele kleine, präzise Seiten zu konkreten Fragen („Erinnerungsmail Coaching Termin“, „Videocall ohne Account für Klienten“, „Kalender abonnieren Coaching-Termine“). Ergänzt die Keyword-Cluster aus [seo.md](seo.md) um Long-Tail-Suchen mit Funktionsbezug und stärkt die Brand-Suchen („HxRoom Warteraum“, „HxRoom Kalender“).
2. **KI-Chatbots:** ChatGPT, Claude, Perplexity und Gemini sollen Fragen zu HxRoom richtig beantworten – was es kann, was nicht, wie etwas geht. Dafür braucht es Text, der sich in Stücken zitieren lässt und für sich allein stimmt (siehe Abschnitt 6).
3. **Nebeneffekt Support:** Coachs und Klienten finden Antworten selbst; die Coach-App kann von ihren Seiten aus auf die passende Handbuchseite verlinken.

Leser sind drei Gruppen: **Coachs, die HxRoom prüfen** (wollen sehen, ob es ihren Ablauf trägt), **Coachs, die HxRoom nutzen** (suchen eine Anleitung) und **Klienten** (wollen wissen, wie ihr Termin abläuft). Dazu kommen Crawler von Suchmaschinen und KI-Diensten.

---

## 2. Grundsätze

- **Nur, was es gibt.** Das Handbuch beschreibt den Stand in Produktion. Was in der Coach-App ausgeblendet ist (`apps/coach/app/utils/beta.ts`: Umsatz, Rechnungen, Warteraum-Einstellungen, Benachrichtigungen, Plan & Abrechnung) oder erst geplant ist (Transkription, Ende-zu-Ende-Verschlüsselung, Bezahlung bei Buchung), kommt nicht vor – entsprechend UX-01. Ausnahme ist die Seite „Was HxRoom nicht kann“ (Abschnitt 4).
- **Eine Seite, eine Aufgabe.** Statt einer langen Seite pro Bereich eine eigene Seite je Funktion. Jede Seite hat einen eigenen Titel, eine eigene Suchabsicht und lässt sich einzeln verlinken und zitieren.
- **Begriffe wie in der App.** Menüpunkte, Knöpfe und Reiter heißen im Handbuch genau so wie in der Oberfläche („Sitzungsangebote“, „Klientenliste“, „Sitzung starten“). Das gilt auch für „Klienten“ – anders als im Akquise-Text (Hinweis in [seo.md](seo.md) 4.4) muss eine Anleitung die Wörter verwenden, die auf dem Bildschirm stehen.
- **Ansprache:** Du, wie auf der Landingpage ([marketing.md](marketing.md) Abschnitt 0) – auch auf den Seiten an Klienten.
- **Nur Deutsch.**
- **Fakten statt Versprechen.** Zahlen und Grenzen ausschreiben: „Erinnerungen 24 Stunden und eine Stunde vor dem Termin“, „bis zu 25 Termine in einem Vorgang“, „nach 30 Tagen gelöscht“. Solche Sätze zitieren Chatbots, „besonders sicher“ zitieren sie nicht.
- **Text trägt, Bild zeigt.** Alles Wichtige steht im Text. Ein Screenshot veranschaulicht, ersetzt aber keine Anleitung – Crawler und Chatbots lesen ihn nicht zuverlässig.

---

## 3. Aufbau und Navigation

### 3.1 Adressen

```
hxroom.de/handbuch                                  → Übersicht aller Abschnitte
hxroom.de/handbuch/[abschnitt]                      → Abschnitt mit Kurzbeschreibung seiner Seiten
hxroom.de/handbuch/[abschnitt]/[seite]              → einzelne Seite
```

Drei Ebenen, deutsche Slugs, sprechend: `/handbuch/videocall/warteraum`, `/handbuch/termine/erinnerungsmails`. Das folgt [seo.md](seo.md) 2.2 (deutsche Slugs, höchstens drei Ebenen) und den bestehenden Seiten der Landingpage (`/impressum`, `/datenschutz`, `/blog`).

### 3.2 Seitenlayout

Ein eigenes Layout `handbuch.vue` neben `blog.vue` und `legal.vue`, mit derselben Kopfleiste wie der Blog (Logo, „Handbuch“, „Blog“, „Zurück zur Startseite“).

| Bereich | Inhalt | Nuxt-UI-Komponente |
|---|---|---|
| **Links** (ab `lg`) | Navigation über alle Abschnitte und Seiten, aktuelle Seite markiert, Abschnitte aufklappbar | `UContentNavigation` in `UPageAside` |
| **Mitte** | Seiteninhalt, darüber Brotkrumen | `UPageHeader`, `UBreadcrumb`, `ContentRenderer` |
| **Rechts** (ab `xl`) | „Auf dieser Seite“: Zwischenüberschriften der Seite | `UContentToc` |
| **Unten** | Vorherige und nächste Seite | `UContentSurround` |
| **Oben** | Suche über das ganze Handbuch (Tastenkürzel ⌘K) | `UContentSearch` |
| **Handy** | Navigation als Slideover über einen Knopf in der Kopfleiste, „Auf dieser Seite“ als einklappbare Leiste über dem Inhalt | `USlideover`, `UContentToc` |

Diese Komponenten gehören seit Nuxt UI v4 zum freien Paket und arbeiten direkt mit Nuxt Content zusammen; die Navigation entsteht aus der Ordnerstruktur, ohne gepflegte Liste.

### 3.3 Inhalte als Markdown

Eine neue Collection `handbuch` in `content.config.ts`, Quelle `content/handbuch/**/*.md`. Zahlen vor Ordnern und Dateien legen die Reihenfolge fest und verschwinden aus der Adresse (`content/handbuch/3.videocall/1.warteraum.md` → `/handbuch/videocall/warteraum`). Jeder Ordner bekommt eine `.navigation.yml` mit Titel und Symbol.

Frontmatter je Seite:

```yaml
title: Der Warteraum                # H1 und Navigation
seoTitle: Warteraum für Online-Coaching – HxRoom Handbuch   # <title>, 50–60 Zeichen
description: …                      # 140–160 Zeichen: Kurzantwort unter der H1, Meta-Description, Eintrag in llms.txt
navigation:                         # Eintrag in Navigation, Übersicht und Suche
  title: …
  description: …                    # ein Satz, worum es auf der Seite geht
audience: coach | klient            # steuert Ansprache und Kennzeichnung
menu: Termine › Sitzung starten     # Weg in der App, optional
updated: 2026-11-26                 # sichtbar als „Stand“, auch im JSON-LD
faq:                                # optional, wird zu FAQPage
  - q: …
    a: …
related: [videocall/im-gespraech, klienten/termin-buchen]
```

---

## 4. Gliederung

Erster Entwurf, abgeleitet aus Coach-App, Buchungsseite und [backoffice-coach.md](../produkt/funktionen/backoffice-coach.md). Vor dem Schreiben jeder Seite wird gegen den Code geprüft, was sichtbar ist.

**1. Erste Schritte**
- Was ist HxRoom? – Überblick in fünf Absätzen, Ablauf Buchung → Mail → Warteraum → Gespräch
- Konto anlegen
- Die Einrichtungs-Checkliste – die sechs Schritte auf dem Dashboard
- Die Probe-Sitzung – beide Seiten selbst erleben, Handy per QR-Code
- Das Dashboard

**2. Buchungsseite**
- Buchungsseite gestalten – Adresse `name.hxroom.de`, Foto, Tagline, Text
- Impressum und Datenschutz hinterlegen
- Buchungslink teilen – Website, Signatur, Social Media

**3. Angebote und Verfügbarkeit**
- Sitzungsangebote anlegen – Name, Dauer, Preis als Information
- Verfügbarkeit festlegen – Wochenzeiten, Angebote auf Teilzeiten beschränken
- Zeiträume sperren und freigeben – Urlaub, Zusatztermine
- Externe Kalender verbinden – Google, Outlook, iCloud über die iCal-Adresse, nur Beginn und Ende gespeichert
- Termine als Kalender-Abo

**4. Termine**
- So bucht ein Klient – Formular, Bestätigungslink, Verfall ohne Bestätigung
- Bestätigungs- und Erinnerungsmails – was wann hinausgeht, mit Mail-Screenshot
- Termin manuell anlegen und Serien
- Spontan-Termin
- Die Terminseite – Details, Verlauf, Aktionen
- Absagen, nicht erschienen, löschen

**5. Videocall**
- Warteraum und Einlass
- Im Gespräch – Kamera, Mikrofon, Bildschirm teilen, Hintergrund weichzeichnen
- Chat und Dateien – Virenprüfung, wer sie wo wiederfindet
- Notizen während des Gesprächs
- Sitzung beenden – Abschlusskarte, tatsächliche Dauer
- Technische Voraussetzungen – Browser, Handy, Netz

**6. Klienten**
- Die Klientenliste
- Die Klientenseite – Termine, Notizen, Dateien, „Nur für dich“
- Klienten anlegen und Termine zuordnen

**7. Datenschutz und Sicherheit**
- Wo liegen die Daten? – Hetzner Deutschland, Unterauftragnehmer
- Auftragsverarbeitungsvertrag (AVV)
- Verschlüsselung – ehrlich: Transport verschlüsselt, keine Ende-zu-Ende-Verschlüsselung
- Daten exportieren
- Konto löschen – 30 Tage Bedenkzeit

**8. Für Klienten** (Ansprache an Klienten, vom Coach verlinkbar)
- So buchst du einen Termin
- So kommst du in den Warteraum – kein Konto, kein Download
- Kamera und Mikrofon vorab prüfen
- Wenn etwas nicht klappt – Kamera gesperrt, Mail nicht angekommen, Termin absagen

**9. Hilfe**
- Häufige Fragen – gebündelt aus FAQ der Startseite und den Seiten
- Was HxRoom nicht kann – Gruppen und Webinare, Aufnahme, Zahlung bei Buchung, Ende-zu-Ende-Verschlüsselung, eigene Domain, App zum Herunterladen
- Begriffe – Buchungsseite, Sitzungsangebot, Warteraum, Einlass, Probe-Sitzung, Spontan-Termin …
- Feedback geben

Zusammen etwa 40 Seiten. Die Seite „Was HxRoom nicht kann“ ist für Chatbots besonders wertvoll: Ohne sie raten sie bei „Kann HxRoom Gruppen-Calls?“ und liegen im Zweifel falsch. Sie wird bei jeder neuen Funktion angepasst.

---

## 5. Aufbau einer Seite

Jede Seite folgt derselben Vorlage, damit Leser sich zurechtfinden und Crawler dieselbe Struktur wiederfinden:

1. **H1** – die Aufgabe oder Funktion („Erinnerungsmails an Klienten“).
2. **Kurzantwort** – zwei Sätze, die die Frage vollständig beantworten und HxRoom beim Namen nennen: „HxRoom schickt deinen Klienten 24 Stunden und eine Stunde vor dem Termin eine Erinnerung per Mail. Du musst dafür nichts einstellen.“ Sie ist die `description` im Frontmatter und steht unter der H1. Dieser Absatz ist der wichtigste der Seite – er landet in Suchergebnis-Snippets und Chatbot-Antworten.
3. **Wo in HxRoom** – Menüweg als Kasten (`menu` aus dem Frontmatter).
4. **Schritt für Schritt** – nummerierte Liste, je Schritt ein Satz, Bedienelemente fett.
5. **Screenshots** – an der Stelle, an der sie helfen, mit Bildunterschrift.
6. **Gut zu wissen** – Grenzen, Sonderfälle, Zahlen.
7. **Was dein Klient sieht** – bei Funktionen mit Wirkung nach außen.
8. **Häufige Fragen** – zwei bis vier, aus `faq`.
9. **Weiterlesen** – verwandte Seiten aus `related`, dazu dezent die Aktionen „Kostenlos ausprobieren“ und „Vorführung buchen“.
10. **Stand** – Datum aus `updated`.

Länge: 300 bis 800 Wörter. Lieber eine Seite mehr als eine, die drei Fragen mischt.

Bausteine im Markdown:
- `::screenshot` mit `src`, `dark`, `alt`, `caption`, `address` – eigene Komponente unter `app/components/content/`, nutzt `ScreenFrame`, wählt hell/dunkel nach Farbschema, öffnet per Klick groß (auf dem Handy seitlich verschiebbar)
- `::callout`, `::note`, `::tip`, `::warning` – Hinweise aus Nuxt UI; „Was dein Klient sieht“ ist ein `::callout{icon="i-lucide-user"}`
- Schritte als nummerierte Liste, Bedienelemente fett

Kasten „Wo in HxRoom“ (`menu`), häufige Fragen (`faq`), „Weiterlesen“ (`related`), Handlungsaufruf und Stand (`updated`) setzt die Seitenvorlage aus dem Frontmatter, nicht das Markdown.

---

## 6. Für KI-Chatbots

KI-Dienste holen Seiten über Crawler und zerlegen sie in Stücke; eine Antwort entsteht aus einzelnen Absätzen. Daraus folgen Regeln für Text und Technik.

### 6.1 Text

- **Jeder Absatz stimmt für sich.** Kein „wie oben beschrieben“, kein „dort“, kein „wir“. Lieber „In HxRoom …“ einmal zu oft.
- **Fragen als Zwischenüberschriften**, wo es passt („Brauchen Klienten ein Konto?“). So wird gefragt, so wird gesucht.
- **Dieselben Begriffe überall.** Ein Ding, ein Wort – „Sitzungsangebot“, nicht abwechselnd „Angebot“, „Leistung“, „Termintyp“. Die Seite „Begriffe“ legt sie fest.
- **Grenzen ausdrücklich nennen.** „Ein Gespräch in HxRoom hat genau zwei Teilnehmer: Coach und Klient.“
- **Bilder beschreiben.** Alt-Text sagt, was zu sehen ist („Warteraum mit Foto und Namen des Coachs, darunter Kamera-Vorschau und Mikrofonpegel“), die Bildunterschrift, was man daraus lernt.

### 6.2 Technik

| Maßnahme | Zweck |
|---|---|
| Alle Seiten vorgerendert (`nuxt generate`, wie die übrige Landingpage) | Crawler bekommen fertiges HTML, ohne JavaScript |
| **`llms.txt`** um Abschnitt „Handbuch“ erweitern: jede Seite mit Link und Kurzantwort (`description`) | Einstieg für KI-Dienste, die `llms.txt` lesen |
| **`/llms-full.txt`**: das ganze Handbuch als eine Markdown-Datei, beim Build aus der Collection erzeugt | Ein Abruf liefert alles; Grundlage für Chatbots und Agenten |
| **Markdown je Seite** unter derselben Adresse mit `.md` (`/handbuch/videocall/warteraum.md`) | Agenten holen sich gern die Rohfassung ohne Layout |
| JSON-LD je Seite: `TechArticle` mit `dateModified` und `author`, `BreadcrumbList`, bei Fragen `FAQPage` | Struktur für Suchmaschinen und Crawler |
| `robots.txt`: `/handbuch` für alle Crawler offen, KI-Crawler (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended) ausdrücklich erlaubt; `/blog` bleibt gesperrt | Kein Crawler soll das Handbuch auslassen |

`llms.txt`, `llms-full.txt` und die `.md`-Fassungen sind Server-Routen wie `server/routes/blog/rss.xml.ts`, beim Build vorgerendert. Der feste Kopf der `llms.txt` (Beschreibung, Funktionen, FAQ, Seiten) steht in `server/assets/llms.md`, die Handbuchliste kommt aus der Collection. Den Fließtext liest `server/utils/handbuch.ts` aus den Markdown-Dateien und macht aus den Bausteinen einfaches Markdown: ein Screenshot wird zu seiner Beschreibung („*Bild: …*“), eine Markierung zur Nummer in Klammern, ein Hinweis zum Zitat, Links werden absolut.

---

## 7. SEO-Technik

- **Title und Description** je Seite aus `seoTitle` und `description`, Canonical auf die eigene Adresse, Open Graph wie beim Blog.
- **Sitemap:** `/sitemap.xml` als Server-Route wie `rss.xml`, mit Startseite, Handbuch-Übersicht, Abschnitten und Seiten (`lastmod` aus `updated`), ohne Blog und Rechtsseiten. Verlinkt in `robots.txt`, einzureichen in der Search Console.
- **Interne Verlinkung:**
  - Startseite → Handbuch: Link in Kopfleiste und Fußzeile; jede Funktion in `CoachFeaturesSection` und `TourSection` verlinkt auf ihre Handbuchseite.
  - Blog → Handbuch: Jeder Artikel verlinkt die passenden Seiten („So geht es in HxRoom“).
  - Handbuch → Handbuch: „Weiterlesen“ und Links im Fließtext.
  - Coach-App → Handbuch: zwei feste Einstiege, „Handbuch“ in der Seitenleiste über „Feedback“ und „Handbuch öffnen“ im Schnellzugriff des Dashboards, beide in einem neuen Tab. Die App wird nicht indexiert, die Links dienen den Coachs, nicht der Suche; Links je Seite müssten mit jeder neuen Seite gepflegt werden.
- **Bilder:** WebP, sprechende Dateinamen (`warteraum-kamera-vorschau.webp`), `loading="lazy"` außer beim ersten Bild, feste Breite und Höhe gegen Layoutsprünge.

---

## 8. Screenshots

### 8.1 Herkunft

`apps/landing/scripts/handbuch-screens.mjs` nimmt die Bilder mit Playwright und den Demodaten (`db:seed:demo`, fiktive Klienten) auf, hell und dunkel – dieselbe Grundlage wie die Bilder der Startseite (`screenshots.mjs`, gemeinsames Werkzeug in `screens-lib.mjs`). Aufgenommen wird in Szenen: Abläufe, die Zustand teilen, etwa „Klient wartet, Coach lässt ein“, samt aller Bilder unterwegs. Eine Szene lässt sich einzeln aufrufen. Ergebnis landet unter `public/screens/handbuch/<abschnitt>/<name>.webp` und `<name>-dark.webp` – nicht unter `public/handbuch/`, wo die Ordner mit den Adressen der Seiten kollidierten.

Dazu schreibt das Skript ein Manifest, `app/data/handbuch-screens.json`, mit Pfad, Größe, Art, Adresszeile und Markierungen je Bild. Im Markdown steht nur der Name (`::screenshot{name="videocall/warteraum-coach" alt="…" caption="…"}`), alles Übrige kommt aus dem Manifest.

Damit lassen sich nach einer Änderung an der Oberfläche alle Bilder in einem Lauf neu erzeugen. Hand-Screenshots gibt es nicht – sie veralten unbemerkt.

### 8.2 Art der Bilder

- **Übersicht:** ganze Seite im Fenster, im Browserrahmen wie auf der Startseite (`ScreenFrame`).
- **Ausschnitt:** ein Dialog, eine Karte, ein Menü – auf das Element zugeschnitten, als Karte in natürlicher Breite. Auf dem Handy die lesbarere Wahl; eine ganze Seite wird dort zu klein.
- **Handy:** für die Seiten an Klienten (Buchung, Warteraum) im Handy-Format, weil Klienten oft so beitreten. Kommt mit diesen Seiten.
- **Markierungen** (nummerierte Punkte auf dem Bild) werden nicht ins Bild gebrannt, sondern von `::screenshot` als Ebene darübergelegt. Ihre Lage ermittelt das Skript beim Aufnehmen aus den Elementen der Oberfläche (links daneben, auf halber Höhe); im Text verweist `:marker{n="1"}` auf dieselbe Nummer. So überleben sie eine Neuaufnahme, und die Erklärung bleibt Text.
- **Geräte:** Kamera ist das Foto `stefan.jpg`, das Mikrofon ein erzeugter Ton; in der Geräteauswahl stehen „MacBook Pro-Mikrofon“ und „FaceTime HD-Kamera“ statt der Namen der Testgeräte.

Etwa 60 Aufnahmen, je hell und dunkel.

### 8.3 Datenschutz

Nur Demodaten. Keine Namen, Adressen oder Fotos echter Klienten oder Coachs, auch nicht vom Betreiber-Konto in Produktion. Das Foto des Coachs ist wie bisher `stefan.jpg`.

---

## 9. Pflege

- **Teil jeder Funktion:** Ändert sich eine Funktion sichtbar, gehören Handbuchseite, Screenshot-Eintrag und `updated` in denselben Commit. Die Regel kommt in `apps/landing/CLAUDE.md` neben die zu `robots.txt` und `llms.txt`.
- **Beta-Ausblendung:** Wird eine Route aus `BETA_HIDDEN_ROUTES` genommen, bekommt sie im selben Zug ihre Handbuchseite; „Was HxRoom nicht kann“ wird angepasst.
- **Vierteljährliche Prüfung** wie in [seo.md](seo.md) 8.3: Stichproben-Fragen an ChatGPT, Claude und Perplexity („Wie funktioniert der Warteraum bei HxRoom?“, „Kann ich bei HxRoom meinen Google-Kalender verbinden?“). Falsche oder fehlende Antworten zeigen, welche Seite deutlicher werden muss.

---

## 10. Umsetzung in Schritten

| # | Schritt | Ergebnis |
|---|---|---|
| 1 | **Gerüst** | Collection, Layout mit Navigation, Inhaltsverzeichnis und Suche, Seitenroute, Übersichtsseite, MDC-Komponenten; eine Musterseite („Warteraum und Einlass“) vollständig mit Screenshots – daran wird die Vorlage abgenommen |
| 2 | **Screenshot-Pipeline** | Aufnahmeliste und Erweiterung von `screenshots.mjs` |
| 3 | **Inhalte, erste Runde** | Erste Schritte, Videocall, Für Klienten, Datenschutz, Was HxRoom nicht kann – die Seiten mit dem meisten Such- und Fragepotenzial |
| 4 | **SEO- und KI-Technik** | JSON-LD, Sitemap, `llms.txt` als Route, `llms-full.txt`, `.md`-Fassungen, `robots.txt` |
| 5 | **Verlinkung** | Kopfleiste, Fußzeile, Startseiten-Abschnitte, Blogartikel |
| 6 | **Inhalte, zweite Runde** | Buchungsseite, Angebote und Verfügbarkeit, Termine, Klienten, Hilfe |
| 7 | **Handbuch in der Coach-App** | Link in der Seitenleiste und im Schnellzugriff des Dashboards |

Jeder Schritt einzeln, mit Prüfung im Browser. Die technischen Teile wandern nach dem Bau in [technisches-konzept.md](../technik/technisches-konzept.md).
