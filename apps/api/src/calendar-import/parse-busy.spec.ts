import { readFileSync } from 'fs';
import { join } from 'path';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { describe, expect, it } from 'vitest';
import { parseBusyTimes, type ParseBusyOptions } from './parse-busy';

const TZ = 'Europe/Berlin';
const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

function options(overrides: Partial<ParseBusyOptions> = {}): ParseBusyOptions {
  return {
    window: { start: fromZonedTime('2026-11-09T00:00:00', TZ), end: fromZonedTime('2026-12-01T00:00:00', TZ) },
    blockAllDay: false,
    ownUids: new Set(['11111111-2222-3333-4444-555555555555']),
    ownEmails: ['anna@hxroom.test'],
    ...overrides,
  };
}

/** Zeiträume als lokale Berliner Zeit – Zeitzonenfehler werden so sichtbar. */
function local(ranges: { start: Date; end: Date }[]): string[] {
  return ranges.map((r) => `${formatInTimeZone(r.start, TZ, 'yyyy-MM-dd HH:mm')} – ${formatInTimeZone(r.end, TZ, 'yyyy-MM-dd HH:mm')}`);
}

describe('parseBusyTimes', () => {
  it('liest einen Google-Kalender: Status, Serie mit Ausnahmen, ganztägig, eigene UID, Absage', () => {
    const { busy, truncated } = parseBusyTimes(fixture('google.ics'), options());

    expect(truncated).toBe(false);
    expect(local(busy)).toEqual([
      '2026-11-09 09:00 – 2026-11-09 10:00', // Serie, erster Termin im Fenster
      '2026-11-10 14:00 – 2026-11-10 15:00', // Zahnarzt
      '2026-11-11 18:00 – 2026-11-11 19:00', // UTC-Termin
      '2026-11-13 00:00 – 2026-11-15 00:00', // ganztägig, beschäftigt
      '2026-11-23 11:00 – 2026-11-23 12:00', // verschobener Einzeltermin der Serie (16.11. per EXDATE entfallen)
      '2026-11-30 09:00 – 2026-11-30 10:00',
    ]);
  });

  it('lässt ganztägige Termine mit „frei“ blockieren, wenn der Schalter an ist', () => {
    const { busy } = parseBusyTimes(fixture('google.ics'), options({ blockAllDay: true }));

    // Der Geburtstag (12.11.) grenzt an den Kurzurlaub und wird mit ihm zusammengefasst
    expect(local(busy)).toContain('2026-11-12 00:00 – 2026-11-15 00:00');
  });

  it('versteht Windows-Zeitzonennamen aus Outlook und X-MICROSOFT-CDO-BUSYSTATUS:FREE', () => {
    const { busy } = parseBusyTimes(fixture('outlook.ics'), options());

    expect(local(busy)).toEqual(['2026-11-11 10:00 – 2026-11-11 11:00']);
  });

  it('löst TZID ohne VTIMEZONE als IANA-Zone auf, floating als Europe/Berlin, DURATION statt DTEND', () => {
    const { busy } = parseBusyTimes(fixture('ohne-zeitzone.ics'), options());

    expect(local(busy)).toEqual([
      '2026-11-10 09:00 – 2026-11-10 10:00',
      '2026-11-10 11:00 – 2026-11-10 12:00',
      '2026-11-10 15:00 – 2026-11-10 15:30', // 09:00 New York
    ]);
  });

  it('schneidet auf das Zeitfenster zu', () => {
    const { busy } = parseBusyTimes(fixture('google.ics'), options({
      window: { start: fromZonedTime('2026-11-14T12:00:00', TZ), end: fromZonedTime('2026-11-23T11:30:00', TZ) },
    }));

    expect(local(busy)).toEqual([
      '2026-11-14 12:00 – 2026-11-15 00:00',
      '2026-11-23 11:00 – 2026-11-23 11:30',
    ]);
  });

  it('begrenzt die Zahl der Termine', () => {
    const events = Array.from({ length: 6000 }, (_, i) => {
      const start = new Date(Date.UTC(2026, 10, 9, 0, 0) + i * 5 * 60_000);
      const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      return `BEGIN:VEVENT\r\nUID:e${i}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(new Date(start.getTime() + 60_000))}\r\nEND:VEVENT`;
    });
    const text = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;

    expect(parseBusyTimes(text, options()).truncated).toBe(true);
  });
});
