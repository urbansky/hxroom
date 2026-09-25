import { bookingIdFromRoomName, roleFromIdentity } from './livekit-token';

/**
 * Wie lange der Coach weg sein darf, bevor die Sitzung von selbst endet (B6).
 *
 * Genug für einen Reload, einen Browser-Absturz oder einen WLAN-Wechsel; kurz genug, dass
 * ein Klient nicht lange allein im Raum sitzt, nachdem der Coach den Tab geschlossen hat.
 */
export const COACH_GRACE_MINUTES = 2;

/**
 * Was ein Webhook für die Sitzung bedeutet.
 *
 * - `coach-left`: Der Coach hat den Raum verlassen – die Nachfrist beginnt.
 * - `coach-joined`: Er ist (wieder) da – eine laufende Nachfrist ist hinfällig.
 * - `room-finished`: LiveKit hat den leeren Raum geschlossen. Rückfallebene, falls das
 *   Verlassen des Coachs nicht ankam; beendet wird trotzdem erst nach der Nachfrist, sonst
 *   endete eine Sitzung nach 20 Sekunden, nur weil beide gleichzeitig das Netz verloren.
 *
 * Dass der Klient geht, bedeutet nichts: Er kann über seinen Link zurück, und das Ende ist
 * Sache des Coachs.
 */
export type PresenceChange = {
  bookingId: string;
  change: 'coach-left' | 'coach-joined' | 'room-finished';
};

/** Das Nötige aus einem LiveKit-Webhook – als eigene Form, damit es ohne SDK testbar ist. */
export interface WebhookLike {
  event: string;
  room?: { name?: string };
  participant?: { identity?: string };
}

export function presenceChange(event: WebhookLike): PresenceChange | null {
  const bookingId = bookingIdFromRoomName(event.room?.name);
  if (!bookingId) return null;

  const isCoach = roleFromIdentity(event.participant?.identity) === 'coach';

  switch (event.event) {
    case 'participant_joined':
      return isCoach ? { bookingId, change: 'coach-joined' } : null;
    case 'participant_left':
      return isCoach ? { bookingId, change: 'coach-left' } : null;
    case 'room_finished':
      return { bookingId, change: 'room-finished' };
    default:
      return null;
  }
}
