# Hero-Loop der Landing-Page

Im ersten Bildschirm der Landing-Page läuft statt eines Screenshots ein stummer Loop von 18 Sekunden. Er zeigt den Ablauf aus Sicht des Klienten: buchen, Mail mit Bestätigung und Erinnerung, Warteraum, Einlass durch den Coach, Gespräch.

## Quelle

`media/hero-video/` ist ein eigenständiges [HyperFrames](https://github.com/heygen-com/hyperframes)-Projekt (HTML und GSAP, gerendert in Headless-Chrome, kodiert mit FFmpeg). Es gehört nicht zum pnpm-Workspace und hat eigene `node_modules`. Docker-Builds schließen den Ordner aus (`.dockerignore`).

- `index.html` – die Komposition: Szenen, Schrittleiste, Bildtexte, Zeitleiste
- `assets/` – Schriften aus `packages/ui/theme/fonts` und das Foto aus `apps/landing/public/stefan.jpg` (Kopien)
- `encode.sh` – rendert und kodiert für die Landing-Page

Die Oberfläche ist vereinfacht nachgebaut, nicht abgefilmt: gleiche Farben, Schriften und Texte wie in HxRoom, aber größer, damit sie im Hero-Rahmen lesbar bleibt. Gezeigt wird nur, was es in HxRoom gibt. Der letzte Frame entspricht dem ersten, damit die Schleife ohne Sprung läuft.

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

`encode.sh` erzeugt:

| Datei | Inhalt |
|---|---|
| `hxroom-buchung-bis-videocall.mp4` | H.264, 1440×900, 30 fps, ohne Tonspur, `faststart` (rund 650 KB) |
| `hxroom-buchung-bis-videocall-poster.webp` | erstes Bild, zugleich Standbild bei reduzierter Bewegung |

## Einbau

`HeroSection.vue` übergibt Video und Poster an `ScreenFrame.vue`. Der Rahmen:

- startet den Loop erst im Browser und nur, solange mindestens ein Viertel davon sichtbar ist,
- startet ihn bei `prefers-reduced-motion: reduce` nicht; dann bleibt das Poster stehen,
- hat in der Titelleiste einen Knopf zum Anhalten und Abspielen (WCAG 2.2.2). Wer anhält, dem startet der Loop auch beim erneuten Hineinscrollen nicht von selbst wieder.

Das Poster wird im Hero mit `fetchpriority="high"` vorgeladen, weil es das LCP-Element ist. Video und Poster liegen auf dem eigenen Server; es gibt keine Anfragen an Dritte.
