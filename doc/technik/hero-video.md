# Hero-Loop der Landing-Page

Im ersten Bildschirm der Landing-Page läuft statt eines Screenshots ein stummer Loop von 18 Sekunden. Er zeigt den Ablauf aus Sicht des Klienten: buchen, Mail mit Bestätigung und Erinnerung, Warteraum, Einlass durch den Coach, Gespräch.

## Quelle

`media/hero-video/` ist ein eigenständiges [HyperFrames](https://github.com/heygen-com/hyperframes)-Projekt (HTML und GSAP, gerendert in Headless-Chrome, kodiert mit FFmpeg). Es gehört nicht zum pnpm-Workspace und hat eigene `node_modules`. Docker-Builds schließen den Ordner aus (`.dockerignore`).

- `index.html` – die Komposition in 16:10 (1920×1200): Szenen, Schrittleiste, Bildtexte, Zeitleiste
- `mobile.html` – die Handy-Fassung in 4:5 (1080×1350) mit gleichen Szenen und gleichem Timing, aber weniger und größeren Elementen (Tagesleiste statt Monatskalender, Chat als Einblendung im Bild). Der Bildtext bleibt so auch bei rund 330 px Anzeigebreite lesbar.
- `assets/` – Schriften aus `packages/ui/theme/fonts` und das Foto aus `apps/landing/public/stefan.jpg` (Kopien)
- `encode.sh` – rendert und kodiert für die Landing-Page

Die Oberfläche ist vereinfacht nachgebaut, nicht abgefilmt: gleiche Farben, Schriften und Texte wie in HxRoom, aber größer, damit sie im Hero-Rahmen lesbar bleibt. Gezeigt wird nur, was es in HxRoom gibt. Der letzte Frame entspricht dem ersten, damit die Schleife ohne Sprung läuft.

Beide Kompositionen gibt es hell und dunkel. Die Variable `theme` (`light` oder `dark`, deklariert in `data-composition-variables` am `<html>`) setzt `data-theme="dark"`, und ein CSS-Block überschreibt die Farbvariablen mit den Dunkel-Werten aus `packages/ui/theme/main.css`. Gedämpfte Texte sind dort etwas heller als im Theme, damit sie verkleinert lesbar bleiben. Die Mail-Karte bleibt auch dunkel hell, so wie die Mail im Postfach aussieht. Farben gehören deshalb immer in die Variablen (`--surface` für Karten, `--line` für Linien, `--glass` für Namensschilder), nie als feste Werte in einzelne Regeln.

## Ändern und neu rendern

Voraussetzungen: Node 22 oder neuer, FFmpeg.

```bash
cd media/hero-video
npm install
npm run preview      # Studio mit Live-Vorschau
npm run check        # Lint, Layout, Bewegung; Warnungen „line_unread“ am Filmende sind bei der Schleife gewollt
npm run snapshot -- --at 0,3.2,6.2,10.7,15.5,17.99   # Standbilder nach .hyperframes/artifacts/snapshots/
./encode.sh          # schreibt nach apps/landing/public/video/
```

Die npm-Skripte setzen `HYPERFRAMES_NO_TELEMETRY=1`. Wer `npx hyperframes` direkt aufruft, setzt die Variable selbst.

Die Handy-Fassung rendert `npx hyperframes render -c mobile.html`, die dunkle Fassung zusätzlich mit `--variables '{"theme":"dark"}'`. `snapshot` kennt keine Variablen; für Standbilder der Handy- oder der dunklen Fassung einen Entwurf rendern (`-q draft`) und Bilder mit FFmpeg herausziehen.

`encode.sh` rendert beide Fassungen hell und dunkel und erzeugt:

| Datei | Inhalt |
|---|---|
| `hxroom-buchung-bis-videocall.mp4` | H.264, 1440×900, 30 fps, ohne Tonspur, `faststart` (rund 650 KB) |
| `hxroom-buchung-bis-videocall-poster.webp` | erstes Bild, zugleich Standbild bei reduzierter Bewegung |
| `hxroom-buchung-bis-videocall-mobil.mp4` | Handy-Fassung, H.264, 1080×1350 (rund 840 KB) |
| `hxroom-buchung-bis-videocall-mobil-poster.webp` | Poster der Handy-Fassung |
| `…-dunkel.mp4`, `…-dunkel-poster.webp` | 16:10 dunkel |
| `…-mobil-dunkel.mp4`, `…-mobil-dunkel-poster.webp` | Handy-Fassung dunkel |

## Einbau

`HeroSection.vue` übergibt alle vier Fassungen an `ScreenFrame.vue`. Der Rahmen:

- wählt unter 640 px Breite die Handy-Fassung: das Video per `<source media>`, das Poster per `<picture>` unter dem Video (das `poster`-Attribut kennt keine Media-Queries), das Seitenverhältnis per CSS,
- wählt hell oder dunkel: Bis die Seite im Browser läuft, entscheidet beim Poster `prefers-color-scheme` (das statische HTML kennt die Einstellung des Besuchers nicht). Danach folgen Poster und Video `useColorMode()`, auch beim Umschalten im Footer. Die Videoquellen kommen erst im Browser dazu, damit niemand die Fassung des anderen Schemas vorlädt,
- startet den Loop erst im Browser und nur, solange mindestens ein Viertel davon sichtbar ist,
- startet ihn bei `prefers-reduced-motion: reduce` nicht; dann bleibt das Poster stehen,
- hat in der Titelleiste einen Knopf zum Anhalten und Abspielen (WCAG 2.2.2). Wer anhält, dem startet der Loop auch beim erneuten Hineinscrollen nicht von selbst wieder.

Das Poster wird im Hero mit `fetchpriority="high"` vorgeladen, weil es das LCP-Element ist; die vier Preload-Links tragen dieselben Media-Queries (Breite und Farbschema), sodass jedes Gerät nur sein Poster lädt. Video und Poster liegen auf dem eigenen Server; es gibt keine Anfragen an Dritte.
