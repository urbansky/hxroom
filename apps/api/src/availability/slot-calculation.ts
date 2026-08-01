import { fromZonedTime } from 'date-fns-tz';

// Fallback, falls von außen kein daysAhead übergeben wird.
export const AVAILABLE_SLOTS_WINDOW_DAYS = 14;
// Sicherheitscap gegen sehr große Antworten bei sehr weiten Verfügbarkeitsfenstern.
// Muss das realistische Maximum komfortabel abdecken, sonst wird das Buchungsfenster
// bei dichter Verfügbarkeit + kurzer Angebotsdauer still auf wenige Tage verkürzt (Bug,
// beobachtet bei bookingWindowWeeks=4 + 15-Min-Angebot + mehreren täglichen Zeitfenstern:
// ~66 Slots/Woche > alter Cap von 60 → Fenster wirkte nach ~1 Woche abgeschnitten).
// 12 Wochen (Maximum von bookingWindowWeeks) × realistisch dichte ~90 Slots/Woche ≈ 1080.
export const AVAILABLE_SLOTS_MAX_COUNT = 1000;
// Fallback für availabilitySettings.bookingWindowWeeks, falls noch keine Zeile
// existiert – entspricht dem DB-Default und dem bisherigen AVAILABLE_SLOTS_WINDOW_DAYS-Verhalten.
export const DEFAULT_BOOKING_WINDOW_WEEKS = 2;

export interface WeeklyAvailabilityRule {
  weekday: number; // 0 = Montag … 6 = Sonntag
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface AvailableSlotSettings {
  bufferMinutes: number;
  minLeadTimeHours: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ComputeAvailableSlotsParams {
  rules: WeeklyAvailabilityRule[];
  settings: AvailableSlotSettings;
  durationMinutes: number;
  now: Date;
  timeZone: string;
  daysAhead?: number;
  // Bereits belegte Zeiten, die keine Slots überlappen dürfen. Leer, solange es
  // noch keine bookings gibt – vorbereitet für die spätere Buchungslogik.
  excludeRanges?: DateRange[];
}

function calendarDateAt(baseDate: Date, offsetDays: number): { year: number; month: number; day: number; weekday: number } {
  const utcMidnight = Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() + offsetDays);
  const d = new Date(utcMidnight);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: (d.getUTCDay() + 6) % 7, // JS: 0=Sonntag..6=Samstag → 0=Montag..6=Sonntag
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function overlapsAny(range: DateRange, excludeRanges: DateRange[]): boolean {
  return excludeRanges.some((r) => range.start < r.end && range.end > r.start);
}

export function computeAvailableSlots(params: ComputeAvailableSlotsParams): DateRange[] {
  const { rules, settings, durationMinutes, now, timeZone, excludeRanges = [] } = params;
  const daysAhead = params.daysAhead ?? AVAILABLE_SLOTS_WINDOW_DAYS;

  const earliestStart = new Date(now.getTime() + settings.minLeadTimeHours * 60 * 60 * 1000);
  const stepMinutes = durationMinutes + settings.bufferMinutes;

  const slots: DateRange[] = [];

  for (let d = 0; d < daysAhead && slots.length < AVAILABLE_SLOTS_MAX_COUNT; d++) {
    const { year, month, day, weekday } = calendarDateAt(now, d);
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const rulesForDay = rules.filter((r) => r.weekday === weekday);

    for (const rule of rulesForDay) {
      const windowStart = fromZonedTime(`${dateStr}T${rule.startTime}:00`, timeZone);
      const windowEnd = fromZonedTime(`${dateStr}T${rule.endTime}:00`, timeZone);

      let cursor = windowStart;
      while (cursor.getTime() + durationMinutes * 60_000 <= windowEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
        const range: DateRange = { start: cursor, end: slotEnd };

        if (cursor.getTime() >= earliestStart.getTime() && !overlapsAny(range, excludeRanges)) {
          slots.push(range);
          if (slots.length >= AVAILABLE_SLOTS_MAX_COUNT) break;
        }

        cursor = new Date(cursor.getTime() + stepMinutes * 60_000);
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
