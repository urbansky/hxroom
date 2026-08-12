import type { CoachBookingResponse } from '@hxroom/shared'

// Alle Zeiten kommen als absolute ISO-Strings aus der API und werden in der lokalen
// Zeitzone des Coachs dargestellt.
const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
const dayHeadingFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayMonthFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })
const monthYearFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

export function formatTimeRange(booking: CoachBookingResponse): string {
  return `${formatTime(booking.start)} – ${formatTime(booking.end)}`
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} Uhr`
}

/**
 * Wochenbereich für die Kalendernavigation. Monat und Jahr werden nur so oft genannt,
 * wie sie sich unterscheiden: "10. – 16. August 2026", "28. September – 4. Oktober 2026",
 * "28. Dezember 2026 – 3. Januar 2027".
 */
export function formatWeekRange(start: Date, end: Date): string {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${dayMonthFormatter.format(start)} ${start.getFullYear()} – ${dayMonthFormatter.format(end)} ${end.getFullYear()}`
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${dayMonthFormatter.format(start)} – ${dayMonthFormatter.format(end)} ${end.getFullYear()}`
  }
  return `${start.getDate()}. – ${end.getDate()}. ${monthYearFormatter.format(end)}`
}

/** Mitternacht des Tages, zu dem der Zeitpunkt gehört – Schlüssel für die Tagesgruppierung. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/** "Heute" / "Morgen" / "Gestern", sonst "Montag, 3. August". */
export function formatDayHeading(iso: string, now = new Date()): string {
  const diff = daysBetween(now, new Date(iso))
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gestern'
  return dayHeadingFormatter.format(new Date(iso))
}

/**
 * Relative Angabe bis zum Termin ("in 20 Min.", "in 2 Std.", "in 3 Tagen").
 * Gibt null zurück, sobald der Termin begonnen hat – dann ist die Uhrzeit aussagekräftiger.
 */
export function formatRelativeToStart(iso: string, now = new Date()): string | null {
  const diffMinutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000)
  if (diffMinutes < 0) return null
  if (diffMinutes < 60) return `in ${diffMinutes} Min.`
  if (diffMinutes < 60 * 24) {
    const hours = Math.round(diffMinutes / 60)
    return `in ${hours} Std.`
  }
  const days = Math.round(diffMinutes / (60 * 24))
  return days === 1 ? 'morgen' : `in ${days} Tagen`
}

export interface BookingDayGroup {
  /** ISO-Datum (YYYY-MM-DD) als stabiler Key fürs Rendering. */
  key: string
  heading: string
  bookings: CoachBookingResponse[]
}

/** Gruppiert eine nach Startzeit sortierte Liste in Tagesblöcke. */
export function groupByDay(bookings: CoachBookingResponse[], now = new Date()): BookingDayGroup[] {
  const groups = new Map<string, BookingDayGroup>()

  for (const booking of bookings) {
    const day = startOfDay(new Date(booking.start))
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const existing = groups.get(key)
    if (existing) {
      existing.bookings.push(booking)
    } else {
      groups.set(key, { key, heading: formatDayHeading(booking.start, now), bookings: [booking] })
    }
  }

  return [...groups.values()]
}

/** Montag = 0, passend zum weekday-Feld der Verfügbarkeitsregeln. */
export function toMondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** Montag 00:00 der Woche, in der das Datum liegt. */
export function startOfWeek(date: Date): Date {
  const monday = startOfDay(date)
  monday.setDate(monday.getDate() - toMondayFirstWeekday(date))
  return monday
}

/** Minuten seit Mitternacht – Basis für die Positionierung im Wochenraster. */
export function minutesSinceMidnight(iso: string): number {
  const date = new Date(iso)
  return date.getHours() * 60 + date.getMinutes()
}

/** "09:00" → 540 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export const STATUS_LABELS: Record<CoachBookingResponse['status'], string> = {
  pending: 'unbestätigt',
  confirmed: 'bestätigt',
  completed: 'abgeschlossen',
  cancelled: 'abgesagt',
}
