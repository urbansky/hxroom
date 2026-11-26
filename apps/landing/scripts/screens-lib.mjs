/**
 * Gemeinsames Werkzeug der Screenshot-Skripte: screenshots.mjs (Startseite) und
 * handbuch-screens.mjs (Handbuch). Voraussetzungen und Aufruf stehen in den beiden Skripten.
 *
 * Kunstgriff, nur für die Anzeige: Der laufende Termin des Demo-Seeds liegt in der echten
 * Gegenwart. Damit die Bilder nicht „06:00 Uhr“ zeigen, schreibt newContext() Start und Ende
 * dieses einen Termins in den API-Antworten und im Ereignis-Stream auf DISPLAY_TIME um.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
export const LANDING = resolve(HERE, '..');
export const API = resolve(LANDING, '../api');
export const TMP = mkdtempSync(join(tmpdir(), 'hxroom-screens-'));

export const COACH_APP = 'http://app.hxroom.localhost';
export const VIEWPORT = { width: 1440, height: 900 };
// Buchungsseite, Mail und Warteraum haben eine schmale Spalte in der Mitte. Im kleineren
// Fenster (ebenfalls 16:10) füllt sie mehr vom Bild, die Schrift bleibt lesbar.
export const NARROW = { width: 1120, height: 700 };
export const SCALE = 2;
export const DISPLAY_TIME = { hour: 8, minute: 30 };

export const fakeMedia = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];

/** Demo-Konto frisch anlegen (`pnpm db:seed:demo`); liefert Zugangsdaten und IDs. */
export function seedDemo() {
  console.log('Demo-Konto anlegen …');
  const seedOutput = execFileSync('pnpm', ['-s', 'db:seed:demo'], { cwd: API, encoding: 'utf8' });
  const demo = JSON.parse(seedOutput.trim().split('\n').at(-1));
  if (demo.avatarWarning) console.warn(`  Foto fehlt: ${demo.avatarWarning}`);
  return demo;
}

/**
 * Kamerabild aus dem quadratischen Foto public/stefan.jpg. Chrome liefert der Seite ein
 * 16:9-Bild; `left` legt fest, wo das Foto darin steht, den Rest füllt ein Grau aus seinem
 * Hintergrund. Unten wird es etwas gekürzt.
 */
export function makeCamera(name, left) {
  const file = join(TMP, `${name}.mjpeg`);
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', join(LANDING, 'public/stefan.jpg'),
    '-filter_complex',
    `color=c=0xbabbbd:s=1280x720[bg];[0:v]scale=864:864:flags=lanczos,crop=864:720:0:0[fg];[bg][fg]overlay=${left}:0,format=yuvj420p`,
    '-frames:v', '1', '-q:v', '2', file,
  ]);
  return file;
}

/** Heute DISPLAY_TIME in Europe/Berlin, unabhängig von der Zeitzone des Rechners. */
export function displayStart() {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const hh = String(DISPLAY_TIME.hour).padStart(2, '0');
  const mm = String(DISPLAY_TIME.minute).padStart(2, '0');
  const probe = new Date(`${day}T${hh}:${mm}:00Z`);
  const shown = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', hourCycle: 'h23' }).format(probe));
  return new Date(probe.getTime() - (shown - DISPLAY_TIME.hour) * 60 * 60 * 1000);
}

