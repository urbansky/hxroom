import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CalendarFetchError, fetchIcal, isBlockedAddress, normalizeCalendarUrl } from './fetch-ical';

const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (err) {
    return err instanceof CalendarFetchError ? err.code : `unexpected: ${String(err)}`;
  }
}

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1',
  ])('sperrt %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['142.250.185.78', '2a00:1450:4001:82f::200e', '::ffff:142.250.185.78'])('lässt %s zu', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('normalizeCalendarUrl', () => {
  it('macht aus webcal:// eine https-Adresse', () => {
    expect(normalizeCalendarUrl('webcal://p12-caldav.icloud.com/published/2/abc').toString())
      .toBe('https://p12-caldav.icloud.com/published/2/abc');
  });

  it.each(['http://example.com/cal.ics', 'ftp://example.com/x', 'https://user:pw@example.com/x', 'kein url'])('lehnt %s ab', (url) => {
    expect(() => normalizeCalendarUrl(url)).toThrow(CalendarFetchError);
  });
});

describe('fetchIcal ohne Freigabe privater Ziele', () => {
  it('lehnt IP-Literale und Namen ab, die auf private Adressen zeigen', async () => {
    expect(await errorCode(fetchIcal('https://127.0.0.1/cal.ics'))).toBe('blocked_address');
    expect(await errorCode(fetchIcal('https://[::1]/cal.ics'))).toBe('blocked_address');
    expect(await errorCode(fetchIcal('https://localhost/cal.ics'))).toBe('blocked_address');
  });
});

describe('fetchIcal gegen einen lokalen Server', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      switch (req.url) {
        case '/ok.ics':
          res.writeHead(200, { 'Content-Type': 'text/calendar' }).end(ICS);
          return;
        case '/redirect':
          res.writeHead(302, { Location: '/ok.ics' }).end();
          return;
        case '/loop':
          res.writeHead(302, { Location: '/loop' }).end();
          return;
        case '/html':
          res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html>Anmelden</html>');
          return;
        case '/big':
          res.writeHead(200).end(`${ICS}${'X'.repeat(5000)}`);
          return;
        case '/slow':
          setTimeout(() => res.writeHead(200).end(ICS), 2000);
          return;
        case '/forbidden':
          res.writeHead(403).end();
          return;
        default:
          res.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const dev = { allowPrivate: true };

  it('liefert den Inhalt der Kalenderdatei', async () => {
    expect(await fetchIcal(`${base}/ok.ics`, dev)).toBe(ICS);
  });

  it('folgt Weiterleitungen, aber nicht endlos', async () => {
    expect(await fetchIcal(`${base}/redirect`, dev)).toBe(ICS);
    expect(await errorCode(fetchIcal(`${base}/loop`, dev))).toBe('too_many_redirects');
  });

  it('übersetzt Fehler in Codes', async () => {
    expect(await errorCode(fetchIcal(`${base}/html`, dev))).toBe('not_ical');
    expect(await errorCode(fetchIcal(`${base}/big`, { ...dev, maxBytes: 1000 }))).toBe('too_large');
    expect(await errorCode(fetchIcal(`${base}/slow`, { ...dev, timeoutMs: 300 }))).toBe('timeout');
    expect(await errorCode(fetchIcal(`${base}/forbidden`, dev))).toBe('forbidden');
    expect(await errorCode(fetchIcal(`${base}/missing`, dev))).toBe('not_found');
  });

  it('lässt ohne Entwicklungsschalter weder http noch das lokale Ziel zu', async () => {
    expect(await errorCode(fetchIcal(`${base}/ok.ics`))).toBe('invalid_url');
  });
});
