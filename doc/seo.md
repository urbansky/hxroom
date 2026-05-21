# HxRoom – SEO-Strategie
*Organische Sichtbarkeit für Solo-Coaches & Life Coaches im DACH-Markt*

---

## 0. SEO-Realitätscheck: Was SEO für HxRoom leisten kann – und was nicht

SEO ist für HxRoom ein **mittelfristiger Kanal (6–18 Monate)**, kein Startbeschleuniger. Die ersten 10–30 zahlenden Kunden kommen aus Kalt-E-Mail, LinkedIn und Empfehlungen. SEO ist die Investition für Monat 6 ff., wenn die Akquise-Maschine skalieren soll, ohne dass jeder Lead manuell angefasst werden muss.

**Was SEO realistisch leisten kann:**

- **Trust-Signal:** Wer eine Kalt-Mail bekommt und googelt „HxRoom Erfahrungen" oder „[Stefan Urbansky HxRoom]", muss vertrauenswürdige Treffer finden (Brand-SEO).
- **Vergleichs-Käufer abfangen:** Coaches, die aktiv eine Zoom-Alternative suchen, googeln gezielte Begriffe („Zoom Alternative Coaching", „DSGVO Videokonferenz Coach"). Diese Suchen sind kaufnah.
- **Long-Tail-Probleme abfangen:** „Wie wirke ich als Coach online professionell?", „Online-Coaching DSGVO" – Coaches mit konkretem Problem, das HxRoom löst.
- **Coach-Subdomains als Backlink-Quelle:** Jeder Coach, der seine `[slug].hxroom.de` aktiv bewirbt oder per CNAME einbettet, stärkt die Hauptdomain.

**Was SEO nicht leistet:**

- Keine bezahlten Kunden ab Tag 1.
- Keinen Trafficeffekt für hochkompetitive Head-Keywords wie „Online Coaching Tool" (Google.de, Position 1 mit 0 Backlinks: utopisch in den ersten 12 Monaten).
- Keinen Ersatz für Kalt-Akquise – nur eine Ergänzung.

---

## 1. Keyword-Strategie

### 1.1 Suchintention statt Suchvolumen

Die Coach-Nische hat kein Millionen-Volumen. Erfolg misst sich nicht in Impressions, sondern in **qualifizierten Demo-Anfragen pro 100 Klicks**. Daher klare Priorität auf **Mid-Tail und Long-Tail-Keywords mit hoher Kaufintention**, nicht auf generische Head-Keywords.

### 1.2 Keyword-Cluster

**Cluster A – Zoom-Alternative (Kaufintention hoch):**

- „Zoom Alternative Coaches"
- „Zoom Alternative DSGVO"
- „professionelle Zoom Alternative"
- „Videokonferenz ohne Account"
- „Videocall ohne Download für Klienten"
- „Zoom Branding ändern" (Frust-Suche → Aha-Moment)

**Cluster B – DSGVO & Coaching (Vertrauenssuche):**

- „DSGVO konformes Coaching Tool"
- „Online-Coaching DSGVO"
- „Datenschutz Coaching Software"
- „Videokonferenz DSGVO Deutschland"
- „AVV Videokonferenz Coach"

**Cluster C – Online-Coaching-Tools (Vergleichssuche):**

- „Online Coaching Software"
- „Software für Coaches"
- „Coaching Plattform Deutschland"
- „Tool für Online Coaches"
- „Buchungssystem Coaching"

**Cluster D – Branding & Professionalität (Problembewusstsein):**

- „professioneller Online-Auftritt Coach"
- „Coaching Website mit Buchung"
- „eigene Coaching Plattform"
- „White-Label Videokonferenz"

**Cluster E – Brand-Suchen (essenziell, sobald Akquise läuft):**

- „HxRoom" / „HxRoom Erfahrungen" / „HxRoom Preise"
- „HxRoom Stefan Urbansky"
- „hxcode HxRoom"

**Cluster F – Long-Tail-Probleme (Inhalt-getrieben):**

