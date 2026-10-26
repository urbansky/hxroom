/**
 * Erzeugt die Screenshots der Landingpage (phase5-umsetzungsplan.md, Schritt 9b) nach
 * apps/landing/public/screens/*.webp.
 *
 * Voraussetzungen:
 *  - lokaler Stack läuft (Caddy, Postgres, RustFS, LiveKit, API, Coach-App, Buchungsseite)
 *  - installiertes Google Chrome, ffmpeg (Kamerabild und WebP)
 *  - Playwright als Modul. Es ist bewusst keine Abhängigkeit des Projekts; der Pfad kommt
 *    über PLAYWRIGHT_PATH, etwa .../node_modules/playwright/index.mjs
 *
 * Aufruf aus dem Repo-Wurzelverzeichnis:
 *   PLAYWRIGHT_PATH=… node apps/landing/scripts/screenshots.mjs
 *
 * Ablauf: `pnpm db:seed:demo` legt lokal ein Abbild von demo.hxroom.de an (Profil, Foto,
 * Impressum und Angebot aus der Produktion, fiktive Klienten und Termine). Danach nimmt
 * das Skript Buchungsseite, Bestätigungsmail, Warteraum, Gespräch und Dashboard auf.
 *
 * Zwei Kunstgriffe, beide nur für die Anzeige:
 *  - Der laufende Termin für Warteraum und Gespräch liegt in der echten Gegenwart. Damit
 *    die Bilder nicht „06:00 Uhr“ zeigen, schreibt das Skript Start und Ende dieses einen
 *    Termins in den API-Antworten auf DISPLAY_TIME um.
 *  - Der Coach sendet als Kamera das Foto public/stefan.jpg, der Klient hat die Kamera aus.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const LANDING = resolve(HERE, '..');
const API = resolve(LANDING, '../api');
const OUT = join(LANDING, 'public/screens');
const TMP = mkdtempSync(join(tmpdir(), 'hxroom-screens-'));

const COACH_APP = 'http://app.hxroom.localhost';
const VIEWPORT = { width: 1440, height: 900 };
// Buchungsseite, Mail und Warteraum haben eine schmale Spalte in der Mitte. Im kleineren
// Fenster (ebenfalls 16:10) füllt sie mehr vom Bild, die Schrift bleibt auf der Landingpage
// lesbar.
const NARROW = { width: 1120, height: 700 };
const SCALE = 2;
const DISPLAY_TIME = { hour: 8, minute: 30 };
const NOTES = [
  'Vorführung mit Miriam (Business Coach)',
  '– nutzt bisher Calendly und Zoom',
  '– wichtig: Buchungsseite mit eigenem Foto, Erinnerungsmails',
  '– Frage: Kann sie bestehende Klienten übernehmen?',
];
const CHAT_MESSAGE = 'Schön, dass du da bist, Miriam! Ich zeige dir zuerst, wie deine Klienten bei dir buchen.';

mkdirSync(OUT, { recursive: true });

// --- Vorbereitung ------------------------------------------------------------------

console.log('Demo-Konto anlegen …');
const seedOutput = execFileSync('pnpm', ['-s', 'db:seed:demo'], { cwd: API, encoding: 'utf8' });
const demo = JSON.parse(seedOutput.trim().split('\n').at(-1));
if (demo.avatarWarning) console.warn(`  Foto fehlt: ${demo.avatarWarning}`);

// Kamerabild des Coachs aus dem quadratischen Foto. Chrome liefert der Seite ein 16:9-Bild,
// und der geöffnete Chat legt sich über die rechte Hälfte der Videokachel. Sichtbar bleiben
// etwa die linken zwei Drittel – genau dorthin kommt das Foto, unten etwas gekürzt; den Rest
// füllt ein Grau aus seinem Hintergrund.
const camera = join(TMP, 'coach-camera.mjpeg');
execFileSync('ffmpeg', [
  '-loglevel', 'error', '-y', '-i', join(LANDING, 'public/stefan.jpg'),
  '-filter_complex',
  'color=c=0xbabbbd:s=1280x720[bg];[0:v]scale=864:864:flags=lanczos,crop=864:720:0:0[fg];[bg][fg]overlay=4:0,format=yuvj420p',
  '-frames:v', '1', '-q:v', '2', camera,
]);

const mailHtml = execFileSync('npx', ['tsx', 'src/db/render-demo-mail.ts'], { cwd: API, encoding: 'utf8' });

// --- Hilfen ------------------------------------------------------------------------

/** Heute DISPLAY_TIME in Europe/Berlin, unabhängig von der Zeitzone des Rechners. */
function displayStart() {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const hh = String(DISPLAY_TIME.hour).padStart(2, '0');
  const mm = String(DISPLAY_TIME.minute).padStart(2, '0');
  const probe = new Date(`${day}T${hh}:${mm}:00Z`);
  const shown = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', hourCycle: 'h23' }).format(probe));
  return new Date(probe.getTime() - (shown - DISPLAY_TIME.hour) * 60 * 60 * 1000);
}

