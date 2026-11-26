/**
 * Erzeugt die Screenshots des Handbuchs (doc/marketing/handbuch.md §8) nach
 * apps/landing/public/screens/handbuch/<abschnitt>/<name>.webp, hell und dunkel (`-dark`).
 *
 * Voraussetzungen und Demodaten wie bei screenshots.mjs (Startseite): lokaler Stack, Chrome,
 * ffmpeg, Playwright über PLAYWRIGHT_PATH.
 *
 * Aufruf aus dem Repo-Wurzelverzeichnis, ohne Szene für alle:
 *   PLAYWRIGHT_PATH=… node apps/landing/scripts/handbuch-screens.mjs [szene …]
 *
 * Aufgenommen wird in Szenen: Abläufe, die Zustand teilen (angemeldeter Coach, wartender
 * Klient), samt aller Bilder unterwegs. Je Farbschema gibt es einen frischen Demo-Seed, weil
 * Szenen den Zustand verändern, etwa ein Gespräch beenden.
 *
 * Neben den Bildern schreibt das Skript app/data/handbuch-screens.json: je Aufnahme Pfade,
 * Größe, Art (ganze Seite oder Ausschnitt), Adresszeile und Markierungen. Die Markierungen
 * sind Punkte links neben Elementen in Prozent des Bildes, ermittelt beim Aufnehmen – sie
 * wandern mit, wenn sich die Oberfläche ändert. `::screenshot{name="…"}` im Markdown liest
 * daraus; Alt-Text und Bildunterschrift stehen im Markdown.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  COACH_APP, LANDING, NARROW, PHONE, SCALE, TMP, VIEWPORT,
  chromium, displayStart, fakeMedia, loginCoach, makeCamera, newContext, saveWebp, seedDemo,
} from './screens-lib.mjs';

// Nicht unter public/handbuch: Dort kollidierten die Ordner mit den Adressen der Seiten
// (/handbuch/videocall wäre ein Verzeichnis und würde umgeleitet).
const OUT = join(LANDING, 'public/screens/handbuch');
const MANIFEST = join(LANDING, 'app/data/handbuch-screens.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

// Ohne Chat daneben steht das Foto mittig im Kamerabild.
const camera = makeCamera('coach-camera-centered', 208);

// Was der Coach im Gespräch notiert und was die Klientin im Chat teilt.
const NOTES = [
  'Zweite Sitzung mit Miriam',
  '– Ziel: klarere Grenzen gegenüber dem Team',
  '– Werte-Übung vom letzten Mal: drei Werte gefunden',
  '– Nächster Schritt: ein Gespräch mit der Teamleitung vorbereiten',
];
const CHAT_MESSAGE = 'Hier noch das Arbeitsblatt von letzter Woche – ich habe es ausgefüllt.';
const CHAT_REPLY = 'Danke dir! Lass uns gleich mit Punkt 2 anfangen.';

// Ein gültiges PDF für den Chat. Der Server prüft Endung und Dateisignatur. Die Kommentarzeilen
// geben ihm die Größe eines echten Arbeitsblatts, im Chat stünde sonst „217 B“.
const sharedPdf = join(TMP, 'Werte-Arbeitsblatt.pdf');
writeFileSync(sharedPdf, [
  '%PDF-1.4',
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj',
  ...Array.from({ length: 2400 }, () => `%${'0'.repeat(78)}`),
  'trailer << /Root 1 0 R >>',
  '%%EOF',
].join('\n'));

const round = (value) => Math.round(value * 10) / 10;
/** Abstand der Markierung vom linken Rand ihres Elements, in CSS-Pixeln der Aufnahme. */
const MARKER_OFFSET = 22;

