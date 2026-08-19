// Deutsche Datums-/Zeitlabels für Mailtexte und Betreffzeilen. Feste Zeitzone
// Europe/Berlin: die Timestamps in der DB sind absolute Zeitpunkte, der Empfänger
// erwartet aber die lokale Uhrzeit des Coachs.

import type { AppointmentInfo } from '../mail/templates/_components/appointment';

const dayDateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

interface BookingTimes {
  startTime: Date;
  endTime: Date;
}

interface BookingAppointment extends BookingTimes {
  offerId: string | null;
  offerName: string;
  durationMinutes: number;
}

/**
 * Termindaten für den Termin-Block der Mails (AppointmentBlock). Tag und Zeitspanne sind
 * bewusst getrennt, weil der Block sie – wie die Agenda im Coach-Dashboard – in zwei
 * Zeilen zeigt. Das Trennzeichen der Zeitspanne ist derselbe Halbgeviertstrich mit
 * normalen Leerzeichen wie in formatTimeRange() der Coach-App.
 */
export function toAppointmentInfo(booking: BookingAppointment): AppointmentInfo {
  return {
    dayLabel:        dayDateFormatter.format(booking.startTime),
    timeRangeLabel:  `${timeFormatter.format(booking.startTime)} – ${timeFormatter.format(booking.endTime)}`,
    offerId:         booking.offerId,
    offerName:       booking.offerName,
    durationMinutes: booking.durationMinutes,
  };
}

/** "Montag, 3. August" – Kurzform für Betreffzeilen, die schon den Klientennamen tragen. */
export function formatDayLabel(booking: BookingTimes): string {
  return dayDateFormatter.format(booking.startTime);
}