/** Verschiebt startTime/endTime des laufenden Termins in einer API-Antwort. */
function shiftLiveBooking(node, liveId, inLiveResponse) {
  if (Array.isArray(node)) return node.map((item) => shiftLiveBooking(item, liveId, inLiveResponse));
  if (!node || typeof node !== 'object') return node;
  const isLive = node.id === liveId || node.bookingId === liveId;
  const copy = {};
  for (const [key, value] of Object.entries(node)) copy[key] = shiftLiveBooking(value, liveId, false);
  if (isLive || inLiveResponse) {
    // Terminlisten liefern startTime/endTime, die Call-Endpunkte start/end.
    for (const [startKey, endKey] of [['startTime', 'endTime'], ['start', 'end']]) {
      if (typeof copy[startKey] !== 'string' || typeof copy[endKey] !== 'string') continue;
      const start = displayStart();
      const duration = new Date(copy[endKey]).getTime() - new Date(copy[startKey]).getTime();
      copy[startKey] = start.toISOString();
      copy[endKey] = new Date(start.getTime() + duration).toISOString();
    }
    // Einlass und Ende eines beendeten Gesprächs: eine Minute nach Beginn eingelassen,
    // 14 Minuten gesprochen – das Skript beendet in Sekunden, die Abschlusskarte zeigte sonst
    // „unter 1 Min.“.
    if (typeof copy.admittedAt === 'string' && typeof copy.callEndedAt === 'string') {
      const admitted = new Date(displayStart().getTime() + 60 * 1000);
      copy.admittedAt = admitted.toISOString();
      copy.callEndedAt = new Date(admitted.getTime() + 14 * 60 * 1000).toISOString();
    }
  }
  return copy;
}

/**
 * Chat-Nachrichten des laufenden Termins: drei Minuten nach Beginn statt der echten Uhrzeit.
 * Nur Nachrichten (erkennbar am Absender), nicht etwa den Anlagezeitpunkt der Buchung.
 */
function retimeMessages(node) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.createdAt === 'string' && 'sender' in node) {
    node.createdAt = new Date(displayStart().getTime() + 3 * 60 * 1000).toISOString();
  }
  Object.values(node).forEach(retimeMessages);
}

/** Gleiche Bildgröße für alle Motive: das schmalere Fenster bekommt einen höheren Faktor. */
export function scaleFor(viewport) {
  return (VIEWPORT.width * SCALE) / viewport.width;
}

/** Handy für Aufnahmen aus Sicht der Klienten: Fenstergröße eines iPhone, dreifache Auflösung. */
export const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

/**
 * Browser-Kontext mit Kamerafreigabe, ohne Nuxt-DevTools und mit verschobenem Live-Termin.
 * `device` ersetzt Fenster und Auflösung, etwa durch PHONE.
 */