- „Was kostet ein eigenes Coaching-Tool"
- „Wie kann ich meinen Coaching-Auftritt professionalisieren"
- „Welche Alternative gibt es zu Zoom für Coaches"
- „Wie wirke ich als Online-Coach seriös"

### 1.3 Priorität (Ranking-Reihenfolge bauen)

| Priorität | Cluster | Zeitfenster | Warum |
|---|---|---|---|
| **P1** | E (Brand) | Sofort | Sobald Marketing läuft, muss „HxRoom" sauber ranken |
| **P1** | A (Zoom-Alternative) | Monat 2–4 | Höchste Kaufintention, niedrigste Konkurrenz |
| **P2** | B (DSGVO) | Monat 3–6 | Vertrauens-Anker, ranking-fähig mit gutem Content |
| **P2** | F (Long-Tail) | laufend | Skaliert über Blog, niedrige Konkurrenz |
| **P3** | C (Tools-Vergleich) | Monat 6–12 | Hart umkämpft, lohnt nur mit Autorität |
| **P3** | D (Branding) | Monat 6–12 | Eher Awareness als Conversion |

---

## 2. Domain- & URL-Architektur

### 2.1 Domain-Setup

- **`hxroom.de`** ist die primäre SEO-Domain (DACH-Fokus, DSGVO-Botschaft passt zum `.de`).
- **`hxroom.io`** wird per **301-Redirect** auf `hxroom.de` weitergeleitet, bis Internationalisierung kommt. Kein Duplicate Content.
- **`app.hxroom.de`** und **`admin.hxroom.de`** werden per `robots.txt` und `X-Robots-Tag: noindex` aus dem Index gehalten – das sind App-Surfaces, keine SEO-Assets.
- **`[slug].hxroom.de`** (Coach-Subdomains): pro Coach indexierbar als eigene Mini-Site. Strategie siehe 2.3.

### 2.2 URL-Struktur Hauptdomain (`hxroom.de`)

Flache, sprechende URLs ohne IDs und Parameter:

```
hxroom.de/                         → Landingpage (Solo-Coaches)
hxroom.de/studio                   → Studio-Plan-Landingpage
hxroom.de/preise                   → Preisseite
hxroom.de/funktionen               → Feature-Übersicht
hxroom.de/funktionen/branding      → Feature-Detail
hxroom.de/funktionen/buchung
hxroom.de/funktionen/dsgvo
hxroom.de/vergleich/zoom           → Zoom-Vergleichsseite
hxroom.de/vergleich/google-meet
hxroom.de/vergleich/teams
hxroom.de/fuer/life-coaches        → Zielgruppen-Landingpages
hxroom.de/fuer/business-coaches
hxroom.de/fuer/burnout-coaching
hxroom.de/blog/                    → Blog-Index
hxroom.de/blog/[slug]              → Blog-Artikel
hxroom.de/case-studies/[coach]     → Coach-Erfolgsgeschichten
hxroom.de/ueber                    → Über (Stefan, Geschichte)
hxroom.de/kontakt
hxroom.de/impressum
hxroom.de/datenschutz
hxroom.de/agb
```

**Regeln:**

- Trailing-Slash konsistent (entscheiden für **mit** Slash, einheitlich überall) – sonst Duplicate-Content über `/foo` vs `/foo/`.
- Deutsche Slugs (kein „/features", sondern „/funktionen") – passt zur Zielgruppe und Suchsprache.
- Keine Datums-URLs für Blog (`/blog/2026/05/...`) – Artikel sollen evergreen wirken.
- Maximal 3 Pfadebenen.

### 2.3 Coach-Subdomains als SEO-Asset

Jede aktive Coach-Subdomain `[slug].hxroom.de` ist eine eigene kleine Website mit echtem Inhalt (Bio, Angebot, Buchung). Das ergibt zwei SEO-Effekte:

