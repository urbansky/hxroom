import { describe, expect, it } from 'vitest';
// Die Schemas liegen in @hxroom/shared (das Paket hat keine eigenen Tests), prüfen aber den
// Body von POST /bookings/manual und /manual/check – deshalb stehen die Tests hier.
import { MANUAL_BOOKING_MAX_COUNT, checkManualBookingSchema, createManualBookingSchema } from '@hxroom/shared';
import { seriesPositions } from './booking-series';
import { isReminderDue } from './booking-reminders';
import { isWithinAvailability } from '../availability/slot-calculation';

const start = '2026-11-17T09:00:00.000Z';

describe('createManualBookingSchema', () => {
  it('nimmt einen bestehenden Klienten mit Angebot oder mit Dauer', () => {
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1', starts: [start] }).success).toBe(true);
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', durationMinutes: 45, starts: [start] }).success).toBe(true);
  });

  // Ohne beides gäbe es kein Ende und damit kein Zugangsfenster.
  it('verlangt Angebot oder Dauer', () => {
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', starts: [start] }).success).toBe(false);
    expect(createManualBookingSchema.safeParse({ email: 'anna@example.com', createClient: false, starts: [start] }).success).toBe(false);
  });

  it('nimmt eine E-Mail-Adresse und verlangt den Namen nur für einen neuen Klienten', () => {
    expect(createManualBookingSchema.safeParse({ email: 'anna@example.com', createClient: false, durationMinutes: 60, starts: [start] }).success).toBe(true);
    expect(createManualBookingSchema.safeParse({ email: 'anna@example.com', createClient: true, durationMinutes: 60, starts: [start] }).success).toBe(false);
    expect(createManualBookingSchema.safeParse({ email: 'anna@example.com', name: 'Anna', createClient: true, durationMinutes: 60, starts: [start] }).success).toBe(true);
  });

  it(`nimmt 1 bis ${MANUAL_BOOKING_MAX_COUNT} Termine`, () => {
    const starts = (count: number) => Array.from({ length: count }, (_, i) => new Date(Date.parse(start) + i * 7 * 86_400_000).toISOString());
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1', starts: [] }).success).toBe(false);
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1', starts: starts(MANUAL_BOOKING_MAX_COUNT) }).success).toBe(true);
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1', starts: starts(MANUAL_BOOKING_MAX_COUNT + 1) }).success).toBe(false);
  });

  it('weist ungültige Zeitpunkte, Dauern und gemischte Formen ab', () => {
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1', starts: ['morgen'] }).success).toBe(false);
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', durationMinutes: 5, starts: [start] }).success).toBe(false);
    expect(createManualBookingSchema.safeParse({ clientId: 'c-1', email: 'anna@example.com', createClient: false, offerId: 'o-1', starts: [start] }).success).toBe(false);
  });
});

describe('checkManualBookingSchema', () => {
  it('braucht nur Zeiten und Angebot oder Dauer', () => {
    expect(checkManualBookingSchema.safeParse({ durationMinutes: 60, starts: [start] }).success).toBe(true);
    expect(checkManualBookingSchema.safeParse({ starts: [start] }).success).toBe(false);
  });
});

describe('seriesPositions', () => {
  const member = (id: string, seriesId: string, day: number) => ({ id, seriesId, startTime: new Date(Date.UTC(2026, 10, day, 9)) });

  it('zählt je Serie in zeitlicher Folge, unabhängig von der Reihenfolge der Eingabe', () => {
    const positions = seriesPositions([
      member('c', 's-1', 24),
      member('a', 's-1', 10),
      member('x', 's-2', 12),
      member('b', 's-1', 17),
    ]);

    expect(positions.get('a')).toEqual({ position: 1, count: 3 });
    expect(positions.get('b')).toEqual({ position: 2, count: 3 });
    expect(positions.get('c')).toEqual({ position: 3, count: 3 });
    expect(positions.get('x')).toEqual({ position: 1, count: 1 });
  });
});

describe('Erinnerungen bei manuellen Terminen', () => {
  const termin = new Date('2026-11-17T09:00:00Z');
  const hoursBefore = (h: number) => new Date(termin.getTime() - h * 3_600_000);

  it('erinnert wie bei einer Buchung über die Buchungsseite', () => {
    const booking = { status: 'confirmed' as const, origin: 'manual' as const, startTime: termin, confirmedAt: hoursBefore(72), createdAt: hoursBefore(72), sentAt: null };
    expect(isReminderDue('24h', booking, hoursBefore(23.9))).toBe(true);
    expect(isReminderDue('1h', booking, hoursBefore(0.9))).toBe(true);
  });

  // Angelegt ist bestätigt: Wer den Termin 10 Stunden vorher einträgt, hat die Mail mit
  // dem Link gerade bekommen.
  it('lässt die 24h-Erinnerung aus, wenn der Termin kürzer vorher angelegt wurde', () => {
    const booking = { status: 'confirmed' as const, origin: 'manual' as const, startTime: termin, confirmedAt: hoursBefore(10), createdAt: hoursBefore(10), sentAt: null };
    expect(isReminderDue('24h', booking, hoursBefore(9))).toBe(false);
    expect(isReminderDue('1h', booking, hoursBefore(0.9))).toBe(true);
  });
});

describe('isWithinAvailability', () => {
  // Dienstag 09:00–12:00 in Berlin
  const rules = [{ weekday: 1, startTime: '09:00', endTime: '12:00' }];
  // Dienstag, 17. November 2026: Berlin ist UTC+1
  const range = (from: string, to: string) => ({ start: new Date(`2026-11-17T${from}:00+01:00`), end: new Date(`2026-11-17T${to}:00+01:00`) });

  it('erkennt einen Termin im Fenster, auch abseits des Slot-Rasters', () => {
    expect(isWithinAvailability(range('09:00', '10:00'), rules, 'Europe/Berlin')).toBe(true);
    expect(isWithinAvailability(range('10:15', '11:15'), rules, 'Europe/Berlin')).toBe(true);
    expect(isWithinAvailability(range('11:00', '12:00'), rules, 'Europe/Berlin')).toBe(true);
  });

  it('meldet Termine, die das Fenster verlassen oder an einem anderen Tag liegen', () => {
    expect(isWithinAvailability(range('11:30', '12:30'), rules, 'Europe/Berlin')).toBe(false);
    expect(isWithinAvailability(range('08:30', '09:30'), rules, 'Europe/Berlin')).toBe(false);
    const mittwoch = { start: new Date('2026-11-18T09:00:00+01:00'), end: new Date('2026-11-18T10:00:00+01:00') };
    expect(isWithinAvailability(mittwoch, rules, 'Europe/Berlin')).toBe(false);
  });
});
