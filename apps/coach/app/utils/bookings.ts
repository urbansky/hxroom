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
  /** Für die Hervorhebung der heutigen Tagesüberschrift. */
  isToday: boolean
  bookings: CoachBookingResponse[]
}

/** Gruppiert eine nach Startzeit sortierte Liste in Tagesblöcke. */
export function groupByDay(bookings: CoachBookingResponse[], now = new Date()): BookingDayGroup[] {
  const groups = new Map<string, BookingDayGroup>()
  const today = startOfDay(now).getTime()

  for (const booking of bookings) {
    const day = startOfDay(new Date(booking.start))
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const existing = groups.get(key)
    if (existing) {
      existing.bookings.push(booking)
    } else {
      groups.set(key, {
        key,
        heading: formatDayHeading(booking.start, now),
        isToday: day.getTime() === today,
        bookings: [booking],
      })
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

/**
 * Vergangene Zeit für den Call-Screen: `null` in der ersten Minute, danach "3 Min.",
 * "1 Std. 5 Min.".
 *
 * Gegenstück zu formatRelativeToStart, das nur in die Zukunft zeigt. Hier geht es um die
 * Frage, wie lange jemand schon wartet – und wer zehn Minuten wartet, soll das auch sehen.
 * In der ersten Minute gibt es nichts zu berichten; `null` überlässt dem Aufrufer die
 * Formulierung, statt ein holpriges "wartet gerade eben" zu erzwingen.
 */
export function formatElapsed(iso: string, now = new Date()): string | null {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return null
  if (minutes < 60) return `${minutes} Min.`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} Std.` : `${hours} Std. ${rest} Min.`
}

/**
 * Laufzeit der Sitzung als Uhrenanzeige – "12:04", ab einer Stunde "1:12:04".
 *
 * Sekundengenau und aufsteigend: Der Timer zählt vom Einlass hoch, nicht von der gebuchten
 * Dauer herunter. Ein Countdown auf null würde beide Seiten unter Druck setzen, obwohl
 * niemand die Sitzung automatisch beendet.
 */
export function formatDuration(fromIso: string, now = new Date()): string {
  const total = Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / 1000))
  const seconds = String(total % 60).padStart(2, '0')
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}

export const STATUS_LABELS: Record<CoachBookingResponse['status'], string> = {
  pending: 'unbestätigt',
  confirmed: 'bestätigt',
  completed: 'abgeschlossen',
  cancelled: 'abgesagt',
}

// Ein Spontan-Termin ist keine Buchung: Ihn hat der Coach selbst gestartet, er steht in
// keinem Verfügbarkeits-Slot und war nie 'pending'. Nur diese eine Herkunft wird
// ausgezeichnet – bei einer regulären Buchung wäre ein Badge reines Rauschen.
export function isAdHoc(booking: Pick<CoachBookingResponse, 'origin'>): boolean {
  return booking.origin === 'ad_hoc'
}

export const AD_HOC_LABEL = 'Spontan'

// In der engen Wochenkachel ist kein Platz für ein Badge; dort steht die Herkunft als
// Präfix der Angebotszeile. Ohne Angebot heißt der Snapshot bereits „Spontan-Termin“ –
// ein Präfix wäre dort eine Dopplung.
export function offerLineLabel(booking: Pick<CoachBookingResponse, 'origin' | 'offerId' | 'offerName'>): string {
  return isAdHoc(booking) && booking.offerId ? `${AD_HOC_LABEL} · ${booking.offerName}` : booking.offerName
}

// Wer abgesagt hat, ist für die Reaktion des Coachs entscheidend: eine Absage des Klienten
// hinterlässt eine Lücke, die er neu füllen kann, ein Verfall dagegen heißt, dass die
// Buchung nie bestätigt wurde. Aus Sicht des Coachs formuliert ("von dir").
export const CANCELLED_BY_LABELS: Record<NonNullable<CoachBookingResponse['cancelledBy']>, string> = {
  coach: 'von dir',
  client: 'vom Klienten',
  system: 'automatisch, weil der Klient nicht bestätigt hat',
}
