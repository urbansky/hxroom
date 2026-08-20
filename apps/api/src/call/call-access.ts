import { callWindowClosesAt, callWindowOpensAt } from '@hxroom/shared';
import type { BookingStatus, CallState } from '@hxroom/shared';

// Das Zugangsfenster selbst liegt in @hxroom/shared: Der Server entscheidet über den
// Zugang, das Backoffice des Coachs blendet danach den "Sitzung starten"-Knopf ein (A5).
// Beide müssen dieselbe Grenze kennen.

// Die Felder der Buchung, aus denen sich der Zustand ergibt – bewusst als eigenes
// Interface statt als Drizzle-Row, damit diese Datei frei von ORM-Importen bleibt und
// jeder Grenzfall ohne Datenbank testbar ist (wie booking.constants.ts).
export interface CallBookingState {
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  clientTokenUsedAt: Date | null;
  admittedAt: Date | null;
  callEndedAt: Date | null;
}

/**
 * Die eine fachliche Entscheidung des Call-Zugangs: In welcher Lage ist diese Sitzung?
 * Service und Controller führen sie nur noch aus.
 *
 * Die Reihenfolge der Prüfungen ist die Aussage: Endgültiges (abgesagt, beendet) schlägt
 * Zeitliches, Zeitliches schlägt den Fortschritt im Warteraum. Insbesondere endet der
 * Zugang auch für einen bereits eingelassenen Klienten mit dem Fenster – sonst bliebe ein
 * alter Mail-Link dauerhaft ein Türöffner, und genau das ist die Lücke, die §7 schließen
 * wollte.
 */
export function resolveCallState(booking: CallBookingState, now: Date): CallState {
  if (booking.status === 'cancelled') return 'cancelled';

  // 'completed' ohne callEndedAt gibt es für Sitzungen, die vor A1 abgeschlossen wurden.
  if (booking.callEndedAt || booking.status === 'completed') return 'ended';

  // Nur eine bestätigte Buchung führt in den Warteraum: 'pending' kollidiert mit der
  // 30-Minuten-Bestätigungsfrist (booking.constants.ts) – wer nicht bestätigt hat, dessen
  // Termin verfällt ohnehin.
  if (booking.status !== 'confirmed') return 'expired';

  if (now < callWindowOpensAt(booking.startTime)) return 'too_early';
  if (now > callWindowClosesAt(booking.endTime)) return 'expired';

  if (booking.admittedAt) return 'admitted';
  if (booking.clientTokenUsedAt) return 'waiting';

  return 'open';
}

// Einlassen setzt nicht voraus, dass der Klient bereits wartet: zwischen dem Klick des
// Coachs und dem Eintreffen des Klienten läge sonst ein Rennen. Ob der Knopf überhaupt
// angeboten wird, entscheidet die Oberfläche.
export function canAdmit(state: CallState): boolean {
  return state === 'open' || state === 'waiting';
}

// Beenden ist die Klammer um eine tatsächlich begonnene Sitzung. Der No-Show – Coach
// schließt ab, ohne je eingelassen zu haben – bekommt in B6 einen eigenen Weg, weil er
// nicht als gehaltene Sitzung zählen darf (HELD_SESSION_STATUSES).
export function canEnd(state: CallState): boolean {
  return state === 'admitted';
}
