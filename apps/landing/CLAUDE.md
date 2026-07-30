# apps/landing – Claude Code Kontext

## SEO & Crawler-Konfiguration

`apps/landing` ist öffentlich indexierbar. Nur Rechtsseiten sind ausgeschlossen:
- `impressum.vue` und `datenschutz.vue` haben `{ name: 'robots', content: 'noindex, follow' }` – das bleibt so.
- `apps/bookingpage` hat weiterhin noindex (Pre-Launch) – dort nichts ändern.

**robots.txt** (`apps/landing/public/robots.txt`) und **llms.txt** (`apps/landing/public/llms.txt`) müssen bei inhaltlichen Änderungen an der Landing-Page aktuell gehalten werden:
- Neue Seiten in `robots.txt` unter `Disallow` eintragen, wenn sie nicht indexiert werden sollen.
- Neue Funktionen, Preisänderungen oder FAQ-Antworten in `llms.txt` nachziehen, damit KI-Crawler (OAI-SearchBot, GPTBot, Perplexity) korrekte Daten liefern.

**noindex für `apps/bookingpage`:** `grep -rn noindex apps/bookingpage` findet alle Stellen. Vor dem öffentlichen Launch entfernen.