export async function newContext(browser, demo, scheme, viewport = VIEWPORT, device = null) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scaleFor(viewport),
    ...device,
    permissions: ['camera', 'microphone'],
    colorScheme: scheme,
  });
  // Nuxt-DevTools-Abzeichen gehört nicht aufs Bild.
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important; }';
      document.head.append(style);
    });
  });
  // Geräte fürs Bild: Das Mikrofon ist ein Ton aus WebAudio statt Chromes simuliertem
  // Audiogerät – dessen Aufnahme hängt je nach Zustand des Audiodiensts von macOS, und
  // getUserMedia kehrt dann nie zurück. Kamera und Mikrofon tragen in der Geräteauswahl
  // Namen wie an einem echten Rechner statt „Fake Default Audio Input“ und Dateipfad.
  await context.addInitScript(() => {
    const md = navigator.mediaDevices;
    if (!md) return;
    const MIC_ID = 'screens-microphone';
    const getUserMedia = md.getUserMedia.bind(md);
    const enumerateDevices = md.enumerateDevices.bind(md);
    let audioContext;
    const microphoneTrack = () => {
      audioContext ??= new AudioContext();
      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0.3;
      const out = audioContext.createMediaStreamDestination();
      tone.connect(gain).connect(out);
      tone.start();
      const track = out.stream.getAudioTracks()[0];
      const settings = track.getSettings.bind(track);
      track.getSettings = () => ({ ...settings(), deviceId: MIC_ID, groupId: MIC_ID });
      return track;
    };
    md.getUserMedia = async (constraints = {}) => {
      const stream = constraints.video ? await getUserMedia({ video: constraints.video }) : new MediaStream();
      if (constraints.audio) stream.addTrack(microphoneTrack());
      return stream;
    };
    md.enumerateDevices = async () => {
      const devices = await enumerateDevices();
      const plain = (d, label) => ({ deviceId: d.deviceId, groupId: d.groupId, kind: d.kind, label, toJSON() { return { ...this }; } });
      return [
        plain({ deviceId: MIC_ID, groupId: MIC_ID, kind: 'audioinput' }, 'MacBook Pro-Mikrofon'),
        ...devices.filter((d) => d.kind === 'videoinput').slice(0, 1).map((d) => plain(d, 'FaceTime HD-Kamera')),
        ...devices.filter((d) => d.kind === 'audiooutput').slice(0, 1).map((d) => plain(d, 'MacBook Pro-Lautsprecher')),
      ];
    };
  });
  // Der Warteraum bekommt seinen Zustand auch über den Ereignis-Stream, samt start/end.
  // Streams lassen sich mit route nicht umschreiben, deshalb hier im Browser.
  await context.addInitScript(({ liveId, startIso }) => {
    const shift = (data) => {
      try {
        const event = JSON.parse(data);
        if (!event || typeof event !== 'object') return data;
        // Chat-Nachrichten: drei Minuten nach Beginn statt der echten Uhrzeit, auch verschachtelt
        const messageTime = new Date(new Date(startIso).getTime() + 3 * 60 * 1000).toISOString();
        const retime = (node) => {
          if (!node || typeof node !== 'object') return;
          if (typeof node.createdAt === 'string' && 'sender' in node) node.createdAt = messageTime;
          Object.values(node).forEach(retime);
        };
        retime(event);
        if (event.bookingId === liveId && event.start && event.end) {
          const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
          event.start = startIso;
          event.end = new Date(new Date(startIso).getTime() + duration).toISOString();
        }
        return JSON.stringify(event);
      } catch {
        return data;
      }
    };
    const wrap = (listener) => (event) => listener(
      typeof event.data === 'string' ? new MessageEvent(event.type, { data: shift(event.data), lastEventId: event.lastEventId }) : event,
    );
    const Original = window.EventSource;
    window.EventSource = class extends Original {
      addEventListener(type, listener, options) {
        return super.addEventListener(type, typeof listener === 'function' ? wrap(listener) : listener, options);
      }
      set onmessage(listener) { super.onmessage = listener ? wrap(listener) : null; }
      get onmessage() { return super.onmessage; }
    };
  }, { liveId: demo.liveBookingId, startIso: displayStart().toISOString() });
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const accept = request.headers().accept ?? '';
    // Ereignis-Streams lassen sich nicht umschreiben. Außer GET nur die Anfragen zum
    // laufenden Termin: Der Warteraum holt seinen Zustand per POST (Token gegen Zugang).
    const isStream = accept.includes('text/event-stream') || request.url().includes('/events');
    const isLive = request.url().includes(demo.liveBookingId);
    // Uploads unverändert durch: route.fetch() schickte den Multipart-Body beschädigt weiter.
    const isUpload = (request.headers()['content-type'] ?? '').includes('multipart/form-data');
    if (isStream || isUpload || (request.method() !== 'GET' && !isLive)) {
      return route.continue();
    }
    const response = await route.fetch();
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('application/json')) return route.fulfill({ response });
    const body = shiftLiveBooking(await response.json(), demo.liveBookingId, isLive);
    if (isLive) retimeMessages(body);
    return route.fulfill({ response, json: body });
  });
  return context;
}

/** Bildschirmfoto als WebP nach `out`; `options` gehen an page.screenshot (etwa `clip`). */
export async function saveWebp(page, out, options = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const png = join(TMP, 'shot.png');
  await page.screenshot({ ...options, path: png });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', out]);
}

export async function loginCoach(page, demo) {
  await page.goto(`${COACH_APP}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name=email]', demo.email);
  await page.fill('input[name=password]', demo.password);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'));
}
