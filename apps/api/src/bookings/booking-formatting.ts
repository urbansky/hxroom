// Deutsche Datums-/Zeitlabels für Mailtexte und Betreffzeilen. Feste Zeitzone
// Europe/Berlin: die Timestamps in der DB sind absolute Zeitpunkte, der Empfänger
// erwartet aber die lokale Uhrzeit des Coachs.

const dayDateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

interface BookingTimes {
  startTime: Date;
  endTime: Date;
}

/** "Montag, 3. August, 09:00–10:00 Uhr" */
export function formatDayTimeLabel(booking: BookingTimes): string {
  return `${dayDateFormatter.format(booking.startTime)}, ${timeFormatter.format(booking.startTime)}–${timeFormatter.format(booking.endTime)} Uhr`;
}

/** "Montag, 3. August" – Kurzform für Betreffzeilen, die schon den Klientennamen tragen. */
export function formatDayLabel(booking: BookingTimes): string {
  return dayDateFormatter.format(booking.startTime);
}
