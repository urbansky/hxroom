import { createReadStream, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Die Dateien, die der Weichzeichner zur Laufzeit lädt, von der eigenen Origin statt von
// jsDelivr und storage.googleapis.com (technisches-konzept.md §17: keine
// Drittanbieter-Requests von der Klientenseite).
//
// - das MediaPipe-WASM (je eine Variante mit und ohne SIMD, der Browser lädt eine davon) –
//   aus node_modules, genau in der Version, die @livekit/track-processors mitbringt;
// - das Segmentierungsmodell `selfie_segmenter.tflite` – liegt in assets/mediapipe/, weil es
//   nicht auf npm erscheint (Quelle und Prüfsumme dort in der README).
//
// Der Pfad trägt die Version von tasks-vision. So dürfen die Dateien dauerhaft im Cache liegen,
// und ein Update des Pakets bekommt von selbst einen neuen Pfad. `blur.ts` erfährt ihn über
// den Platzhalter `__HXROOM_MEDIAPIPE_BASE__`, den das Plugin im Code ersetzt.

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(HERE, 'assets', 'mediapipe');

/** tasks-vision ist eine Abhängigkeit von track-processors, nicht von diesem Paket – deshalb von dort aus aufgelöst. */
function visionPackageDir(): string {
  const fromHere = createRequire(join(HERE, 'package.json'));
  const fromProcessors = createRequire(fromHere.resolve('@livekit/track-processors'));
  // `exports` gibt package.json nicht frei; der Einstieg liegt im Paketordner.
  return dirname(fromProcessors.resolve('@mediapipe/tasks-vision'));
}

const CONTENT_TYPES: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.tflite': 'application/octet-stream',
};

function contentType(name: string): string {
  return CONTENT_TYPES[name.slice(name.lastIndexOf('.'))] ?? 'application/octet-stream';
}

export function mediapipeAssets(): Plugin {
  const visionDir = visionPackageDir();
  const version = JSON.parse(readFileSync(join(visionDir, 'package.json'), 'utf8')).version as string;
  const base = `/_hxroom/mediapipe/${version}`;

  /** Dateiname → Pfad auf der Platte. */
  const files = new Map<string, string>();
  for (const name of readdirSync(join(visionDir, 'wasm'))) files.set(name, join(visionDir, 'wasm', name));
  files.set('selfie_segmenter.tflite', join(MODEL_DIR, 'selfie_segmenter.tflite'));

  return {
    name: 'hxroom:mediapipe-assets',

    // Den Pfad in blur.ts einsetzen. Als `transform` statt über `define`: Im Dev-Server von
    // Nuxt kam ein `define` aus einem Plugin nicht an – blur.ts sah keinen Pfad, und der
    // Schalter fehlte beim Coach.
    transform(code) {
      if (!code.includes('__HXROOM_MEDIAPIPE_BASE__')) return null;
      return { code: code.replace(/\b__HXROOM_MEDIAPIPE_BASE__\b/g, JSON.stringify(base)), map: null };
    },

    // Dev-Server: direkt von der Platte.
    configureServer(server) {
      server.middlewares.use(base, (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0]!.replace(/^\//, ''));
        const path = files.get(name);
        if (!path) return next();
        res.setHeader('Content-Type', contentType(name));
        createReadStream(path).pipe(res);
      });
    },

    // Build: als feste Dateien neben der App, ohne Hash im Namen – MediaPipe setzt die Namen
    // der WASM-Dateien selbst zusammen.
    generateBundle() {
      for (const [name, path] of files) {
        this.emitFile({ type: 'asset', fileName: `${base.slice(1)}/${name}`, source: readFileSync(path) });
      }
    },
  };
}
