import { describe, expect, it } from 'vitest';
import { buildBookingIcs } from './ics';

const BASE = {
  uid: 'booking-123',
  start: new Date('2026-08-10T07:30:00.000Z'),
  end: new Date('2026-08-10T08:30:00.000Z'),
  summary: 'Coaching-Sitzung mit Anna Bergmann',
  now: new Date('2026-08-01T12:00:00.000Z'),
};

/** Entfaltet gefaltete Zeilen (CRLF + führendes Leerzeichen) und splittet in Zeilen. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
}

function valueOf(ics: string, name: string): string | undefined {
  const line = unfold(ics).find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));
  return line?.slice(line.indexOf(':') + 1);
}

describe('buildBookingIcs', () => {
  describe('Grundgerüst', () => {
    it('erzeugt ein gültiges VCALENDAR mit genau einem VEVENT', () => {
      const lines = unfold(buildBookingIcs(BASE));

      expect(lines[0]).toBe('BEGIN:VCALENDAR');
      expect(lines[lines.length - 1]).toBe('END:VCALENDAR');
      expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
      expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(1);
      expect(lines.indexOf('BEGIN:VEVENT')).toBeLessThan(lines.indexOf('END:VEVENT'));
    });

    it('setzt VERSION, PRODID und METHOD:PUBLISH', () => {
      const lines = unfold(buildBookingIcs(BASE));

      expect(lines).toContain('VERSION:2.0');
      expect(lines).toContain('PRODID:-//HxRoom//Booking//DE');
      // PUBLISH statt REQUEST: HxRoom verarbeitet keine Zu-/Absagen per Mail.
      expect(lines).toContain('METHOD:PUBLISH');
      expect(lines).toContain('STATUS:CONFIRMED');
      expect(lines).toContain('SEQUENCE:0');
    });

    it('endet jede Zeile mit CRLF', () => {
      const ics = buildBookingIcs(BASE);

      expect(ics.endsWith('\r\n')).toBe(true);
      // Kein nacktes \n ohne vorangestelltes \r
      expect(/[^\r]\n/.test(ics)).toBe(false);
    });

    it('verwendet die booking.id als UID, damit ein erneuter Import ersetzt statt dupliziert', () => {
      expect(valueOf(buildBookingIcs(BASE), 'UID')).toBe('booking-123');
    });
  });

  describe('Zeitstempel', () => {
    it('schreibt DTSTART/DTEND im UTC-Basic-Format', () => {
      const ics = buildBookingIcs(BASE);

      expect(valueOf(ics, 'DTSTART')).toBe('20260810T073000Z');
      expect(valueOf(ics, 'DTEND')).toBe('20260810T083000Z');
    });

    it('setzt DTSTAMP auf den Generierungszeitpunkt', () => {
      expect(valueOf(buildBookingIcs(BASE), 'DTSTAMP')).toBe('20260801T120000Z');
    });

    it('enthält keine VTIMEZONE-Komponente (Zeiten sind absolut)', () => {
      expect(buildBookingIcs(BASE)).not.toContain('VTIMEZONE');
    });
  });

  describe('Escaping (RFC 5545 §3.3.11)', () => {
    it('escaped Komma, Semikolon und Backslash', () => {
      const ics = buildBookingIcs({ ...BASE, summary: 'Coaching, Teil 2; Fokus: a\\b' });

      expect(valueOf(ics, 'SUMMARY')).toBe('Coaching\\, Teil 2\\; Fokus: a\\\\b');
    });

    it('wandelt Zeilenumbrüche in \\n', () => {
      const ics = buildBookingIcs({ ...BASE, summary: 'Kurz', description: 'Zeile 1\r\nZeile 2\nZeile 3' });

      expect(valueOf(ics, 'DESCRIPTION')).toBe('Zeile 1\\nZeile 2\\nZeile 3');
    });

    it('escaped den Backslash vor den eingefügten Escapes (keine Doppel-Escapes)', () => {
      const ics = buildBookingIcs({ ...BASE, summary: 'a\\,b' });

      // "\" → "\\" und "," → "\," – nicht "\\\\," durch erneutes Escapen
      expect(valueOf(ics, 'SUMMARY')).toBe('a\\\\\\,b');
    });
  });

  describe('Zeilenfaltung (RFC 5545 §3.1)', () => {
    it('faltet Zeilen über 75 Oktetts', () => {
      const ics = buildBookingIcs({ ...BASE, summary: 'A'.repeat(200) });

      for (const line of ics.split('\r\n')) {
        expect(Buffer.from(line, 'utf8').length).toBeLessThanOrEqual(75);
      }
      // Entfaltet muss der Wert wieder vollständig sein
      expect(valueOf(ics, 'SUMMARY')).toBe('A'.repeat(200));
    });

    it('zerteilt keine Mehrbyte-Zeichen', () => {
      const summary = 'Ü'.repeat(120);
      const ics = buildBookingIcs({ ...BASE, summary });

      expect(ics).not.toContain('�');
      expect(valueOf(ics, 'SUMMARY')).toBe(summary);
    });

    it('lässt kurze Zeilen unangetastet', () => {
      expect(unfold(buildBookingIcs(BASE))).toContain('SUMMARY:Coaching-Sitzung mit Anna Bergmann');
    });
  });

  describe('Teilnehmer', () => {
    it('schreibt ORGANIZER und ATTENDEE, wenn übergeben', () => {
      const lines = unfold(
        buildBookingIcs({
          ...BASE,
          organizer: { name: 'Anna Bergmann', email: 'anna@example.com' },
          attendee: { name: 'Max Mustermann', email: 'max@example.com' },
        }),
      );

      expect(lines).toContain('ORGANIZER;CN=Anna Bergmann:mailto:anna@example.com');
      expect(lines).toContain('ATTENDEE;CN=Max Mustermann;ROLE=REQ-PARTICIPANT:mailto:max@example.com');
    });

    it('lässt ORGANIZER weg, wenn kein Coach ermittelt werden konnte', () => {
      const ics = buildBookingIcs({ ...BASE, attendee: { name: 'Max', email: 'max@example.com' } });

      expect(ics).not.toContain('ORGANIZER');
      expect(ics).toContain('ATTENDEE');
    });

    it('escaped den CN-Parameter', () => {
      const lines = unfold(
        buildBookingIcs({ ...BASE, organizer: { name: 'Bergmann, Anna', email: 'anna@example.com' } }),
      );

      expect(lines).toContain('ORGANIZER;CN=Bergmann\\, Anna:mailto:anna@example.com');
    });
  });

  // Der Klient soll den Warteraum zum Termin auch dann wiederfinden, wenn er die Mail
  // längst nicht mehr sucht. URL ist das RFC-Feld, LOCATION dasjenige, das Apple und
  // Google anzeigen – deshalb beide mit demselben Wert.
  it('schreibt den Call-Link als URL und LOCATION', () => {
    const ics = buildBookingIcs({ ...BASE, url: 'https://anna.hxroom.de/call/b-1?token=abc' });

    expect(valueOf(ics, 'URL')).toBe('https://anna.hxroom.de/call/b-1?token=abc');
    expect(valueOf(ics, 'LOCATION')).toBe('https://anna.hxroom.de/call/b-1?token=abc');
  });

  it('lässt URL und LOCATION weg, wenn kein Link vorliegt', () => {
    const ics = buildBookingIcs(BASE);

    expect(ics).not.toContain('URL:');
    expect(ics).not.toContain('LOCATION:');
  });

  it('lässt DESCRIPTION weg, wenn nicht gesetzt', () => {
    expect(buildBookingIcs(BASE)).not.toContain('DESCRIPTION');
  });
});
