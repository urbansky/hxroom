import type { BookingOrigin, BookingStatus } from '@hxroom/shared';

/**
 * Erinnerungsmails an den Klienten: 24 Stunden und 1 Stunde vor dem Termin.
 *
 * Die 1-h-Erinnerung fällt mit der Öffnung des Warteraums zusammen (CALL_OPENS_MINUTES_BEFORE_START).
 * An den Coach geht keine Erinnerung, und die Texte sind fest (doc/phase5-umsetzungsplan.md, Schritt 2).
 */
export type ReminderKind = '24h' | '1h';

export const REMINDER_KINDS: readonly ReminderKind[] = ['24h', '1h'];

interface ReminderWindow {
  /** Ab wann die Erinnerung fällig ist: so viele Minuten vor Beginn. */
  dueMinutesBefore: number;
  /**
   * Bis wann sie noch Sinn hat. Lief die API eine Weile nicht, wird nur nachgeholt, was dem
   * Klienten noch hilft: eine „morgen“-Erinnerung zwei Stunden vor Beginn wäre irreführend.
   */
  latestMinutesBefore: number;
}

export const REMINDER_WINDOWS: Record<ReminderKind, ReminderWindow> = {
  '24h': { dueMinutesBefore: 24 * 60, latestMinutesBefore: 2 * 60 },
  '1h': { dueMinutesBefore: 60, latestMinutesBefore: 5 },
};

export interface ReminderCandidate {
  status: BookingStatus;
  origin: BookingOrigin;
  startTime: Date;
  /** Bestätigungszeitpunkt; bei vom Coach angelegten Terminen leer, dann zählt createdAt. */
  confirmedAt: Date | null;
  createdAt: Date;
  sentAt: Date | null;
}

/**
 * Ist die Erinnerung `kind` für diese Buchung jetzt fällig?
 *
 * - nur bestätigte Termine; Spontan-Termine bekommen ihre Einladung ohnehin sofort
 * - noch nicht versendet
 * - im Fenster zwischen „fällig“ und „hat noch Sinn“
 * - bestätigt, bevor die Erinnerung fällig wurde: Wer 5 Stunden vorher bucht, hat gerade die
 *   Bestätigung mit dem Link bekommen und braucht keine „morgen“-Erinnerung
 *
 * Dieselbe Regel steht als SQL in BookingReminderService.claim – die Funktion hier ist die
 * lesbare und getestete Fassung, das SQL die schnelle.
 */
export function isReminderDue(kind: ReminderKind, booking: ReminderCandidate, now: Date): boolean {
  const { dueMinutesBefore, latestMinutesBefore } = REMINDER_WINDOWS[kind];
  if (booking.status !== 'confirmed' || booking.origin === 'ad_hoc' || booking.sentAt) return false;

  const start = booking.startTime.getTime();
  const dueAt = start - dueMinutesBefore * 60_000;
  const latestAt = start - latestMinutesBefore * 60_000;
  if (now.getTime() < dueAt || now.getTime() > latestAt) return false;

  const confirmed = (booking.confirmedAt ?? booking.createdAt).getTime();
  return confirmed < dueAt;
}
