import type { BookingStatus } from '@hxroom/shared';
import type { BookingIcsInput } from './ics';

// Ein Termin, wie er im Kalender des Coachs erscheint (doc/produkt/funktionen/kalenderabgleich.md §4):
// im Feed, als Anhang der Mail „Neue Buchung“ und als Download auf der Terminseite – überall
// gleich, damit dieselbe UID denselben Eintrag meint.
//
// Bewusst ohne ORGANIZER und ATTENDEE: Mit Teilnehmern behandeln Outlook und Apple den Eintrag
// als Besprechung und bieten an, dem Klienten Updates zu schicken. Ohne Kontaktdaten und ohne
// Nachricht des Klienten – sie gehören in HxRoom, nicht in einen fremden Kalender. Der Link führt
// auf die Terminseite, von dort startet der Coach die Sitzung.

export interface CoachCalendarBooking {
  id: string;
  offerName: string;
  clientName: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
}

export interface CoachCalendarOptions {
  /** „Ohne Klientennamen“: Titel nur mit dem Angebot. */
  hideClientNames: boolean;
  /** Basis der Coach-App, z. B. https://app.hxroom.de */
  coachAppUrl: string;
}

export function coachEventTitle(booking: CoachCalendarBooking, hideClientNames: boolean): string {
  const title = hideClientNames ? booking.offerName : `${booking.offerName} · ${booking.clientName}`;
  return booking.status === 'pending' ? `${title} (unbestätigt)` : title;
}

export function coachBookingUrl(bookingId: string, coachAppUrl: string): string {
  return `${coachAppUrl.replace(/\/$/, '')}/bookings/${bookingId}`;
}

export function coachIcsInput(booking: CoachCalendarBooking, options: CoachCalendarOptions): BookingIcsInput {
  const url = coachBookingUrl(booking.id, options.coachAppUrl);
  return {
    uid: booking.id,
    start: booking.startTime,
    end: booking.endTime,
    summary: coachEventTitle(booking, options.hideClientNames),
    description: `Termin in HxRoom: ${url}`,
    url,
    status: booking.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED',
  };
}

// "2026-11-10T09:00:00.000Z" → "20261110T090000Z"
function compactUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Vorausgefüllte Eintragsseite von Google Kalender – ein Klick, dann „Speichern“. */
export function googleCalendarLink(booking: CoachCalendarBooking, options: CoachCalendarOptions): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: coachEventTitle(booking, options.hideClientNames),
    dates: `${compactUtc(booking.startTime)}/${compactUtc(booking.endTime)}`,
    details: `Termin in HxRoom: ${coachBookingUrl(booking.id, options.coachAppUrl)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Vorausgefüllte Eintragsseite von Outlook. Geschäftliche Konten (Microsoft 365) und private
 * (Outlook.com) haben verschiedene Hosts; der Pfad ist gleich.
 */
export function outlookCalendarLink(booking: CoachCalendarBooking, options: CoachCalendarOptions, account: 'work' | 'personal'): string {
  const host = account === 'work' ? 'https://outlook.office.com' : 'https://outlook.live.com';
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: coachEventTitle(booking, options.hideClientNames),
    startdt: booking.startTime.toISOString(),
    enddt: booking.endTime.toISOString(),
    body: `Termin in HxRoom: ${coachBookingUrl(booking.id, options.coachAppUrl)}`,
  });
  return `${host}/calendar/0/deeplink/compose?${params.toString()}`;
}
