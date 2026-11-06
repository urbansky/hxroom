import type { AvailabilityExceptionResponse } from '@hxroom/shared'
import { startOfDay } from './bookings'

// Ausnahmen von den Wochenzeiten (doc/produkt/funktionen/kalenderabgleich.md §2).

export const EXCEPTION_KIND_LABELS: Record<AvailabilityExceptionResponse['kind'], string> = {
  blocked: 'Gesperrt',
  available: 'Freigegeben',
}

const dayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
const dayYearFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

function formatDay(date: Date, now: Date): string {
  return (date.getFullYear() === now.getFullYear() ? dayFormatter : dayYearFormatter).format(date)
}

/** Letzter Tag einer ganztägigen Ausnahme: Das Ende ist exklusiv (00:00 des Folgetags). */
export function lastDayOfAllDay(exception: Pick<AvailabilityExceptionResponse, 'end'>): Date {
  const end = new Date(exception.end)
  end.setDate(end.getDate() - 1)
  return end
}

/**
 * "Sa., 15. Aug. · 10:00 – 13:00", ganztägig "Mo., 3. Aug. – Fr., 14. Aug." bzw. nur ein
 * Tag, über mehrere Tage mit Uhrzeit "Do., 13. Aug. 14:00 – Fr., 14. Aug. 10:00".
 */
export function formatExceptionRange(exception: Pick<AvailabilityExceptionResponse, 'start' | 'end' | 'allDay'>, now = new Date()): string {
  const start = new Date(exception.start)
  const end = new Date(exception.end)

  if (exception.allDay) {
    const last = lastDayOfAllDay(exception)
    if (startOfDay(last).getTime() === startOfDay(start).getTime()) return `${formatDay(start, now)} · ganztägig`
    return `${formatDay(start, now)} – ${formatDay(last, now)}`
  }

  const sameDay = startOfDay(start).getTime() === startOfDay(new Date(end.getTime() - 1)).getTime()
  if (sameDay) return `${formatDay(start, now)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
  return `${formatDay(start, now)} ${timeFormatter.format(start)} – ${formatDay(end, now)} ${timeFormatter.format(end)}`
}

/** Beschriftung eines Blocks in der Wochenansicht: "Gesperrt · Urlaub". */
export function exceptionLabel(exception: Pick<AvailabilityExceptionResponse, 'kind' | 'note'>): string {
  return [EXCEPTION_KIND_LABELS[exception.kind], exception.note].filter(Boolean).join(' · ')
}