/** Verschiebt startTime/endTime des laufenden Termins in einer API-Antwort. */
function shiftLiveBooking(node, inLiveResponse) {
  if (Array.isArray(node)) return node.map((item) => shiftLiveBooking(item, inLiveResponse));
  if (!node || typeof node !== 'object') return node;
  const isLive = node.id === demo.liveBookingId || node.bookingId === demo.liveBookingId;
  const copy = {};
  for (const [key, value] of Object.entries(node)) copy[key] = shiftLiveBooking(value, false);
  if (isLive || inLiveResponse) {
    // Terminlisten liefern startTime/endTime, die Call-Endpunkte start/end.
    for (const [startKey, endKey] of [['startTime', 'endTime'], ['start', 'end']]) {
      if (typeof copy[startKey] !== 'string' || typeof copy[endKey] !== 'string') continue;
      const start = displayStart();
      const duration = new Date(copy[endKey]).getTime() - new Date(copy[startKey]).getTime();
      copy[startKey] = start.toISOString();
      copy[endKey] = new Date(start.getTime() + duration).toISOString();
    }
  }
  return copy;
}

/** Chat-Nachrichten des laufenden Termins: drei Minuten nach Beginn statt der echten Uhrzeit. */
function retimeMessages(node) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.createdAt === 'string') {
    node.createdAt = new Date(displayStart().getTime() + 3 * 60 * 1000).toISOString();
  }
  Object.values(node).forEach(retimeMessages);
}

/** Gleiche Bildgröße für alle Motive: das schmalere Fenster bekommt einen höheren Faktor. */
function scaleFor(viewport) {
  return (VIEWPORT.width * SCALE) / viewport.width;
}

async function newContext(browser, viewport = VIEWPORT) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scaleFor(viewport), permissions: ['camera', 'microphone'], colorScheme: 'light' });
  // Nuxt-DevTools-Abzeichen gehört nicht aufs Bild.
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important; }';
      document.head.append(style);
    });
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
          if (typeof node.createdAt === 'string') node.createdAt = messageTime;
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
    if (isStream || (request.method() !== 'GET' && !isLive)) {
      return route.continue();
    }
    const response = await route.fetch();
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('application/json')) return route.fulfill({ response });
    const body = shiftLiveBooking(await response.json(), isLive);
    if (isLive) retimeMessages(body);
    return route.fulfill({ response, json: body });
  });
  return context;
}

async function save(page, name) {
  const png = join(TMP, `${name}.png`);
  await page.screenshot({ path: png });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', join(OUT, `${name}.webp`)]);
  console.log(`  ${name}.webp`);
}

