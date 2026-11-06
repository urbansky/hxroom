# HxRoom – Dokumentation

Fachliche und technische Referenz zu HxRoom. Bei Widersprüchen zwischen Code und Dokumentation gilt die Dokumentation als Quelle der Wahrheit für die fachliche Absicht.

Rollen: **Betreiber** (Inhaber der Plattform), **Coachs** (Kunden des Betreibers), **Klienten** (Kunden der Coachs).

## Ordner

| Ordner | Inhalt | Art |
|---|---|---|
| [`produkt/`](produkt/) | Produktidee, Pricing, UX-Anforderungen, Zeitplan | fachlich |
| [`produkt/funktionen/`](produkt/funktionen/) | Funktionslisten und Konzepte einzelner Funktionen | fachlich |
| [`recht/`](recht/) | Impressum, Datenschutz, AGB, AVV | fachlich |
| [`marketing/`](marketing/) | Marketing, SEO, Pitch Deck | fachlich |
| [`technik/`](technik/) | Architektur, Speicher, Drittdienste | technisch |
| [`prototypen/`](prototypen/) | HTML-Mockups der Oberflächen | fachlich |
| [`beispieldaten/`](beispieldaten/) | Beispielinhalte für Demo und Seed | fachlich |

Technische Dokumente werden mit dem Code gepflegt. Fachliche Dokumente ändert nur der Betreiber oder jemand in Absprache mit ihm.

## Dokumente

**Produkt**
- [project.md](produkt/project.md) – Ausgangslage, Produktidee, Zielgruppe, Differenzierung
- [pricing.md](produkt/pricing.md) – Pläne und Preismodell
- [ux-anforderungen.md](produkt/ux-anforderungen.md) – Anforderungen UX-01 ff. an die Bedienung
- [zeitplan.md](produkt/zeitplan.md) – Entwicklungsphasen und Meilensteine (Grafik: [zeitplan.html](produkt/zeitplan.html))

**Funktionen**
- [backoffice-coach.md](produkt/funktionen/backoffice-coach.md) – Funktionsliste der Coach-App
- [backoffice-betreiber.md](produkt/funktionen/backoffice-betreiber.md) – Funktionsliste des Betreiber-Backoffice
- [angebote-verfuegbarkeiten.md](produkt/funktionen/angebote-verfuegbarkeiten.md) – Angebote und Verfügbarkeiten
- [manuelle-termine.md](produkt/funktionen/manuelle-termine.md) – Termine manuell anlegen, einzeln oder als Serie
- [kalenderabgleich.md](produkt/funktionen/kalenderabgleich.md) – Zeiträume sperren und freigeben, belegte Zeiten aus externen Kalendern, Termine als Kalender-Abo
- [crm.md](produkt/funktionen/crm.md) – Vorschlag: Klientenbeziehung pflegen, in drei Stufen

**Recht**
- [legal.md](recht/legal.md) – DSGVO-Rollen und rechtliche Texte

**Marketing**
- [marketing.md](marketing/marketing.md) – Tonalität, Akquise, Maßnahmen
- [seo.md](marketing/seo.md) – SEO-Strategie
- [linkedin.md](marketing/linkedin.md) – Unternehmensseite HxRoom: Felder, Texte, Bilder, erster Beitrag
- [instagram.md](marketing/instagram.md) – Konto `hxroom.de`: Rolle, Profil, Inhalte, erste Beiträge, Ablauf
- [pitchdeck.html](marketing/pitchdeck.html) – Pitch Deck

**Technik**
- [technisches-konzept.md](technik/technisches-konzept.md) – Stack, Architektur, Deployment, Videocall
- [s3-verzeichnisschema.md](technik/s3-verzeichnisschema.md) – Ablage im Object Store
- [newsletter-brevo.md](technik/newsletter-brevo.md) – Newsletter und Transaktionsmails über Brevo
- [hero-video.md](technik/hero-video.md) – Hero-Loop der Landing-Page: Quelle, Rendern, Einbau