1. **Brand-Footprint:** Wer „[Coach-Name] Coaching" googelt, findet u. U. die `[slug].hxroom.de` – HxRoom bekommt nebenbei Markenbekanntheit als „dieses Coaching-Tool, das ich überall sehe".
2. **Backlink-Potenzial:** Coaches setzen den Link auf ihre Hauptwebsite, LinkedIn, Instagram, Visitenkarte. Das sind kontextrelevante Backlinks **auf hxroom.de** (über die Subdomain-Relation).

**Indexierbarkeit per Plan:**

| Plan | Coach-Subdomain im Index? | Begründung |
|---|---|---|
| Trial | `noindex` | Verhindert Karteileichen im Google-Index |
| Basic | `index, follow` | Standard – Coach profitiert von organischer Sichtbarkeit |
| Pro | `index, follow` + Schema.org `LocalBusiness` / `Person` | Reicheres Markup, höhere SERP-Sichtbarkeit |
| Studio | wie Pro, plus Studio-Seite als `Organization` | Studio + Coaches je eigener Eintrag |

**CNAME-Coaches (eigene Domain `coaching.anna-bergmann.de`):** Hier rankt **die Coach-Domain**, nicht HxRoom. Trotzdem dezentes „Powered by HxRoom"-Footer-Link mit `rel="nofollow"` (kein SEO-Spam, aber Brand-Sichtbarkeit).

---

## 3. On-Page-SEO – Mindeststandard pro Seite

### 3.1 Technische Basis

- **Server-Side-Rendering / Static Generation** mit Nuxt 3 (passt zum geplanten Stack). Kein Client-only-SPA für SEO-relevante Routen – Google rendert JS zwar, aber unzuverlässig und mit Verzögerung.
- **`<title>`** unique pro Seite, 50–60 Zeichen, Keyword vorn, Brand hinten: `Zoom-Alternative für Coaches – HxRoom`.
- **`<meta name="description">`** 140–160 Zeichen, Nutzen + CTA, kein Keyword-Stuffing.
- **`<h1>`** genau einmal, enthält Hauptkeyword.
- **Heading-Hierarchie sauber** (`h1` → `h2` → `h3`), keine Sprünge.
- **Canonical-Tag** auf jeder Seite – auch auf der kanonischen Version selbst (Self-Canonical).
- **Open-Graph + Twitter-Card** für hübsches Sharing in LinkedIn/Slack/WhatsApp.
- **Strukturierte Daten** (siehe 3.3).

### 3.2 Core Web Vitals

Nuxt 3 + Nuxt UI ist eine gute Basis, aber Werte aktiv überwachen:

- **LCP < 2.5 s** – Hero-Bild lazy-loaded, aber mit `fetchpriority="high"` für den Above-the-fold-Headerbereich.
- **CLS < 0.1** – Fonts mit `font-display: swap` + Größen-Reservierung. Keine springenden Cookie-Banner.
- **INP < 200 ms** – kein blockierendes JS im kritischen Pfad.

Messen: Google PageSpeed Insights + WebPageTest, mindestens monatlich. Search-Console Core-Web-Vitals-Report als Tripwire.

### 3.3 Strukturierte Daten (Schema.org)

| Seite | Schema |
|---|---|
| Landingpage | `Organization` + `SoftwareApplication` |
| Preisseite | `Product` mit `Offer` je Plan |
| Feature-Seiten | `WebPage` + `BreadcrumbList` |
| Blog-Artikel | `Article` + `BreadcrumbList` + `Person` (Autor) |
| Case-Study | `Article` mit `Review` / `Quotation` |
| Coach-Subdomain (Pro/Studio) | `Person` + `LocalBusiness` (wenn Coach das will) + `Service` |
| FAQ-Bereich | `FAQPage` (sparsam einsetzen – Google hat das Rich-Snippet 2023 reduziert) |
| Vergleichsseiten | `WebPage` + `BreadcrumbList`, **kein** `Review` von eigenen Produkten (Google-Penalty-Risiko) |

### 3.4 Bilder & Medien

