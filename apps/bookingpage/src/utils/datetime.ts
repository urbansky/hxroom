// Alle Zeiten der Buchungsseite erscheinen in der Zeitzone des Coachs, nicht in der des
// Klienten: die Seite weist die Uhrzeiten ausdrücklich als MEZ aus.
export const TIME_ZONE = 'Europe/Berlin';

const dayDateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const monthYearFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' });
// 'en-CA' liefert direkt "YYYY-MM-DD" – als zeitzonenkorrekter Gruppierungsschlüssel
// (Europe/Berlin, nicht Browser-Lokalzeit).
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

type DateInput = Date | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "09:00" */
export function formatTime(value: DateInput): string {
  return timeFormatter.format(toDate(value));
}

/** "09:00 – 10:00" – dasselbe Trennzeichen wie in der Agenda der Coach-App. */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Montag, 3. August" */
export function formatDayDate(value: DateInput): string {
  return dayDateFormatter.format(toDate(value));
}

/** "Montag, 3. August, 09:00 – 10:00 Uhr" – Termin-Label für die Zusammenfassungen. */
export function formatDayTimeRange(start: DateInput, end: DateInput): string {
  return `${formatDayDate(start)}, ${formatTimeRange(start, end)} Uhr`;
}

/** "August 2026" */
export function formatMonthYear(value: DateInput): string {
  const label = monthYearFormatter.format(toDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Tagesschlüssel "YYYY-MM-DD" in der Coach-Zeitzone. */
export function dateKey(value: DateInput): string {
  return dateKeyFormatter.format(toDate(value));
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

/**
 * Mittag UTC statt lokaler Mitternacht: so zeigt die anschließende Formatierung mit
 * timeZone Europe/Berlin unabhängig von der Browser-Zeitzone den richtigen Kalendertag
 * (keine Verschiebung nahe der Tagesgrenze).
 */
export function dateKeyToUtcNoon(key: string): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Montag-first Wochentag rein aus dem Kalenderdatum – bewusst ohne Zeitzonen-Umrechnung,
 * denn "welcher Wochentag ist der 3.8.2026" ist zeitzonenunabhängig.
 */
export function weekdayOfDateKey(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return (new Date(year, month - 1, day).getDay() + 6) % 7;
}

/**
 * Verbleibende Zeit als deutscher Satzteil: "in 3 Stunden", "in 12 Minuten".
 *
 * Für den Warteraum, der ohne Zutun des Servers herunterzählt: Das Verstreichen von Zeit
 * erzeugt in der API kein Ereignis, weil dabei nichts geschrieben wird.
 *
 * Bewusst grob gerundet: Ein sekundengenauer Countdown über Stunden hinweg macht nur
 * unruhig, und in der letzten Minute interessiert die genaue Zahl niemanden mehr – da
 * wartet man einfach.
 */
export function formatCountdown(msRemaining: number): string {
  const seconds = Math.max(0, Math.round(msRemaining / 1000));

  if (seconds < 60) return 'in weniger als einer Minute';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'in einer Minute' : `in ${minutes} Minuten`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'in einer Stunde' : `in ${hours} Stunden`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'in einem Tag' : `in ${days} Tagen`;
}
