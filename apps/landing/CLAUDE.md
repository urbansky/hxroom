# apps/landing – Claude Code Kontext

## SEO & Crawler-Konfiguration

`apps/landing` ist öffentlich indexierbar. Nur Rechtsseiten sind ausgeschlossen:
- `impressum.vue`, `datenschutz.vue`, `agb.vue` und `avv.vue` haben `{ name: 'robots', content: 'noindex, follow' }` – das bleibt so.
- `apps/bookingpage` hat weiterhin noindex (Pre-Launch) – dort nichts ändern.

**robots.txt** (`apps/landing/public/robots.txt`) und **llms.txt** müssen bei inhaltlichen Änderungen an der Landing-Page aktuell gehalten werden:
- Neue Seiten in `robots.txt` unter `Disallow` eintragen, wenn sie nicht indexiert werden sollen. Neue Seiten, die gefunden werden sollen, gehören in `server/routes/sitemap.xml.ts`.
- Neue Funktionen, Preisänderungen oder FAQ-Antworten im festen Kopf der `llms.txt` nachziehen: `server/assets/llms.md`. Den Rest (Handbuchseiten) erzeugt `server/routes/llms.txt.ts` aus der Collection, ebenso `llms-full.txt` und die `.md`-Fassungen der Handbuchseiten.

**noindex für `apps/bookingpage`:** `grep -rn noindex apps/bookingpage` findet alle Stellen. Vor dem öffentlichen Launch entfernen.

## Handbuch (`/handbuch`)

Konzept: `doc/marketing/handbuch.md`. Inhalte in `content/handbuch/` (Collection `handbuch`), Bilder per `scripts/handbuch-screens.mjs`.
- Ändert sich eine Funktion sichtbar, gehören die Handbuchseite (samt `updated`) und ihre Aufnahmen in denselben Commit. Bilder nie von Hand machen, sondern die Szene im Skript anpassen und neu aufnehmen.
- Beschrieben wird nur, was in Produktion sichtbar ist; was `BETA_HIDDEN_ROUTES` in der Coach-App ausblendet, kommt nicht vor.