- Alle Bilder in **WebP/AVIF** mit `<picture>`-Fallback.
- **`alt`-Texte** beschreibend, nicht keyword-gestopft.
- Hero-Videos: Poster-Bild + `preload="metadata"`, niemals Autoplay mit Ton.
- Dateinamen sprechend: `coaching-warteraum-branding.webp` statt `IMG_4732.webp`.

### 3.5 Interne Verlinkung

- Jeder Blog-Artikel verlinkt auf **mindestens 2** Geld-Seiten (Preise, relevante Feature-Seite, Vergleichsseite).
- Geld-Seiten verlinken auf 1–2 vertrauensbildende Artikel (DSGVO, Sicherheit).
- Breadcrumbs auf allen Unterseiten (auch im DOM, nicht nur als Schema).

---

## 4. Content-Strategie

### 4.1 Cluster-basiertes Content-Modell

Pro Keyword-Cluster eine **Pillar-Page** (umfassender Hub-Artikel) + 4–8 unterstützende Artikel, die intern auf die Pillar verlinken. Das ist Topical Authority – Google erkennt: HxRoom ist die Quelle zu Thema X.

### 4.2 Konkrete Content-Roadmap (priorisiert)

**Sofort (vor Launch – muss zum Start stehen):**

| Seite | Keyword(s) | Typ |
|---|---|---|
| Landingpage Solo | „Coaching Plattform", „Zoom Alternative Coaches" | Pillar |
| `/preise` | „HxRoom Preise" | Conversion |
| `/funktionen` | „Funktionen Coaching Software" | Hub |
| `/funktionen/dsgvo` | „DSGVO konformes Coaching Tool" | Trust |
| `/ueber` | „HxRoom Stefan Urbansky" | Brand |
| `/datenschutz`, `/impressum`, `/agb` | – | Pflicht |

**Monat 1–2 (Vergleichs- & Zielgruppen-Seiten):**

| Seite | Keyword | Strategie |
|---|---|---|
| `/vergleich/zoom` | „Zoom Alternative Coaches" | Ehrlicher Vergleich, kein Bashing |
| `/vergleich/google-meet` | „Google Meet Alternative Coaching" | Analog |
| `/vergleich/teams` | „Microsoft Teams Coaching" | Analog |
| `/fuer/life-coaches` | „Software für Life Coaches" | Zielgruppen-LP |
| `/fuer/business-coaches` | „Online-Tool Business Coach" | Zielgruppen-LP |
| `/fuer/burnout-coaching` | „Online Coaching Burnout" | Zielgruppen-LP |

**Monat 3–6 (Blog-Aufbau, 2 Artikel/Monat):**

Pillar-Artikel:

- „Der komplette Leitfaden: Online-Coaching DSGVO-konform anbieten" (~3.000 Wörter, Pillar für Cluster B)
- „Zoom für Coaches: 7 Gründe, warum es nicht mehr reicht" (Pillar für Cluster A)
- „So baust du als Coach einen professionellen Online-Auftritt" (Pillar für Cluster D)

Unterstützende Artikel:

- „Was ist ein AVV und brauche ich als Coach einen?"
- „Server in Deutschland: Warum das für Coaches der Game-Changer ist"
- „Zoom Branding entfernen: Geht das wirklich?"
- „Die 5 größten DSGVO-Fehler in der Online-Coaching-Praxis"
- „Buchungssysteme für Coaches im Vergleich: Calendly, Cal.com, HxRoom"
- „Wie viel kostet ein professionelles Coaching-Setup?"
- „Online-Coaching ohne Account für Klienten – geht das technisch?"
- „Erinnerungs-E-Mails an Klienten: Vorlagen, die wirken"

**Monat 6+ (Case Studies & Autorität):**

- Mindestens 1 Case-Study pro Monat: „Wie [Coach] mit HxRoom 30 % mehr Buchungen erreicht hat"
- Gastbeiträge auf relevanten Coach-Blogs (managerseminare.de, dvct.de)
- Interviews mit bekannten Coaches im eigenen Blog (Backlink-Magnet)