async function loginCoach(page) {
  await page.goto(`${COACH_APP}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name=email]', demo.email);
  await page.fill('input[name=password]', demo.password);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'));
}

// --- Aufnahmen ---------------------------------------------------------------------

const fakeMedia = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
const clientBrowser = await chromium.launch({ channel: 'chrome', args: fakeMedia });
const coachBrowser = await chromium.launch({ channel: 'chrome', args: [...fakeMedia, `--use-file-for-fake-video-capture=${camera}`] });

try {
  console.log('Aufnahmen …');

  // 1. Buchungsseite: Angebot mit gewähltem Tag und freien Zeiten
  const visitor = await (await newContext(clientBrowser, NARROW)).newPage();
  await visitor.goto(`${demo.bookingPageUrl}/offers/${demo.offerId}`, { waitUntil: 'domcontentloaded' });
  // exact: „Freie Termine verfügbar“ in der Legende träfe sonst mit.
  await visitor.getByText('Freie Termine', { exact: true }).waitFor();
  await visitor.waitForTimeout(1000);
  // Tage ohne freie Zeiten sind im Kalender deaktiviert.
  const firstDay = visitor.locator('button:not([disabled])').filter({ hasText: /^\s*\d{1,2}\s*$/ }).first();
  await firstDay.click();
  await visitor.waitForTimeout(1200);
  // Ausschnitt: Coach, „Freie Termine“, Kalender und Zeiten – das Angebot steht darüber.
  await visitor.getByText('Freie Termine', { exact: true }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 210));
  await visitor.waitForTimeout(600);
  await save(visitor, 'booking-page');

  // 2. Bestätigungsmail
  const mail = await (await clientBrowser.newContext({ viewport: NARROW, deviceScaleFactor: scaleFor(NARROW) })).newPage();
  await mail.setContent(mailHtml, { waitUntil: 'load' });
  await mail.addStyleTag({ content: 'body { zoom: 1.08; }' });
  await mail.waitForTimeout(500);
  await save(mail, 'confirmation-mail');

  // 3. Warteraum aus Sicht des Klienten. Die Uhr dieser Seite steht kurz nach DISPLAY_TIME:
  // Der Klient wartet aufs Einlassen („Es geht gleich los“). Sonst rechnete der Hinweis mit
  // der echten Zeit. Fürs Gespräch folgt eine eigene Seite mit echter Uhr, damit LiveKit
  // nicht mit falscher Zeit läuft.
  const waitingContext = await newContext(clientBrowser, NARROW);
  await waitingContext.clock.install({ time: new Date(displayStart().getTime() + 2 * 60 * 1000) });
  const waiting = await waitingContext.newPage();
  await waiting.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
  await waiting.getByText('Kamera und Mikrofon einrichten').waitFor();
  await waiting.waitForTimeout(1500);
  await save(waiting, 'waiting-room');
  await waitingContext.close();

  const client = await (await newContext(clientBrowser)).newPage();
  await client.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
  await client.getByText('Kamera und Mikrofon einrichten').waitFor();

  // 4. Gespräch aus Sicht des Klienten, wie die übrigen Stationen der Tour: der Coach groß,
  // daneben der Chat mit einer Nachricht von ihm. Der Coach schreibt vorher Notizen –
  // sie stehen dann auch im Dashboard am Termin.
  const coach = await (await newContext(coachBrowser)).newPage();
  await loginCoach(coach);
  await coach.goto(`${COACH_APP}/call/${demo.liveBookingId}`, { waitUntil: 'domcontentloaded' });
  await coach.getByRole('button', { name: 'Klient einlassen' }).click();
  await client.getByRole('button', { name: 'Kamera ausschalten' }).waitFor({ timeout: 20000 });
  await client.getByRole('button', { name: 'Kamera ausschalten' }).click();
  await coach.getByRole('button', { name: 'Notizen öffnen' }).click();
  const editor = coach.locator('[contenteditable="true"]').first();
  await editor.waitFor();
  // Ohne rote Wellenlinien der Rechtschreibprüfung („Calendly“)
  await editor.evaluate((el) => { el.spellcheck = false; });
  await editor.click();
  for (const [i, line] of NOTES.entries()) {
    await coach.keyboard.type(line);
    if (i < NOTES.length - 1) await coach.keyboard.press('Enter');
  }
  await coach.getByRole('button', { name: 'Chat öffnen' }).click();
  await coach.getByPlaceholder('Nachricht oder Link …').fill(CHAT_MESSAGE);
  await coach.getByRole('button', { name: 'Nachricht senden' }).click();
  await client.getByRole('button', { name: 'Chat öffnen' }).click();
  await client.getByText(CHAT_MESSAGE).waitFor();
  await client.mouse.move(VIEWPORT.width / 2, 40);
  await client.waitForTimeout(2500);
  await save(client, 'call');

  // 5. Dasselbe Gespräch aus Sicht des Coachs, mit seinen Notizen
  await coach.getByRole('button', { name: 'Notizen öffnen' }).click();
  await editor.waitFor();
  await editor.evaluate((el) => { el.spellcheck = false; el.blur(); });
  await coach.mouse.move(VIEWPORT.width / 2, 40);
  await coach.waitForTimeout(2000);
  await save(coach, 'call-coach');

  // 6. Dashboard des Coachs
  await coach.getByRole('button', { name: 'Sitzung beenden' }).click().catch(() => {});
  const dashboard = await (await newContext(coachBrowser)).newPage();
  await loginCoach(dashboard);
  await dashboard.getByText('Nächste Termine').waitFor();
  await dashboard.waitForTimeout(1500);
  await save(dashboard, 'dashboard');
} finally {
  await coachBrowser.close();
  await clientBrowser.close();
}

console.log(`Fertig: ${OUT}`);
