# HxRoom – Blog (Redaktionsplan)

Dieses Verzeichnis enthält die ersten 10 Blog-Artikel für `hxroom.de/blog/`.
Sie sind auf die Keyword-Cluster aus [`../seo.md`](../seo.md) zugeschnitten und folgen der Tonalität aus [`../marketing.md`](../marketing.md) (Du-Ansprache, kleingeschrieben, Stefan als Absender).

## Artikel-Übersicht

| # | Slug | Cluster (siehe seo.md) | Typ | Priorität |
|---|---|---|---|---|
| 1 | [`online-coaching-dsgvo-leitfaden.md`](online-coaching-dsgvo-leitfaden.md) | B – DSGVO | Pillar | P1 |
| 2 | [`zoom-fuer-coaches-warum-es-nicht-mehr-reicht.md`](zoom-fuer-coaches-warum-es-nicht-mehr-reicht.md) | A – Zoom-Alternative | Pillar | P1 |
| 3 | [`professioneller-online-auftritt-coach.md`](professioneller-online-auftritt-coach.md) | D – Branding | Pillar | P2 |
| 4 | [`was-ist-ein-avv-coach.md`](was-ist-ein-avv-coach.md) | B – DSGVO | Support | P1 |
| 5 | [`server-in-deutschland-coaching.md`](server-in-deutschland-coaching.md) | B – DSGVO | Support | P1 |
| 6 | [`zoom-branding-entfernen.md`](zoom-branding-entfernen.md) | A – Zoom-Alternative | Support | P1 |
| 7 | [`dsgvo-fehler-online-coaching.md`](dsgvo-fehler-online-coaching.md) | B – DSGVO | Support | P2 |
| 8 | [`buchungssysteme-fuer-coaches-vergleich.md`](buchungssysteme-fuer-coaches-vergleich.md) | C – Tools | Support | P2 |
| 9 | [`kosten-professionelles-coaching-setup.md`](kosten-professionelles-coaching-setup.md) | F – Long-Tail | Support | P2 |
| 10 | [`online-coaching-ohne-account.md`](online-coaching-ohne-account.md) | A – Zoom-Alternative | Support | P2 |

## Frontmatter-Schema

Jeder Artikel beginnt mit einem YAML-Block. Felder:

```yaml
---
title: "..."          # 50–60 Zeichen, Keyword vorn, Brand hinten
description: "..."    # 140–160 Zeichen, Nutzen + CTA
slug: "..."           # URL-Pfad unter /blog/
date: 2026-05-15      # Veröffentlichungsdatum
updated: 2026-05-15   # Letzte Aktualisierung
author: "Stefan Urbansky"
authorRole: "Gründer von HxRoom"
category: "DSGVO" | "Tools" | "Branding" | "Praxis"
tags: [...]           # 3–6 Tags
keywords: [...]       # Hauptkeyword + 2–4 Varianten
cluster: "A" | "B" | "C" | "D" | "F"
type: "pillar" | "support"
readingTime: 8        # Minuten
canonical: "https://hxroom.de/blog/[slug]"
schema: "Article"     # für Schema.org
internalLinks:        # auf welche Geldseiten verlinkt der Artikel
  - "/preise"
  - "/funktionen/dsgvo"
---
```

## Interne Verlinkung – Regeln

Jeder Artikel verlinkt:

- **Mindestens 2 Geldseiten** (`/preise`, `/funktionen/dsgvo`, `/vergleich/zoom`, …)
- **1–2 thematisch verwandte Blog-Artikel** (Pillar ↔ Support)
- **Pillar-Artikel** sind Hubs – Support-Artikel verlinken immer zurück zur Pillar.

## Veröffentlichungsrhythmus

Nach SEO-Plan (siehe `../seo.md` Abschnitt 4.2): **2 Artikel pro Monat** ab Monat 3.
Vorschlag für die ersten 5 Monate:

| Monat | Artikel |
|---|---|
| Monat 3 | #1 (DSGVO-Pillar), #2 (Zoom-Pillar) |
| Monat 4 | #4 (AVV), #6 (Zoom Branding) |
| Monat 5 | #5 (Server DE), #7 (DSGVO-Fehler) |
| Monat 6 | #3 (Auftritts-Pillar), #10 (ohne Account) |
| Monat 7 | #8 (Buchungs-Vergleich), #9 (Kosten) |