### 4.3 Content-Qualitätsstandard

Lieber 1 sehr gute Seite pro Monat als 4 mittelmäßige. Google's Helpful-Content-System bestraft dünnen, generischen KI-Content explizit.

- **Mindestlänge sinnvoll:** Pillar 1.500–3.000 Wörter, Blog-Artikel 800–1.500 Wörter. Nie aufblähen.
- **E-E-A-T sichtbar machen:** Autorenbox mit Foto (Stefan), LinkedIn-Link, Bio. Bei Coach-Themen ggf. Co-Autor:innen aus dem Beta-Coach-Pool.
- **Konkret statt Floskel:** „70 % der Coaches nutzen Zoom" nur mit echter Quelle. Sonst weglassen.
- **Visuelle Anker:** Screenshots aus HxRoom, eigene Diagramme, Vergleichstabellen. Stock-Fotos sparsam und nur wenn sie etwas erklären.

### 4.4 Tonalität im SEO-Content

Konsistent mit der Marketing-Tonalität (siehe `marketing.md` Abschnitt 0): **Du-Ansprache, kleingeschrieben, Stefan als Absender, Vornamen-Anrede**. Auch in Blog-Artikeln. Ausnahme: Rechtstexte bleiben beim „Sie".

> **Achtung Bestandsmemory:** „Klient" ist Coach-Jargon und gehört nicht in Coach-zugewandte SEO-Texte direkt an die Coachs. In der Coach-Akquise heißt es „deine Coachees" oder „die Menschen, mit denen du arbeitest". Anders auf Coach-Subdomains, die sich an Klienten richten – dort handlungsbasiert formulieren („Ich arbeite mit einem Coach", siehe Memory `feedback_terminology_klient.md`).

---

## 5. Technische SEO – Setup-Checkliste

### 5.1 Nuxt 3 / Nuxt UI – konkrete Settings

- **`nuxt.config.ts`:** `ssr: true` für alle SEO-relevanten Routen (Landingpage, Blog, Vergleich, Funktionen).
- **`@nuxtjs/sitemap`** + **`@nuxtjs/robots`** als Module einbinden.
- **`useHead` / `useSeoMeta`** auf jeder Seite – nicht im `app.vue` global überschreiben.
- **Hydration nicht ausbremsen:** `<NuxtLink prefetch>` für die wichtigsten Folgeseiten.
- **i18n vorbereiten** (auch wenn DE-only zum Start): URL-Struktur so wählen, dass `/en/...` später einfach hinzukommt – kein Hardcoding von Sprachpfaden.

### 5.2 Robots & Sitemap

