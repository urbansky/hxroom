import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'dns';
import { request as httpRequest, type IncomingMessage } from 'http';
import { request as httpsRequest } from 'https';
import { BlockList, isIP } from 'net';
import { createBrotliDecompress, createGunzip, createInflate } from 'zlib';
import type { Readable } from 'stream';
import type { CalendarImportError } from '@hxroom/shared';

// Abruf einer vom Coach eingegebenen iCal-Adresse (doc/produkt/funktionen/kalenderabgleich.md §7).
// Die Adresse ist fremde Eingabe, die der Server abruft – ohne Schutz ließe sich darüber das
// interne Netz abfragen (SSRF). Deshalb: nur https, keine privaten Ziele (geprüft nach der
// DNS-Auflösung, auch bei jeder Weiterleitung), begrenzte Weiterleitungen, Zeit und Größe.
// Bewusst mit node:https statt fetch: nur so lässt sich die Auflösung selbst prüfen, ohne
// eine Abhängigkeit, die im Docker-Image fehlen könnte.

export class CalendarFetchError extends Error {
  constructor(readonly code: CalendarImportError) {
    super(`Calendar fetch failed: ${code}`);
  }
}

export interface FetchIcalOptions {
  /** Nur Entwicklung (CALENDAR_IMPORT_ALLOW_PRIVATE): erlaubt http und private Ziele. */
  allowPrivate?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

// Kein bedingter Abruf (ETag/If-Modified-Since): Auch eine unveränderte Datei muss neu
// gelesen werden, weil das Zeitfenster der belegten Zeiten täglich weiterwandert.

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const USER_AGENT = 'HxRoom-Kalenderabgleich/1.0 (+https://hxroom.de)';

// Ziele, die von außen nie ein Kalender sein können: privat, Loopback, Link-Local
// (inkl. Cloud-Metadaten 169.254.169.254), CGNAT, Multicast, reserviert.
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) BLOCKED.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32],
] as const) BLOCKED.addSubnet(net, prefix, 'ipv6');

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, 'ipv4');
  if (family === 6) {
    // IPv4 in IPv6 (::ffff:10.0.0.1) wie die IPv4-Adresse behandeln
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return BLOCKED.check(mapped[1], 'ipv4');
    return BLOCKED.check(address, 'ipv6');
  }
  return true;
}

/** webcal:// → https://; alles andere außer https gilt als ungültig (in der Entwicklung auch http). */
export function normalizeCalendarUrl(input: string, allowPrivate = false): URL {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/^webcal:/i, 'https:'));
  } catch {
    throw new CalendarFetchError('invalid_url');
  }
  const allowed = allowPrivate ? ['https:', 'http:'] : ['https:'];
  if (!allowed.includes(url.protocol) || url.username || url.password) throw new CalendarFetchError('invalid_url');
  return url;
}

function guardedLookup(allowPrivate: boolean) {
  return (hostname: string, options: LookupOptions, callback: (...args: any[]) => void) => {
    dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
      if (err) return callback(err);
      if (!allowPrivate && addresses.some((a) => isBlockedAddress(a.address))) {
        return callback(Object.assign(new Error('blocked address'), { code: 'HXROOM_BLOCKED_ADDRESS' }));
      }
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

function decode(response: IncomingMessage): Readable {
  switch ((response.headers['content-encoding'] ?? '').toLowerCase()) {
    case 'gzip': return response.pipe(createGunzip());
    case 'deflate': return response.pipe(createInflate());
    case 'br': return response.pipe(createBrotliDecompress());
    default: return response;
  }
}

function mapStatus(status: number): CalendarImportError {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 404 || status === 410) return 'not_found';
  return 'http_error';
}

function requestOnce(url: URL, options: Required<Pick<FetchIcalOptions, 'allowPrivate' | 'maxBytes'>> & FetchIcalOptions, deadline: number) {
  return new Promise<{ redirect: string } | { body: string }>((resolve, reject) => {
    if (isIP(url.hostname.replace(/^\[|\]$/g, '')) && !options.allowPrivate && isBlockedAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
      return reject(new CalendarFetchError('blocked_address'));
    }

    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'text/calendar, */*;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    const request = (url.protocol === 'http:' ? httpRequest : httpsRequest)(url, {
      method: 'GET',
      headers,
      lookup: guardedLookup(options.allowPrivate) as any,
    });

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      request.destroy();
      return reject(new CalendarFetchError('timeout'));
    }
    const timer = setTimeout(() => request.destroy(new CalendarFetchError('timeout')), remaining);
    const done = <T>(fn: (value: T) => void) => (value: T) => { clearTimeout(timer); fn(value); };
    const fail = done(reject);
    const succeed = done(resolve);

    request.on('error', (err: NodeJS.ErrnoException) => {
      if (err instanceof CalendarFetchError) return fail(err);
      if (err.code === 'HXROOM_BLOCKED_ADDRESS') return fail(new CalendarFetchError('blocked_address'));
      fail(new CalendarFetchError('unreachable'));
    });

    request.on('response', (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        return succeed({ redirect: new URL(response.headers.location, url).toString() });
      }
      if (status < 200 || status >= 300) {
        response.resume();
        return fail(new CalendarFetchError(mapStatus(status)));
      }
      if (Number(response.headers['content-length'] ?? 0) > options.maxBytes) {
        response.destroy();
        return fail(new CalendarFetchError('too_large'));
      }

      const chunks: Buffer[] = [];
      let size = 0;
      const body = decode(response);
      body.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxBytes) {
          request.destroy();
          body.destroy();
          fail(new CalendarFetchError('too_large'));
          return;
        }
        chunks.push(chunk);
      });
      body.on('error', () => fail(new CalendarFetchError('unreachable')));
      body.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 4096))) return fail(new CalendarFetchError('not_ical'));
        succeed({ body: text });
      });
    });

    request.end();
  });
}

/** Ruft die Kalenderdatei ab und liefert ihren Text; jeder Fehler ist ein CalendarFetchError. */
export async function fetchIcal(input: string, options: FetchIcalOptions = {}): Promise<string> {
  const allowPrivate = options.allowPrivate ?? false;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let url = normalizeCalendarUrl(input, allowPrivate);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const result = await requestOnce(url, { ...options, allowPrivate, maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES }, deadline);
    if (!('redirect' in result)) return result.body;
    // Jede Weiterleitung durchläuft dieselbe Prüfung – auch auf ein privates Ziel.
    url = normalizeCalendarUrl(result.redirect, allowPrivate);
  }
  throw new CalendarFetchError('too_many_redirects');
}
