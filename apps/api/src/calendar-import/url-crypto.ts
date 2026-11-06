import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Die iCal-Adresse eines Coach-Kalenders ist ein Zugangsdatum: Wer sie kennt, liest den
// Kalender. Gespeichert wird sie deshalb mit AES-256-GCM verschlüsselt, der Schlüssel liegt
// nur in der Umgebung (CALENDAR_URL_KEY, 32 Byte als Base64), nie in der Datenbank.
// Format: "v1:" + Base64(IV ‖ Auth-Tag ‖ Chiffrat). Das Präfix erlaubt später einen
// Schlüsselwechsel, ohne Altbestand raten zu müssen.

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function parseUrlKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) {
    throw new Error('CALENDAR_URL_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
  }
  return key;
}

export function encryptUrl(url: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')}`;
}

export function decryptUrl(payload: string, key: Buffer): string {
  const [version, data] = payload.split(':', 2);
  if (version !== VERSION || !data) throw new Error('Unknown calendar URL encryption format');
  const raw = Buffer.from(data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
}

/**
 * Gekürzte Anzeige ohne den geheimen Teil: Host und letzter Pfadabschnitt,
 * z. B. "calendar.google.com/…/basic.ics". Der geheime Token steckt bei Google und Outlook
 * in den mittleren Pfadabschnitten, bei iCloud aber im letzten – der letzte Abschnitt
 * erscheint deshalb nur, wenn er wie ein Dateiname aussieht ("basic.ics", "calendar.ics").
 */
export function urlHint(url: string): string {
  try {
    const parsed = new URL(url.replace(/^webcal:/i, 'https:'));
    const last = parsed.pathname.split('/').filter(Boolean).at(-1);
    const looksLikeFileName = !!last && /^[\w-]{1,24}\.ics$/i.test(last);
    return looksLikeFileName ? `${parsed.host}/…/${last}` : `${parsed.host}/…`;
  } catch {
    return '…';
  }
}
