import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_SLOTS_MAX_COUNT,
  AVAILABLE_SLOTS_WINDOW_DAYS,
  computeAvailableSlots,
  type ComputeAvailableSlotsParams,
  type WeeklyAvailabilityRule,
} from './slot-calculation';

const TZ = 'Europe/Berlin';

/** Wochentage der Regel-Konvention: 0 = Montag … 6 = Sonntag */
const MONTAG = 0;
const DIENSTAG = 1;
const SONNTAG = 6;

/**
 * Kalenderdaten der Fixtures (2026):
 * - 10.08. Montag, 16.08. Sonntag
 * - DST Europe/Berlin: 29.03. (Winter→Sommer) und 25.10. (Sommer→Winter)
 */
function params(overrides: Partial<ComputeAvailableSlotsParams> = {}): ComputeAvailableSlotsParams {
  return {
    rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '12:00' }],
    settings: { bufferMinutes: 0, minLeadTimeHours: 0 },
    durationMinutes: 60,
    now: new Date('2026-08-10T00:00:00Z'),
    timeZone: TZ,
    daysAhead: 7,
    ...overrides,
  };
}

/** Slots als lokale "YYYY-MM-DD HH:mm"-Strings – macht DST-Fehler sichtbar, ISO-Vergleiche nicht. */
function localStarts(slots: { start: Date }[]): string[] {
  return slots.map((s) => formatInTimeZone(s.start, TZ, 'yyyy-MM-dd HH:mm'));
}

function localRanges(slots: { start: Date; end: Date }[]): string[] {
  return slots.map(
    (s) =>
      `${formatInTimeZone(s.start, TZ, 'yyyy-MM-dd HH:mm')}–${formatInTimeZone(s.end, TZ, 'HH:mm')}`,
  );
}

/** Verfügbarkeit Mo–Fr, zwei Fenster pro Tag – Grundlage für die Cap-Regression. */
function denseWeekdayRules(): WeeklyAvailabilityRule[] {
  return [0, 1, 2, 3, 4].flatMap((weekday) => [
    { weekday, startTime: '09:00', endTime: '12:00' },
    { weekday, startTime: '13:00', endTime: '17:00' },
  ]);
}

