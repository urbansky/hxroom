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

/** "14:00" – Uhrzeit in Europe/Berlin. */
export function formatTimeLabel(date: Date): string {
  return timeFormatter.format(date);
}

// Kalendertag in Europe/Berlin als JJJJ-MM-TT; en-CA liefert genau dieses Format.
const berlinDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * "heute", "morgen" oder "am Montag, 3. August" – je nach Kalendertag in Europe/Berlin, nicht
 * nach Stunden: Eine Erinnerung um 23:30 für einen Termin um 08:00 heißt „morgen“, obwohl
 * keine 24 Stunden dazwischen liegen.
 */
export function relativeDayLabel(start: Date, now: Date): string {
  const days = Math.round(
    (Date.parse(berlinDayFormatter.format(start)) - Date.parse(berlinDayFormatter.format(now))) / 86_400_000,
  );
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  return `am ${dayDateFormatter.format(start)}`;
}
