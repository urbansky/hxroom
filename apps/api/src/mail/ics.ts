// Minimaler iCalendar-Generator (RFC 5545) für Termin-Anhänge in Buchungsmails.
// Bewusst ohne npm-Dependency: ein einzelnes VEVENT braucht keine Bibliothek, und
// die Kalender-Clients der Klienten sind der einzige Konsument.

export interface BookingIcsInput {
  /** Stabile UID über alle Mails zu diesem Termin hinweg – in der Praxis die booking.id.
   *  Ein erneuter Import ersetzt dadurch den bestehenden Eintrag, statt ihn zu duplizieren. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  /** Coach – optional, weil eine Organisation theoretisch ohne 'owner'-Member dastehen kann. */
  organizer?: { name: string; email: string };
  attendee?: { name: string; email: string };
  description?: string;
  /** Nur für Tests überschreibbar; sonst der Zeitpunkt der Generierung. */
  now?: Date;
}

// "2026-08-10T07:30:00.000Z" → "20260810T073000Z". Start/Ende sind in der DB absolute
// Zeitpunkte, deshalb reicht UTC und es braucht keine VTIMEZONE-Komponente.
function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// RFC 5545 §3.3.11: Backslash zuerst, sonst würden die eingefügten Escapes erneut escaped.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// RFC 5545 §3.1: Zeilen dürfen 75 Oktetts nicht überschreiten. Gefaltet wird auf
// Byte-Ebene, damit Mehrbyte-Zeichen (Umlaute) nicht mitten im Codepoint zerteilt werden.
function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let offset = 0;
  // Erste Zeile 75 Oktetts, Folgezeilen 74 (+ 1 Oktett für das führende Leerzeichen).
  let limit = 75;
  while (offset < bytes.length) {
    let take = Math.min(limit, bytes.length - offset);
    // Nicht innerhalb einer UTF-8-Sequenz schneiden: Continuation-Bytes sind 10xxxxxx.
    while (take > 0 && offset + take < bytes.length && (bytes[offset + take] & 0xc0) === 0x80) {
      take--;
    }
    chunks.push(bytes.subarray(offset, offset + take).toString('utf8'));
    offset += take;
    limit = 74;
  }

  return chunks.join('\r\n ');
}

export function buildBookingIcs(input: BookingIcsInput): string {
  const stamp = toIcsUtc(input.now ?? new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HxRoom//Booking//DE',
    'CALSCALE:GREGORIAN',
    // PUBLISH statt REQUEST: HxRoom verarbeitet keine Zu-/Absagen per Mail, deshalb
    // sollen Kalender-Clients auch keine Antwort-Buttons anbieten.
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(input.start)}`,
    `DTEND:${toIcsUtc(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  }
  if (input.organizer) {
    lines.push(`ORGANIZER;CN=${escapeText(input.organizer.name)}:mailto:${input.organizer.email}`);
  }
  if (input.attendee) {
    lines.push(`ATTENDEE;CN=${escapeText(input.attendee.name)};ROLE=REQ-PARTICIPANT:mailto:${input.attendee.email}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}