**`robots.txt`** auf `hxroom.de`:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*?*utm_*
Sitemap: https://hxroom.de/sitemap.xml
```

**`robots.txt`** auf `app.hxroom.de` und `admin.hxroom.de`:

```
User-agent: *
Disallow: /
```

Plus zusätzlich `X-Robots-Tag: noindex` als HTTP-Header auf diesen Subdomains – Robots allein reicht nicht (wenn Backlinks reinkommen, indexiert Google trotzdem nur die URL).

**`sitemap.xml`:** automatisch generieren, getrennt pro Subdomain:

- `hxroom.de/sitemap.xml` – Hauptdomain
- `[slug].hxroom.de/sitemap.xml` – pro Coach (nur Basic+, automatisch beim Aktivieren)

In Search Console **je Subdomain** als Property anlegen (Wildcard-Property `*.hxroom.de` zusätzlich für aggregierte Sicht).

### 5.3 HTTPS, Performance, Hosting

- **HTTPS überall**, HSTS aktiv, kein Mixed Content.
- **HTTP/3 (QUIC)** wo möglich – Caddy oder Nginx mit aktiviertem QUIC.
- **CDN für statische Assets** (Bilder, Fonts). DSGVO-konform – kein Cloudflare-Default-Setup (US-Routing), eher Bunny.net (EU) oder eigener Edge.
- **Brotli-Kompression** für HTML/CSS/JS.

### 5.4 Internationalisierung – Vorbereitung, kein Launch

Nicht von Tag 1 priorisieren, aber **nicht verbauen**:

- Bei späterem `.io`-Launch: `hreflang`-Tags zwischen `hxroom.de` (de-DE, de-AT, de-CH) und `hxroom.io/en` (en).
- URL-Struktur jetzt schon i18n-fähig (siehe 5.1).

### 5.5 404-Strategie

- Eigene 404-Seite mit Suchfeld, Top-3-Links, „Coaching-Raum testen"-CTA.
- Soft-404 vermeiden – tatsächlich 404 HTTP-Status zurückgeben.
- 301-Redirects für umstrukturierte URLs (Redirect-Map in Repository pflegen).

---

## 6. Off-Page-SEO – Backlinks, die hier wirklich gehen

Backlink-Aufbau ist im Coach-Markt **nicht über klassische Outreach-Listen** zu lösen. Coach-Blogs sind selten, Verzeichnisse sind oft thin oder Spam. Realistische Quellen:

### 6.1 Aktiv (eigene Hand)

1. **Coach-Verzeichnisse:** dvct.de, ICF-Deutschland-Verzeichnis, coach-datenbank.de – HxRoom als Tool-Empfehlung listen lassen, ggf. mit Testimonials.
2. **managerseminare.de:** Gastbeiträge im Trainer-Bereich (siehe `marketing.md`).
3. **Coaching-Podcast-Show-Notes:** Jeder Gastauftritt → Backlink in den Episodennotizen.
4. **LinkedIn-Artikel von Stefan:** Längere Posts mit Verlinkung auf hxroom.de/blog/...
5. **Coach-Ausbildungsinstitute** (siehe `marketing.md` 3.6): „Empfohlene Tools für Absolventen" – Listing-Backlink mit hoher Relevanz.

### 6.2 Passiv (durch Produkt erzeugt)

1. **Coach-Subdomains, die Coaches selbst aktiv verlinken** – ihr eigener Website-Footer, „Termin buchen"-Button.
2. **CNAME-Coaches mit dezentem „Powered by HxRoom"** – `rel="nofollow"`, aber Brand-Sichtbarkeit.
3. **Case-Studies, die Coaches selbst teilen** – mit Erwähnung auf ihren Kanälen.

### 6.3 Was bewusst nicht tun

- **Keine PBN- oder Linkkauf-Schemata.** Im Coach-Markt sofort als unseriös erkennbar, und Google-Penalty-Risiko.
- **Keine massenhaften Verzeichnis-Einträge.** Wenig Mehrwert, oft Spam-Signal.
- **Kein „SEO-Agentur-im-Ausland"-Setup.** Lieber 5 starke, kontextrelevante Links als 500 schwache.

---

## 7. Local & Brand SEO

### 7.1 Google Business Profile

- **„HxRoom" als Marke** in Google Business Profile anlegen (Service Area: Deutschland, Österreich, Schweiz). Keine physische Adresse nötig.
- Kategorie: „Software-Unternehmen" / „Online-Coaching-Plattform".
- Verknüpft mit `hxroom.de` und Stefans LinkedIn.

### 7.2 Brand-Such-Hygiene

Wer „HxRoom" googelt, soll auf Seite 1 finden:

1. Hauptdomain `hxroom.de`
2. `/preise`, `/funktionen`, `/blog` als Sitelinks
3. LinkedIn-Profil von Stefan
4. Google Business Profile mit Bewertungen
5. Erste Case Studies / Coach-Testimonials

**Wikipedia/Wikidata:** Zu früh. Nicht künstlich pushen – kommt mit Reichweite.

### 7.3 Reputation & Reviews

- **Provenexpert, Trustpilot, OMR-Reviews:** Sobald 10+ zahlende Kunden, aktiv um Bewertungen bitten. Diese Plattformen ranken stark für „HxRoom Erfahrungen".
- **G2 / Capterra:** Englischsprachig, eher für später (Internationalisierung). Trotzdem Listing anlegen, falls Coaches dort suchen.

---

## 8. KI-Suche (LLM-Antworten) – „AEO" / „GEO"

Mehr als 10 % der Coach-Recherche läuft inzwischen über ChatGPT, Claude, Perplexity, Gemini. „AI Search Optimization" ist 2026 kein Nice-to-have mehr.

### 8.1 Was funktioniert

- **Klare Vergleichsseiten** mit echten Vor- und Nachteilen (auch eigene Nachteile nennen). LLMs zitieren Quellen, die strukturiert und differenziert argumentieren.
- **FAQ-Blöcke** auf jeder Conversion-Seite – LLMs parsen Q&A-Strukturen besonders gerne.
- **Strukturierte Daten** (Schema.org) – nicht nur für Google, sondern auch für LLM-Crawler.
- **Klare Faktendichte:** „HxRoom hostet alle Daten auf Servern in Frankfurt am Main" wird zitiert. „Wir setzen auf höchste Datensicherheit" nicht.

### 8.2 Was bewusst zulassen

- **ChatGPTBot, ClaudeBot, PerplexityBot, GPTBot** in `robots.txt` **nicht** blockieren. Diese Bots sind die neuen Empfehlungsmaschinen für die Zielgruppe.
- Ausnahme: Coach-Subdomains mit Klienten-Buchungsdaten – diese müssen sowieso `noindex` für Detailseiten sein.

### 8.3 Was messen

- Stichproben-Prompts in ChatGPT/Claude/Perplexity einmal pro Quartal: „Was ist die beste Zoom-Alternative für Coaches in Deutschland?", „DSGVO-konformes Videocall-Tool für Online-Coaching?".
- Wenn HxRoom genannt wird → Inhalt verstärken. Wenn nicht → Fakten-Lücke schließen.

---

## 9. Messung & KPIs

### 9.1 Tools

- **Google Search Console** (Pflicht, kostenlos, datenschutzkonform).
- **Plausible Analytics (Cloud, EU-gehostet, ~10 €/Monat)** statt Google Analytics 4 – Cookie-frei, kein Consent-Banner, passt zum DSGVO-Versprechen und zur Marken-Positionierung.
- **Ahrefs** oder **Sistrix** ab Monat 3 (~150 €/Monat) – Sistrix hat den besseren DACH-Index, Ahrefs den besseren Backlink-Index. Erst dann, wenn man Daten zum Steuern braucht.
- **Screaming Frog** (199 £/Jahr) für quartalsweise Technical-Audits.

### 9.2 KPIs nach Phase

**Monat 1–3 (Setup-Phase):**

- Indexierungsrate >90 % der eingereichten Seiten
- 0 kritische Core-Web-Vitals-Probleme
- 1. Sitemap-Submission erfolgreich
- Brand-Suchen „HxRoom" >0 (Trigger: nach den ersten 20 Kalt-Mails)

**Monat 4–6 (Aufbau):**

- 10+ rankende Keywords (Position 1–50)
- 100+ organische Sitzungen/Monat
- 5+ Backlinks von relevanten Domains
- 1+ rankende Vergleichsseite (`/vergleich/zoom` auf Seite 1–2)

**Monat 7–12 (Skalierung):**

- 50+ rankende Keywords, davon 10+ in Top 10
- 1.000+ organische Sitzungen/Monat
- 20+ relevante Backlinks
- 5+ organische Trial-Anmeldungen/Monat

**Monat 12+ (Reife):**

- Pillar-Artikel als „featured snippet" zu Long-Tail-Themen
- SEO trägt 20–30 % zu den monatlichen Neukunden bei
- Mindestens 3 LLM-Antworten (ChatGPT, Claude, Perplexity) erwähnen HxRoom bei einschlägigen Prompts

### 9.3 Anti-Vanity-Metriken

**Nicht** als Erfolg verkaufen lassen:

- Impressions in der Search Console allein (ohne CTR-Kontext)
- Domain-Authority-Scores (Ahrefs DR, Moz DA – Drittanbieter-Metrik, nicht Google)
- „Top-10-Keywords-Anzahl" ohne Bezug zur Conversion-Relevanz

---

## 10. Risiken & Gegenmittel

| Risiko | Wahrscheinlichkeit | Gegenmittel |
|---|---|---|
| Google-Core-Update kippt Rankings | hoch (1–2x/Jahr) | Content nicht auf Keyword-Tricks, sondern auf echten Nutzen aufbauen |
| Coach-Subdomains werden als „doorway pages" gewertet | mittel | Jede Subdomain hat echten, eigenen Content (Bio, Angebot) – keine Templates ohne Substanz |
| KI-Content-Flut verwässert organische SERPs | hoch | Echte Autoren, echte Cases, echte Screenshots – nicht 0815-KI-Text |
| `app.hxroom.de` versehentlich indexiert | mittel | Header-basiertes `X-Robots-Tag: noindex` als Pflicht im Reverse-Proxy |
| Coaches kündigen → tote Subdomains | mittel | Bei Kündigung: 410 (Gone) statt 404, oder 301 auf hxroom.de wenn der Slug zurückkommt |
| Duplicate-Content über CNAME-Coaches | mittel | Canonical auf eigene Coach-Domain setzen (nicht auf HxRoom-Subdomain) |
| Brand-Squatting auf „hxroom.com" / Tippfehler-Domains | niedrig | Defensiv registrieren: hxroom.com, hx-room.de, hxrom.de |

---

## 11. SEO-Prioritäten gegen den Rest der Roadmap

SEO ist im 90-Tage-Plan (siehe `project.md` Abschnitt 10) nicht im kritischen Pfad. Daher pragmatische Aufgabenverteilung:

| Phase | SEO-Aufgabe | Aufwand |
|---|---|---|
| **Monat 1** | Landingpage SEO-tauglich bauen (SSR, Meta, Schema) | 2 PT |
| **Monat 1** | Search Console + Plausible einrichten, Sitemap einreichen | 0.5 PT |
| **Monat 2** | `/preise`, `/funktionen`, `/datenschutz` mit SEO-Basis | 1 PT |
| **Monat 3** | Erste Vergleichsseite `/vergleich/zoom` | 1.5 PT |
| **Monat 3** | Erste 2 Blog-Artikel (DSGVO-Pillar, Zoom-Alternative-Pillar) | 3 PT |
| **Monat 4–6** | Blog-Frequenz: 2 Artikel/Monat | 2 PT/Monat |
| **Monat 4** | Coach-Subdomain-SEO-Templates (Schema.org, Sitemap) | 1.5 PT |
| **Monat 6** | Erstes Technical-SEO-Audit (Screaming Frog) | 0.5 PT |
| **Monat 6+** | Backlink-Outreach + Case Studies | 1 PT/Monat |

Gesamtaufwand SEO Monat 1–6: ca. **15 PT**. Realistisch nebenbei machbar, **wenn** die SEO-Basis von Anfang an mit ins Frontend-Setup gebaut wird – das ist der entscheidende Hebel.

---

## 12. Nächste Schritte (umsetzbar diese Woche)

- [ ] `hxroom.de` (DNS + SSL) für Landingpage scharf schalten
- [ ] Search Console + Plausible-Property anlegen
- [ ] `robots.txt` und `sitemap.xml` initial einrichten
- [ ] Nuxt-3-Boilerplate mit `useSeoMeta` + `@nuxtjs/sitemap` aufsetzen
- [ ] Keyword-Liste (Abschnitt 1.2) in Sistrix/Ahrefs-Trial gegen Suchvolumen prüfen
- [ ] Brand-Such-Trigger: nach ersten 20 Kalt-Mails Search Console auf „HxRoom"-Impressions checken
- [ ] Erste Vergleichsseite `/vergleich/zoom` als Pilot bauen (Template für die anderen Vergleichsseiten)