/**
 * Nimmt ein Bild auf und trägt es ins Manifest ein.
 * - ohne `crop`: das ganze Fenster, gezeigt im Browserrahmen mit `address`
 * - mit `crop` (Locator): nur dieses Element, mit `padding` CSS-Pixeln Rand
 * - `phone`: das Fenster eines Handys (Kontext mit PHONE), gezeigt ohne Browserrahmen
 * - `markers`: Locatoren, nummeriert ab 1 in dieser Reihenfolge
 * Das Manifest kommt aus dem hellen Durchgang; der dunkle hat dieselbe Anordnung.
 */
async function capture(page, scheme, name, { crop, padding = 16, markers = [], address, phone = false } = {}) {
  const viewport = page.viewportSize();
  let area = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  if (crop) {
    await crop.scrollIntoViewIfNeeded();
    const box = await crop.boundingBox();
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    area = {
      x, y,
      width: Math.min(viewport.width, box.x + box.width + padding) - x,
      height: Math.min(viewport.height, box.y + box.height + padding) - y,
    };
  }

  const file = `${name}${scheme === 'dark' ? '-dark' : ''}.webp`;
  await saveWebp(page, join(OUT, file), crop ? { clip: area } : {});
  console.log(`  ${file}`);
  if (scheme !== 'light') return;

  const points = [];
  for (const marker of markers) {
    const box = await marker.boundingBox();
    if (!box) throw new Error(`${name}: Markierung ${points.length + 1} nicht sichtbar`);
    // Links neben dem Element, auf halber Höhe: mittig darauf verdeckte die Nummer den Text.
    points.push({
      x: round(((box.x - MARKER_OFFSET - area.x) / area.width) * 100),
      y: round(((box.y + box.height / 2 - area.y) / area.height) * 100),
    });
  }
  // Größe auf derselben Basis wie die Bilder der Startseite: Bildpunkte geteilt durch SCALE.
  const factor = (await page.evaluate(() => window.devicePixelRatio)) / SCALE;
  manifest[name] = {
    kind: phone ? 'phone' : crop ? 'crop' : 'page',
    src: `/screens/handbuch/${name}.webp`,
    dark: `/screens/handbuch/${name}-dark.webp`,
    width: Math.round(area.width * factor),
    height: Math.round(area.height * factor),
    ...(address ? { address } : {}),
    ...(points.length ? { markers: points } : {}),
  };
}

/** Wartet, bis ein Video der Seite Bilder liefert – sonst steht „Kamera startet …“ im Bild. */
async function waitForCamera(page) {
  await page.waitForFunction(
    () => [...document.querySelectorAll('video')].some((video) => video.videoWidth > 0),
    null, { timeout: 20000 },
  );
}

// --- Szenen ------------------------------------------------------------------------

