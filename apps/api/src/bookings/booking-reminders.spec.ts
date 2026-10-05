import { describe, expect, it } from 'vitest';
import { isReminderDue, type ReminderCandidate } from './booking-reminders';
import { relativeDayLabel } from './booking-formatting';

const HOUR = 3_600_000;
// Termin Dienstag, 6. Oktober 2026, 14:00 Uhr in Berlin (12:00 UTC)
const start = new Date('2026-10-06T12:00:00Z');
const at = (hoursBefore: number) => new Date(start.getTime() - hoursBefore * HOUR);

const booking = (overrides: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  status: 'confirmed',
  origin: 'booking_page',
  startTime: start,
  confirmedAt: at(72),
  createdAt: at(72),
  sentAt: null,
  ...overrides,
});

describe('isReminderDue', () => {
  it('24h: fällig ab 24 Stunden vor Beginn, vorher nicht', () => {
    expect(isReminderDue('24h', booking(), at(24.1))).toBe(false);
    expect(isReminderDue('24h', booking(), at(24))).toBe(true);
    expect(isReminderDue('24h', booking(), at(23.9))).toBe(true);
  });

  it('1h: fällig ab 60 Minuten vor Beginn', () => {
    expect(isReminderDue('1h', booking(), at(1.1))).toBe(false);
    expect(isReminderDue('1h', booking(), at(1))).toBe(true);
  });

  // Lief die API eine Weile nicht, wird nur nachgeholt, was noch hilft.
  it('holt die 24h-Erinnerung höchstens bis 2 Stunden vor Beginn nach', () => {
    expect(isReminderDue('24h', booking(), at(2.1))).toBe(true);
    expect(isReminderDue('24h', booking(), at(1.9))).toBe(false);
  });

  it('holt die 1h-Erinnerung höchstens bis 5 Minuten vor Beginn nach', () => {
    expect(isReminderDue('1h', booking(), at(6 / 60))).toBe(true);
    expect(isReminderDue('1h', booking(), at(4 / 60))).toBe(false);
  });

  it('nicht doppelt', () => {
    expect(isReminderDue('24h', booking({ sentAt: at(24) }), at(23))).toBe(false);
  });

  it('nur bestätigte Termine, keine Spontan-Termine', () => {
    for (const status of ['pending', 'cancelled', 'no_show', 'completed'] as const) {
      expect(isReminderDue('1h', booking({ status }), at(1))).toBe(false);
    }
    expect(isReminderDue('1h', booking({ origin: 'ad_hoc' }), at(1))).toBe(false);
  });

  // Wer kurzfristig bucht, hat gerade die Bestätigung mit Link bekommen.
  it('entfällt, wenn erst nach dem Fälligkeitszeitpunkt bestätigt wurde', () => {
    const fiveHoursBefore = booking({ confirmedAt: at(5), createdAt: at(5) });
    expect(isReminderDue('24h', fiveHoursBefore, at(4))).toBe(false);
    expect(isReminderDue('1h', fiveHoursBefore, at(1))).toBe(true);

    const halfHourBefore = booking({ confirmedAt: at(0.5), createdAt: at(0.5) });
    expect(isReminderDue('1h', halfHourBefore, at(0.4))).toBe(false);
  });

  it('nimmt createdAt, wenn kein Bestätigungszeitpunkt vorliegt', () => {
    expect(isReminderDue('24h', booking({ confirmedAt: null, createdAt: at(48) }), at(24))).toBe(true);
    expect(isReminderDue('24h', booking({ confirmedAt: null, createdAt: at(10) }), at(9))).toBe(false);
  });
});

describe('relativeDayLabel', () => {
  it('heute, morgen oder Datum – nach Kalendertag in Berlin', () => {
    expect(relativeDayLabel(start, new Date('2026-10-06T06:00:00Z'))).toBe('heute');
    expect(relativeDayLabel(start, new Date('2026-10-05T12:00:00Z'))).toBe('morgen');
    // 23:30 Berlin am Vortag, keine 24 Stunden vor 14:00 – trotzdem „morgen“
    expect(relativeDayLabel(start, new Date('2026-10-05T21:30:00Z'))).toBe('morgen');
    expect(relativeDayLabel(start, new Date('2026-10-04T12:00:00Z'))).toBe('am Dienstag, 6. Oktober');
  });

  // 22:30 UTC ist in Berlin (Sommerzeit) schon der nächste Tag
  it('rechnet in Europe/Berlin, nicht in UTC', () => {
    const lateEvening = new Date('2026-10-06T22:30:00Z'); // Mittwoch, 00:30 Berlin
    expect(relativeDayLabel(lateEvening, new Date('2026-10-06T12:00:00Z'))).toBe('morgen');
  });
});
