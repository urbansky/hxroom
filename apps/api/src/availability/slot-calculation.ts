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
  // Belegte Zeiten, die kein Slot überlappen darf: bestehende Buchungen und gesperrte
  // Ausnahmen (doc/produkt/funktionen/kalenderabgleich.md §2).
  excludeRanges?: DateRange[];
  // Freigegebene Ausnahmen: zusätzliche Zeitfenster neben den Wochenzeiten.
  extraWindows?: DateRange[];
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

function ruleWindow(dateStr: string, rule: WeeklyAvailabilityRule, timeZone: string): DateRange {
  return {
    start: fromZonedTime(`${dateStr}T${rule.startTime}:00`, timeZone),
    end: fromZonedTime(`${dateStr}T${rule.endTime}:00`, timeZone),
  };
}

/**
 * Legt Zeitfenster zusammen, die sich echt überschneiden. Aneinandergrenzende Fenster
 * (09–12 und 12–17) bleiben getrennt: Die Wochenzeiten überschneiden sich nie
 * (AvailabilityService.assertNoOverlap), ihr Raster bleibt dadurch unverändert. Nur eine
 * Freigabe, die in ein Fenster hineinragt, verlängert es – sonst entstünden zwei Raster
 * mit doppelten oder versetzten Slots im selben Zeitraum.
 *
 * `joinAdjacent` legt auch angrenzende Fenster zusammen – für die Frage, ob ein Termin
 * lückenlos in freigegebener Zeit liegt, ist 11:30–12:30 bei 09–12 plus 12–14 drin.
 */
export function mergeWindows(windows: DateRange[], joinAdjacent = false): DateRange[] {
  const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: DateRange[] = [];
  for (const window of sorted) {
    const last = merged.at(-1);
    if (last && (window.start < last.end || (joinAdjacent && window.start.getTime() === last.end.getTime()))) {
      if (window.end > last.end) last.end = window.end;
    } else {
      merged.push({ start: window.start, end: window.end });
    }
  }
  return merged;
}

/**
 * Liegt der Zeitraum vollständig in einem freigegebenen Zeitfenster – aus den Wochenzeiten
 * seines Tages oder aus einer Freigabe? Für den Hinweis beim manuellen Anlegen
 * (doc/produkt/funktionen/manuelle-termine.md §2) – dort ist die Verfügbarkeit kein
 * Hindernis, und Raster, Vorlauf und Puffer spielen keine Rolle.
 */
export function isWithinAvailability(range: DateRange, rules: WeeklyAvailabilityRule[], timeZone: string, extraWindows: DateRange[] = []): boolean {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(range.start)
      .map((part) => [part.type, part.value]),
  );
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);

  const windows = mergeWindows([
    ...rules.filter((rule) => rule.weekday === weekday).map((rule) => ruleWindow(dateStr, rule, timeZone)),
    ...extraWindows,
  ], true);
  return windows.some((window) => range.start >= window.start && range.end <= window.end);
}

export function computeAvailableSlots(params: ComputeAvailableSlotsParams): DateRange[] {
  const { rules, settings, durationMinutes, now, timeZone, excludeRanges = [], extraWindows = [] } = params;
  const daysAhead = params.daysAhead ?? AVAILABLE_SLOTS_WINDOW_DAYS;

  const earliestStart = new Date(now.getTime() + settings.minLeadTimeHours * 60 * 60 * 1000);
  const stepMinutes = durationMinutes + settings.bufferMinutes;

  // Erst alle Zeitfenster im Buchungsfenster sammeln, dann rastern: Eine Freigabe kann an
  // jedem Tag liegen und mit einem Fenster der Wochenzeiten zusammenfallen.
  const windows: DateRange[] = [];
  for (let d = 0; d < daysAhead; d++) {
    const { year, month, day, weekday } = calendarDateAt(now, d);
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    for (const rule of rules.filter((r) => r.weekday === weekday)) {
      windows.push(ruleWindow(dateStr, rule, timeZone));
    }
  }

  // Freigaben gelten nur bis zum Ende des Buchungsfensters, wie die Wochenzeiten.
  const horizon = calendarDateAt(now, daysAhead);
  const horizonEnd = fromZonedTime(`${horizon.year}-${pad(horizon.month)}-${pad(horizon.day)}T00:00:00`, timeZone);
  for (const extra of extraWindows) {
    if (extra.start >= horizonEnd) continue;
    windows.push({ start: extra.start, end: extra.end < horizonEnd ? extra.end : horizonEnd });
  }

  const slots: DateRange[] = [];

  for (const window of mergeWindows(windows)) {
    let cursor = window.start;
    while (cursor.getTime() + durationMinutes * 60_000 <= window.end.getTime()) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
      const range: DateRange = { start: cursor, end: slotEnd };

      if (cursor.getTime() >= earliestStart.getTime() && !overlapsAny(range, excludeRanges)) {
        slots.push(range);
        if (slots.length >= AVAILABLE_SLOTS_MAX_COUNT) return slots;
      }

      cursor = new Date(cursor.getTime() + stepMinutes * 60_000);
    }
  }

  return slots;
}