describe('computeAvailableSlots', () => {
  describe('Raster und Fenstergrenzen', () => {
    it('erzeugt Slots im Dauer-Raster innerhalb des Zeitfensters', () => {
      const slots = computeAvailableSlots(params());

      expect(localRanges(slots)).toEqual([
        '2026-08-10 09:00–10:00',
        '2026-08-10 10:00–11:00',
        '2026-08-10 11:00–12:00',
      ]);
    });

    it('addiert bufferMinutes zum Raster, ohne die Slot-Dauer zu verändern', () => {
      const slots = computeAvailableSlots(
        params({
          settings: { bufferMinutes: 10, minLeadTimeHours: 0 },
          durationMinutes: 50,
        }),
      );

      // Raster 60 Min (50 + 10), Slots aber nur 50 Min lang
      expect(localRanges(slots)).toEqual([
        '2026-08-10 09:00–09:50',
        '2026-08-10 10:00–10:50',
        '2026-08-10 11:00–11:50',
      ]);
    });

    it('verwirft einen Slot, der nicht mehr vollständig ins Fenster passt', () => {
      const slots = computeAvailableSlots(
        params({ rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:30' }] }),
      );

      expect(localRanges(slots)).toEqual(['2026-08-10 09:00–10:00']);
    });

    it('liefert keine Slots, wenn das Fenster kürzer als die Angebotsdauer ist', () => {
      const slots = computeAvailableSlots(
        params({ rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '09:45' }] }),
      );

      expect(slots).toEqual([]);
    });

    it('liefert ohne Regeln ein leeres Ergebnis', () => {
      expect(computeAvailableSlots(params({ rules: [] }))).toEqual([]);
    });
  });

  describe('Wochentags-Mapping', () => {
    it('bildet weekday 0 auf Montag ab', () => {
      const slots = computeAvailableSlots(
        params({ rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }] }),
      );

      expect(localStarts(slots)).toEqual(['2026-08-10 09:00']);
    });

    it('bildet weekday 6 auf Sonntag ab', () => {
      const slots = computeAvailableSlots(
        params({ rules: [{ weekday: SONNTAG, startTime: '09:00', endTime: '10:00' }] }),
      );

      expect(localStarts(slots)).toEqual(['2026-08-16 09:00']);
    });

    it('wiederholt eine Regel wöchentlich über das gesamte Fenster', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }],
          daysAhead: 21,
        }),
      );

      expect(localStarts(slots)).toEqual([
        '2026-08-10 09:00',
        '2026-08-17 09:00',
        '2026-08-24 09:00',
      ]);
    });
  });

  describe('minLeadTimeHours', () => {
    it('verwirft Slots vor der Mindestvorlaufzeit', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '13:00' }],
          settings: { bufferMinutes: 0, minLeadTimeHours: 4 },
          now: new Date('2026-08-10T06:00:00Z'), // 08:00 Berlin → frühester Start 12:00 Berlin
        }),
      );

      expect(localStarts(slots)).toEqual(['2026-08-10 12:00']);
    });

    it('behält einen Slot, der exakt auf der Vorlaufgrenze startet', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }],
          settings: { bufferMinutes: 0, minLeadTimeHours: 3 },
          now: new Date('2026-08-10T04:00:00Z'), // 06:00 Berlin → frühester Start exakt 09:00 Berlin
        }),
      );

      expect(localStarts(slots)).toEqual(['2026-08-10 09:00']);
    });
  });

  describe('excludeRanges', () => {
    it('verwirft Slots, die eine belegte Zeit überlappen', () => {
      const slots = computeAvailableSlots(
        params({
          excludeRanges: [
            {
              start: fromZonedTime('2026-08-10T10:00:00', TZ),
              end: fromZonedTime('2026-08-10T11:00:00', TZ),
            },
          ],
        }),
      );

      expect(localStarts(slots)).toEqual(['2026-08-10 09:00', '2026-08-10 11:00']);
    });

    it('behält Slots, die nur an eine belegte Zeit angrenzen', () => {
      const slots = computeAvailableSlots(
        params({
          excludeRanges: [
            {
              start: fromZonedTime('2026-08-10T08:00:00', TZ),
              end: fromZonedTime('2026-08-10T09:00:00', TZ),
            },
          ],
        }),
      );

      expect(localStarts(slots)).toHaveLength(3);
      expect(localStarts(slots)[0]).toBe('2026-08-10 09:00');
    });

    it('verschiebt das Raster nicht, wenn ein Slot wegfällt', () => {
      const slots = computeAvailableSlots(
        params({
          excludeRanges: [
            {
              start: fromZonedTime('2026-08-10T09:30:00', TZ),
              end: fromZonedTime('2026-08-10T09:45:00', TZ),
            },
          ],
        }),
      );

      // Der 09:00-Slot fällt weg, die folgenden bleiben im ursprünglichen Raster
      expect(localStarts(slots)).toEqual(['2026-08-10 10:00', '2026-08-10 11:00']);
    });
  });

  describe('Zeitzonen und DST', () => {
    it('hält die lokale Uhrzeit über die Frühjahrs-Umstellung stabil', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '10:00', endTime: '11:00' }],
          now: new Date('2026-03-20T00:00:00Z'),
          daysAhead: 14,
        }),
      );

      expect(localStarts(slots)).toEqual(['2026-03-23 10:00', '2026-03-30 10:00']);
      // Vor der Umstellung UTC+1, danach UTC+2 – der UTC-Zeitpunkt verschiebt sich entsprechend
      expect(slots.map((s) => s.start.toISOString())).toEqual([
        '2026-03-23T09:00:00.000Z',
        '2026-03-30T08:00:00.000Z',
      ]);
    });

    it('hält die lokale Uhrzeit über die Herbst-Umstellung stabil', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '10:00', endTime: '11:00' }],
          now: new Date('2026-10-16T00:00:00Z'),
          daysAhead: 14,
        }),
      );

      expect(localStarts(slots)).toEqual(['2026-10-19 10:00', '2026-10-26 10:00']);
      expect(slots.map((s) => s.start.toISOString())).toEqual([
        '2026-10-19T08:00:00.000Z',
        '2026-10-26T09:00:00.000Z',
      ]);
    });

    it('rechnet Zeitfenster in der übergebenen Zeitzone, nicht in UTC', () => {
      const slots = computeAvailableSlots(
        params({ rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }] }),
      );

      expect(slots[0].start.toISOString()).toBe('2026-08-10T07:00:00.000Z'); // Sommerzeit UTC+2
    });
  });

  describe('Sortierung', () => {
    it('sortiert Slots aufsteigend, auch wenn Regeln unsortiert vorliegen', () => {
      const slots = computeAvailableSlots(
        params({
          rules: [
            { weekday: DIENSTAG, startTime: '09:00', endTime: '10:00' },
            { weekday: MONTAG, startTime: '14:00', endTime: '15:00' },
            { weekday: MONTAG, startTime: '09:00', endTime: '10:00' },
          ],
        }),
      );

      expect(localStarts(slots)).toEqual([
        '2026-08-10 09:00',
        '2026-08-10 14:00',
        '2026-08-11 09:00',
      ]);
    });
  });

  describe('Fenstergröße und Cap', () => {
    it('nutzt AVAILABLE_SLOTS_WINDOW_DAYS, wenn kein daysAhead übergeben wird', () => {
      const withDefault = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }],
          daysAhead: undefined,
        }),
      );
      const explicit = computeAvailableSlots(
        params({
          rules: [{ weekday: MONTAG, startTime: '09:00', endTime: '10:00' }],
          daysAhead: AVAILABLE_SLOTS_WINDOW_DAYS,
        }),
      );

      expect(localStarts(withDefault)).toEqual(localStarts(explicit));
      expect(localStarts(withDefault)).toEqual(['2026-08-10 09:00', '2026-08-17 09:00']);
    });

    it('schneidet ein 4-Wochen-Fenster bei 15-Min-Angeboten nicht ab (Regression zum alten Cap 60)', () => {
      const slots = computeAvailableSlots(
        params({
          rules: denseWeekdayRules(),
          durationMinutes: 15,
          daysAhead: 28,
        }),
      );

      // Der letzte Slot muss in der vierten Woche liegen, nicht bereits nach Woche 1 enden
      expect(localStarts(slots).at(-1)).toBe('2026-09-04 16:45');
      expect(slots.length).toBeGreaterThan(500);
    });

    it('begrenzt das Ergebnis auf AVAILABLE_SLOTS_MAX_COUNT', () => {
      const slots = computeAvailableSlots(
        params({
          rules: denseWeekdayRules(),
          durationMinutes: 15,
          daysAhead: 84, // 12 Wochen = Maximum von bookingWindowWeeks
        }),
      );

      expect(slots).toHaveLength(AVAILABLE_SLOTS_MAX_COUNT);
    });
  });
});
