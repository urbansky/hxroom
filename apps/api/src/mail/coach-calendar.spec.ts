import { describe, expect, it } from 'vitest';
import { buildBookingsIcs } from './ics';
import { coachEventTitle, coachIcsInput, googleCalendarLink, outlookCalendarLink, type CoachCalendarBooking } from './coach-calendar';
import { parseBusyTimes } from '../calendar-import/parse-busy';

const booking: CoachCalendarBooking = {
  id: '11111111-2222-3333-4444-555555555555',
  offerName: 'Coaching-Sitzung',
  clientName: 'Max Mustermann',
  startTime: new Date('2026-11-10T09:00:00.000Z'),
  endTime: new Date('2026-11-10T10:00:00.000Z'),
  status: 'confirmed',
};
const options = { hideClientNames: false, coachAppUrl: 'https://app.hxroom.de/' };

function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
}

describe('Termin im Kalender des Coachs', () => {
  it('Titel mit Angebot und Klient, ohne Namen nur das Angebot, unbestätigt gekennzeichnet', () => {
    expect(coachEventTitle(booking, false)).toBe('Coaching-Sitzung · Max Mustermann');
    expect(coachEventTitle(booking, true)).toBe('Coaching-Sitzung');
    expect(coachEventTitle({ ...booking, status: 'pending' }, false)).toBe('Coaching-Sitzung · Max Mustermann (unbestätigt)');
  });

  it('enthält weder Teilnehmer noch Organisator, aber den Link zur Terminseite und die booking.id als UID', () => {
    const lines = unfold(buildBookingsIcs([coachIcsInput(booking, options)]));

    expect(lines).toContain(`UID:${booking.id}`);
    expect(lines.some((l) => l.startsWith('ATTENDEE') || l.startsWith('ORGANIZER'))).toBe(false);
    expect(lines).toContain(`URL:https://app.hxroom.de/bookings/${booking.id}`);
    expect(lines).toContain('STATUS:CONFIRMED');
  });

  it('markiert unbestätigte Buchungen als vorläufig', () => {
    const lines = unfold(buildBookingsIcs([coachIcsInput({ ...booking, status: 'pending' }, options)]));
    expect(lines).toContain('STATUS:TENTATIVE');
  });

  it('trägt im Feed Kalendername und Abruftakt, im Mail-Anhang nicht', () => {
    const feed = unfold(buildBookingsIcs([coachIcsInput(booking, options)], { name: 'HxRoom – Termine', refreshMinutes: 15 }));
    expect(feed).toContain('X-WR-CALNAME:HxRoom – Termine');
    expect(feed).toContain('X-PUBLISHED-TTL:PT15M');
    expect(feed).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT15M');

    const attachment = unfold(buildBookingsIcs([coachIcsInput(booking, options)]));
    expect(attachment.some((l) => l.startsWith('X-WR-CALNAME'))).toBe(false);
  });

  it('wird vom eigenen Import nicht als belegte Zeit gezählt (gleiche UID wie die Buchung)', () => {
    const ics = buildBookingsIcs([coachIcsInput(booking, options)]);
    const window = { start: new Date('2026-11-09T00:00:00Z'), end: new Date('2026-11-12T00:00:00Z') };

    expect(parseBusyTimes(ics, { window, blockAllDay: false, ownUids: new Set([booking.id]), ownEmails: [] }).busy).toEqual([]);
    expect(parseBusyTimes(ics, { window, blockAllDay: false, ownUids: new Set(), ownEmails: [] }).busy).toHaveLength(1);
  });

  it('baut vorausgefüllte Eintragslinks für Google und Outlook', () => {
    const google = new URL(googleCalendarLink(booking, options));
    expect(google.host).toBe('calendar.google.com');
    expect(google.searchParams.get('action')).toBe('TEMPLATE');
    expect(google.searchParams.get('text')).toBe('Coaching-Sitzung · Max Mustermann');
    expect(google.searchParams.get('dates')).toBe('20261110T090000Z/20261110T100000Z');

    const work = new URL(outlookCalendarLink(booking, { ...options, hideClientNames: true }, 'work'));
    expect(work.host).toBe('outlook.office.com');
    expect(work.searchParams.get('subject')).toBe('Coaching-Sitzung');
    expect(work.searchParams.get('startdt')).toBe('2026-11-10T09:00:00.000Z');
    expect(new URL(outlookCalendarLink(booking, options, 'personal')).host).toBe('outlook.live.com');
  });
});
