/**
 * Erzeugt die Screenshots der Startseite (technisches-konzept.md §15) nach
 * apps/landing/public/screens/*.webp. Die Bilder des Handbuchs macht handbuch-screens.mjs.
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
 * das Skript Buchungsseite, Bestätigungsmail, Warteraum, Gespräch und Dashboard auf –
 * zweimal: hell (`name.webp`) und dunkel (`name-dark.webp`), je Durchgang mit frischem Seed,
 * weil der erste das Gespräch beendet. Die Mail ist nur hell gebaut; in der dunklen Aufnahme
 * bleibt die Karte hell, nur die Fläche drumherum wird dunkel wie in einem dunklen Postfach.
 *
 * Der laufende Termin wird auf DISPLAY_TIME verschoben (screens-lib.mjs). Der Coach sendet
 * als Kamera das Foto public/stefan.jpg, der Klient hat die Kamera aus.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  API, COACH_APP, LANDING, NARROW, VIEWPORT,
  chromium, displayStart, fakeMedia, loginCoach, makeCamera, newContext, saveWebp, scaleFor, seedDemo,
} from './screens-lib.mjs';

const OUT = join(LANDING, 'public/screens');
const NOTES = [
  'Vorführung mit Miriam (Business Coach)',
  '– nutzt bisher Calendly und Zoom',
  '– wichtig: Buchungsseite mit eigenem Foto, Erinnerungsmails',
  '– Frage: Kann sie bestehende Klienten übernehmen?',
];
const CHAT_MESSAGE = 'Schön, dass du da bist, Miriam! Ich zeige dir zuerst, wie deine Klienten bei dir buchen.';

mkdirSync(OUT, { recursive: true });

// Der geöffnete Chat legt sich über die rechte Hälfte der Videokachel. Sichtbar bleiben
// etwa die linken zwei Drittel – genau dorthin kommt das Foto.
const camera = makeCamera('coach-camera', 4);

const mailHtml = execFileSync('npx', ['tsx', 'src/db/render-demo-mail.ts'], { cwd: API, encoding: 'utf8' });

async function save(page, name) {
  await saveWebp(page, join(OUT, `${name}.webp`));
  console.log(`  ${name}.webp`);
}

// --- Aufnahmen ---------------------------------------------------------------------

let demo;
for (const scheme of ['light', 'dark']) {
  // Je Durchgang neu, weil der vorige das Gespräch beendet hat.
  demo = seedDemo();
  await captureAll(scheme);
}

console.log(`Fertig: ${OUT}`);

/** Alle Aufnahmen in einem Farbschema; die dunklen bekommen den Zusatz `-dark`. */
async function captureAll(scheme) {
  const suffix = scheme === 'dark' ? '-dark' : '';
  const shot = (page, name) => save(page, `${name}${suffix}`);
  const clientBrowser = await chromium.launch({ channel: 'chrome', args: fakeMedia });
  const coachBrowser = await chromium.launch({ channel: 'chrome', args: [...fakeMedia, `--use-file-for-fake-video-capture=${camera}`] });

  try {
    console.log(`Aufnahmen (${scheme}) …`);

    // 1. Buchungsseite: Angebot mit gewähltem Tag und freien Zeiten
    const visitor = await (await newContext(clientBrowser, demo, scheme, NARROW)).newPage();
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
    await shot(visitor, 'booking-page');

    // 2. Bestätigungsmail. Sie ist nur hell gebaut (color-scheme: light only); dunkel bleibt die
    // Karte hell, und nur die Fläche drumherum samt Schriftzug und Rechtslinks wird dunkel.
    const mail = await (await clientBrowser.newContext({ viewport: NARROW, deviceScaleFactor: scaleFor(NARROW) })).newPage();
    await mail.setContent(mailHtml, { waitUntil: 'load' });
    await mail.addStyleTag({ content: 'body { zoom: 1.08; }' });
    if (scheme === 'dark') {
      await mail.evaluate(() => {
        // Die Seitenfarbe steht auf <body> und noch einmal auf der Tabelle von react-email.
        for (const el of [document.body, ...document.body.querySelectorAll('*')]) {
          if (getComputedStyle(el).backgroundColor === 'rgb(250, 248, 244)') el.style.backgroundColor = '#141814';
        }
        const texts = [...document.querySelectorAll('p')];
        const wordmark = texts.find((p) => p.textContent.trim() === 'HxRoom');
        if (wordmark) wordmark.style.color = '#d4ae78';
        const legal = texts.find((p) => p.textContent.includes('Impressum'));
        legal?.querySelectorAll('*').forEach((el) => { el.style.color = 'rgba(255, 255, 255, 0.45)'; });
        if (legal) legal.style.color = 'rgba(255, 255, 255, 0.45)';
      });
    }
    await mail.waitForTimeout(500);
    await shot(mail, 'confirmation-mail');

    // 3. Warteraum aus Sicht des Klienten. Die Uhr dieser Seite steht kurz nach DISPLAY_TIME:
    // Der Klient wartet aufs Einlassen („Es geht gleich los“). Sonst rechnete der Hinweis mit
    // der echten Zeit. Fürs Gespräch folgt eine eigene Seite mit echter Uhr, damit LiveKit
    // nicht mit falscher Zeit läuft.
    const waitingContext = await newContext(clientBrowser, demo, scheme, NARROW);
    await waitingContext.clock.install({ time: new Date(displayStart().getTime() + 2 * 60 * 1000) });
    const waiting = await waitingContext.newPage();
    await waiting.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
    await waiting.getByText('Kamera und Mikrofon einrichten').waitFor();
    await waiting.waitForTimeout(1500);
    await shot(waiting, 'waiting-room');
    await waitingContext.close();

    const client = await (await newContext(clientBrowser, demo, scheme)).newPage();
    await client.goto(demo.clientCallUrl, { waitUntil: 'domcontentloaded' });
    await client.getByText('Kamera und Mikrofon einrichten').waitFor();

    // 4. Gespräch aus Sicht des Klienten, wie die übrigen Stationen der Tour: der Coach groß,
    // daneben der Chat mit einer Nachricht von ihm. Der Coach schreibt vorher Notizen –
    // sie stehen dann auch im Dashboard am Termin.
    const coach = await (await newContext(coachBrowser, demo, scheme)).newPage();
    await loginCoach(coach, demo);
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
    await shot(client, 'call');

    // 5. Dasselbe Gespräch aus Sicht des Coachs, mit seinen Notizen
    await coach.getByRole('button', { name: 'Notizen öffnen' }).click();
    await editor.waitFor();
    await editor.evaluate((el) => { el.spellcheck = false; el.blur(); });
    await coach.mouse.move(VIEWPORT.width / 2, 40);
    await coach.waitForTimeout(2000);
    await shot(coach, 'call-coach');

    // 6. Dashboard des Coachs
    await coach.getByRole('button', { name: 'Sitzung beenden' }).click().catch(() => {});
    const dashboard = await (await newContext(coachBrowser, demo, scheme)).newPage();
    await loginCoach(dashboard, demo);
    await dashboard.getByText('Nächste Termine').waitFor();
    await dashboard.waitForTimeout(1500);
    await shot(dashboard, 'dashboard');
  } finally {
    await coachBrowser.close();
    await clientBrowser.close();
  }
}