const scenes = {
  /** Dashboard, Einrichtungs-Checkliste und Probe-Sitzung. Legt eine Probe-Sitzung an. */
  async 'erste-schritte'({ scheme, demo, coachBrowser }) {
    const coach = await (await newContext(coachBrowser, demo, scheme)).newPage();
    await loginCoach(coach, demo);
    await coach.getByText('Nächste Termine').waitFor();
    await coach.waitForTimeout(1500);
    await capture(coach, scheme, 'erste-schritte/dashboard', { address: 'app.hxroom.de' });

    // Der Demo-Seed hakt die Checkliste ab, damit das Dashboard wie im Alltag aussieht. Für
    // dieses Bild fehlt in der Antwort nur die Probe-Sitzung – so steht die Liste offen da,
    // mit dem Schritt, der gleich folgt.
    await coach.route('**/api/v1/booking-page', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const json = await response.json();
      return route.fulfill({ response, json: { ...json, testSessionAt: null } });
    });
    await coach.reload({ waitUntil: 'domcontentloaded' });
    await coach.getByRole('heading', { name: 'Einrichtung abschließen' }).waitFor();
    await coach.waitForTimeout(1000);
    const checklist = coach.locator('section').filter({ has: coach.getByRole('heading', { name: 'Einrichtung abschließen' }) });
    await capture(coach, scheme, 'erste-schritte/checkliste', { crop: checklist });

    await coach.getByRole('button', { name: 'Probe-Sitzung machen', exact: true }).click();
    await coach.getByRole('button', { name: 'Probe-Sitzung starten' }).click();
    // „Zum Gespräch“ ist ein Link (UButton mit `to`).
    await coach.getByRole('link', { name: 'Zum Gespräch' }).waitFor({ timeout: 20000 });
    // Im Feld stünde die lokale Adresse; fürs Bild die Form, die Coachs sehen.
    await coach.getByRole('dialog').locator('input[readonly]').evaluate((input) => {
      input.value = input.value.replace(/^http:\/\/([a-z0-9-]+)\.hxroom\.localhost/, 'https://$1.hxroom.de');
    });
    await coach.waitForTimeout(800);
    await capture(coach, scheme, 'erste-schritte/probe-sitzung', { crop: coach.getByRole('dialog'), padding: 0 });
    await coach.context().close();
  },

  /** Buchung und Warteraum auf dem Handy. Die Buchung wird abgefangen: kein Termin, keine Mail. */
  async 'fuer-klienten'({ scheme, demo, clientBrowser }) {
    const visitor = await (await newContext(clientBrowser, demo, scheme, PHONE.viewport, PHONE)).newPage();
    await visitor.route('**/offers/*/bookings', (route) => (route.request().method() === 'POST'
      ? route.fulfill({ status: 201, json: {} })
      : route.continue()));
    await visitor.goto(`${demo.bookingPageUrl}/offers/${demo.offerId}`, { waitUntil: 'domcontentloaded' });
    await visitor.getByText('Freie Termine', { exact: true }).waitFor();
    await visitor.waitForTimeout(1000);
    const firstDay = visitor.locator('button:not([disabled])').filter({ hasText: /^\s*\d{1,2}\s*$/ }).first();
    await firstDay.click();
    await visitor.getByRole('button', { name: /Auswählen/ }).first().waitFor();
    await visitor.waitForTimeout(800);
    // Kalender und Uhrzeiten zusammen: „Freie Termine“ knapp unter die feste Kopfzeile.
    await visitor.getByText('Freie Termine', { exact: true }).evaluate((el) => {
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 16);
    });
    await visitor.waitForTimeout(600);
    await capture(visitor, scheme, 'fuer-klienten/buchung', { phone: true });

    await visitor.getByRole('button', { name: /Auswählen/ }).first().click();
    await visitor.getByPlaceholder('Vor- und Nachname').fill('Lena Berger');
    await visitor.getByPlaceholder('name@beispiel.de').fill('lena.berger@example.com');
    await visitor.getByRole('button', { name: 'Termin anfragen' }).click();
    await visitor.getByText('Termin vorgemerkt').waitFor();
    // Die Meldung steht unter der Beschreibung des Angebots: knapp unter die Kopfzeile damit.
    await visitor.getByText('Termin vorgemerkt').evaluate((el) => {
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 120);
    });
    await visitor.waitForTimeout(800);
    await capture(visitor, scheme, 'fuer-klienten/buchung-vorgemerkt', { phone: true });
    await visitor.context().close();

    // Warteraum auf dem Handy, Uhr kurz nach Beginn wie bei videocall
    const waitingContext = await newContext(clientBrowser, demo, scheme, PHONE.viewport, PHONE);
    await waitingContext.clock.install({ time: new Date(displayStart().getTime() + 2 * 60 * 1000) });
    const waiting = await waitingContext.newPage();
    await waiting.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
    await waiting.getByText('Kamera und Mikrofon einrichten').waitFor();
    await waiting.waitForTimeout(1500);
    await capture(waiting, scheme, 'fuer-klienten/warteraum-handy', { phone: true });
    await waitingContext.close();
  },

  /** Datenexport und Kontolöschung in den Account-Einstellungen. */
  async datenschutz({ scheme, demo, coachBrowser }) {
    const coach = await (await newContext(coachBrowser, demo, scheme)).newPage();
    await loginCoach(coach, demo);
    await coach.goto(`${COACH_APP}/settings/account`, { waitUntil: 'domcontentloaded' });
    await coach.locator('#export').waitFor();
    await coach.waitForTimeout(1000);
    await capture(coach, scheme, 'datenschutz/daten-exportieren', { crop: coach.locator('#export') });
    const deletion = coach.locator('section').filter({ has: coach.getByRole('heading', { name: 'Konto löschen', exact: true }) });
    await capture(coach, scheme, 'datenschutz/konto-loeschen', { crop: deletion });
    await coach.context().close();
  },

  /**
   * Warteraum beider Seiten, Geräte einrichten, Einlass, Gespräch mit Notizen und Chat,
   * Abschlusskarte. Beendet das Gespräch, deshalb zuletzt.
   */
  async videocall({ scheme, demo, clientBrowser, coachBrowser }) {
    // Warteraum des Klienten. Die Uhr steht kurz nach Beginn („Es geht gleich los“), wie auf
    // der Startseite; LiveKit braucht dagegen die echte Uhr, deshalb gleich eine zweite Seite.
    const waitingContext = await newContext(clientBrowser, demo, scheme, NARROW);
    await waitingContext.clock.install({ time: new Date(displayStart().getTime() + 2 * 60 * 1000) });
    const waiting = await waitingContext.newPage();
    await waiting.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
    await waiting.getByText('Kamera und Mikrofon einrichten').waitFor();
    await waiting.waitForTimeout(1500);
    await capture(waiting, scheme, 'videocall/warteraum-klient', { address: 'demo.hxroom.de/call/…' });
    await waitingContext.close();

    const client = await (await newContext(clientBrowser, demo, scheme)).newPage();
    await client.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
    await client.getByText('Kamera und Mikrofon einrichten').waitFor();

    // Warteraum des Coachs: Klient ist da, Kamera eingerichtet, Einlass-Knopf
    const coach = await (await newContext(coachBrowser, demo, scheme)).newPage();
    await loginCoach(coach, demo);
    await coach.goto(`${COACH_APP}/call/${demo.liveBookingId}`, { waitUntil: 'domcontentloaded' });
    const status = coach.getByText(/Ist eingetroffen|Wartet seit/);
    await status.waitFor({ timeout: 20000 });
    await coach.getByText('Kamera und Mikrofon einrichten').click();
    await coach.getByRole('button', { name: 'Einrichtung beenden' }).waitFor();
    await waitForCamera(coach);
    // Mit Vorschau ist die Seite höher als 900 Pixel; der Einlass-Knopf soll mit aufs Bild.
    await coach.setViewportSize({ width: VIEWPORT.width, height: 1040 });
    await coach.waitForTimeout(1500);
    const admit = coach.getByRole('button', { name: 'Klient einlassen' });
    await capture(coach, scheme, 'videocall/warteraum-coach', {
      address: 'app.hxroom.de/call/…',
      markers: [status, admit],
    });

    // Ausschnitt: Kamera und Mikrofon einrichten (in beiden Warteräumen gleich)
    const setup = coach.locator('div', { has: coach.getByRole('button', { name: 'Einrichtung beenden' }) }).last();
    await capture(coach, scheme, 'videocall/geraete-einrichten', { crop: setup });

    // Gespräch aus Sicht des Coachs, der Klient mit ausgeschalteter Kamera
    await admit.click();
    await coach.setViewportSize(VIEWPORT);
    await client.getByRole('button', { name: 'Kamera ausschalten' }).waitFor({ timeout: 20000 });
    await client.getByRole('button', { name: 'Kamera ausschalten' }).click();
    await coach.getByText('Kamera aus').first().waitFor({ timeout: 20000 });
    await waitForCamera(coach);
    await coach.mouse.move(VIEWPORT.width / 2, 40);
    await coach.waitForTimeout(2500);
    await capture(coach, scheme, 'videocall/gespraech-coach', { address: 'app.hxroom.de/call/…' });

    // Notizen
    await coach.getByRole('button', { name: 'Notizen öffnen' }).click();
    const editor = coach.locator('[contenteditable="true"]').first();
    await editor.waitFor();
    await editor.evaluate((el) => { el.spellcheck = false; });
    await editor.click();
    for (const [i, line] of NOTES.entries()) {
      await coach.keyboard.type(line);
      if (i < NOTES.length - 1) await coach.keyboard.press('Enter');
    }
    await editor.evaluate((el) => el.blur());
    await coach.getByText('Gespeichert').first().waitFor({ timeout: 10000 });
    await coach.mouse.move(VIEWPORT.width / 2, 40);
    await coach.waitForTimeout(1500);
    await capture(coach, scheme, 'videocall/notizen', { address: 'app.hxroom.de/call/…' });

    // Chat: die Klientin teilt ein PDF, der Coach antwortet
    await client.getByRole('button', { name: 'Chat öffnen' }).click();
    // Die Datei geht sofort beim Auswählen hinaus. Scheitert das, steht der Grund in der Antwort.
    const [upload] = await Promise.all([
      client.waitForResponse((response) => response.url().includes('/messages/files')),
      client.locator('input[type=file]').setInputFiles(sharedPdf),
    ]);
    if (!upload.ok()) throw new Error(`Upload der Datei: ${upload.status()} ${await upload.text()}`);
    await client.getByPlaceholder('Nachricht oder Link …').fill(CHAT_MESSAGE);
    await client.getByRole('button', { name: 'Nachricht senden' }).click();
    await coach.getByRole('button', { name: 'Chat öffnen' }).click();
    await coach.getByText('Werte-Arbeitsblatt.pdf').first().waitFor({ timeout: 20000 });
    await coach.getByPlaceholder('Nachricht oder Link …').fill(CHAT_REPLY);
    await coach.getByRole('button', { name: 'Nachricht senden' }).click();
    await coach.getByText(CHAT_REPLY).waitFor();
    await coach.mouse.move(VIEWPORT.width / 2, 40);
    await coach.waitForTimeout(1500);
    await capture(coach, scheme, 'videocall/chat', { address: 'app.hxroom.de/call/…' });

    // Beenden und Abschlusskarte
    await coach.getByRole('button', { name: 'Sitzung beenden' }).first().click();
    await coach.getByRole('dialog').getByRole('button', { name: 'Sitzung beenden' }).click();
    await coach.getByText('Sitzung abgeschlossen').waitFor({ timeout: 20000 });
    await coach.waitForTimeout(1500);
    const summary = coach.locator('div').filter({ hasText: 'Sitzung abgeschlossen' }).filter({ has: coach.getByRole('link', { name: 'Zum Dashboard' }) }).last();
    await capture(coach, scheme, 'videocall/abschlusskarte', { crop: summary });
  },
};

// --- Ablauf ------------------------------------------------------------------------

const wanted = process.argv.slice(2);
const unknown = wanted.filter((name) => !(name in scenes));
if (unknown.length) {
  console.error(`Unbekannte Szene: ${unknown.join(', ')}. Vorhanden: ${Object.keys(scenes).join(', ')}`);
  process.exit(1);
}
const selected = Object.entries(scenes).filter(([name]) => !wanted.length || wanted.includes(name));

for (const scheme of ['light', 'dark']) {
  const demo = seedDemo();
  const clientBrowser = await chromium.launch({ channel: 'chrome', args: fakeMedia });
  const coachBrowser = await chromium.launch({ channel: 'chrome', args: [...fakeMedia, `--use-file-for-fake-video-capture=${camera}`] });
  try {
    for (const [name, scene] of selected) {
      console.log(`Szene ${name} (${scheme}) …`);
      await scene({ scheme, demo, clientBrowser, coachBrowser });
    }
  } finally {
    await coachBrowser.close();
    await clientBrowser.close();
  }
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Fertig: ${OUT}, Manifest ${MANIFEST}`);
