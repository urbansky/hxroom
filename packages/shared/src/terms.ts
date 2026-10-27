import { z } from 'zod';

// AGB und AVV zwischen HxRoom und den Coachs (doc/phase5-umsetzungsplan.md, Schritt 5a).
// Geteilt zwischen API (Zustimmung speichern) und Coach-App (Registrierung, Modal,
// Einstellungen → Rechtliches).

/**
 * Fassung von hxroom.de/agb und hxroom.de/avv – das Stand-Datum beider Seiten. Ein neuer
 * Text bekommt ein neues Datum, hier wie dort. Spätere Änderungen laufen nach AGB §11 per
 * Mail mit Widerspruchsfrist; erneut zustimmen muss deshalb nur, wer noch gar keine Fassung
 * angenommen hat.
 */
export const TERMS_VERSION = '2026-10-27';

export const termsStatusSchema = z.object({
  currentVersion:  z.string(),
  acceptedVersion: z.string().nullable(),
  acceptedAt:      z.string().nullable(),   // ISO 8601
  // In einer vom Betreiber übernommenen Sitzung stimmt niemand für den Coach zu.
  impersonated:    z.boolean(),
});
export type TermsStatus = z.infer<typeof termsStatusSchema>;

export const acceptTermsSchema = z.object({
  // Die Fassung, die der Coach gesehen hat. Eine ältere lehnt die API ab.
  version: z.literal(TERMS_VERSION),
});
export type AcceptTermsDto = z.infer<typeof acceptTermsSchema>;

/** "2026-10-27" → "27. Oktober 2026" */
export function formatTermsVersion(version: string): string {
  return new Date(`${version}T12:00:00Z`).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  });
}
