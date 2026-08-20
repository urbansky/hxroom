import { timingSafeEqual } from 'crypto';

/**
 * Konstantzeit-Vergleich für den clientAccessToken.
 *
 * Er ist der einzige Zugangsschutz des Klienten – für Bestätigung, Absage und ab A1 auch
 * für den Warteraum (doc/videocall-umsetzungsplan.md). Ein früh abbrechender Vergleich
 * wäre hier angreifbar. timingSafeEqual verlangt gleiche Länge, deshalb der vorgeschaltete
 * Längenvergleich.
 *
 * Liegt in common/, weil ihn inzwischen zwei Module brauchen (BookingsService und
 * CallService) – dupliziert liefe er Gefahr, an einer Stelle nachlässig zu werden.
 */
export function tokenMatches(provided: string, stored: string): boolean {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const storedBuffer = Buffer.from(stored, 'utf8');
  return providedBuffer.length === storedBuffer.length && timingSafeEqual(providedBuffer, storedBuffer);
}
