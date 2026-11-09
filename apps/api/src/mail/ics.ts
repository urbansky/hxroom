// Minimaler iCalendar-Generator (RFC 5545) für Termin-Anhänge in Buchungsmails und den
// Kalender-Feed der Coachs (doc/produkt/funktionen/kalenderabgleich.md §4).
// Bewusst ohne npm-Dependency: ein paar VEVENTs brauchen keine Bibliothek.

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
  /** Adresse des Videocalls. Landet als URL und als LOCATION im Eintrag: URL ist das
   *  RFC-Feld, LOCATION dasjenige, das Apple und Google anzeigen und bei einer Adresse
   *  anklickbar machen. Ohne beides fände der Klient den Link nur in der Mail wieder. */
  url?: string;
  /** TENTATIVE für unbestätigte Buchungen im Feed des Coachs; Standard CONFIRMED. */
  status?: 'CONFIRMED' | 'TENTATIVE';
  /** Nur für Tests überschreibbar; sonst der Zeitpunkt der Generierung. */
  now?: Date;
}

/** Kopfzeilen für einen abonnierten Kalender (Feed), nicht für Mail-Anhänge. */
export interface CalendarFeedHeaders {
  /** Name, unter dem der Kalender im Abo erscheint (X-WR-CALNAME). */
  name: string;
  /** Vorgeschlagener Abruftakt; Outlook klassisch hält sich daran, andere entscheiden selbst. */
  refreshMinutes: number;
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
  return buildBookingsIcs([input]);
}

/**
 * Mehrere Termine in einer Datei – für die Mail zu einer Terminserie
 * (doc/produkt/funktionen/manuelle-termine.md §5). Jeder Termin ist ein eigenes VEVENT mit eigener
 * UID und eigenem Link; Apple, Google und Outlook importieren alle auf einmal.
 */
export function buildBookingsIcs(inputs: BookingIcsInput[], feed?: CalendarFeedHeaders): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HxRoom//Booking//DE',
    'CALSCALE:GREGORIAN',
    // PUBLISH statt REQUEST: HxRoom verarbeitet keine Zu-/Absagen per Mail, deshalb
    // sollen Kalender-Clients auch keine Antwort-Buttons anbieten.
    'METHOD:PUBLISH',
    ...(feed
      ? [
          `X-WR-CALNAME:${escapeText(feed.name)}`,
          `X-PUBLISHED-TTL:PT${feed.refreshMinutes}M`,
          `REFRESH-INTERVAL;VALUE=DURATION:PT${feed.refreshMinutes}M`,
        ]
      : []),
    ...inputs.flatMap(eventLines),
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function eventLines(input: BookingIcsInput): string[] {
  const stamp = toIcsUtc(input.now ?? new Date());

  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(input.start)}`,
    `DTEND:${toIcsUtc(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `STATUS:${input.status ?? 'CONFIRMED'}`,
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  }
  if (input.url) {
    lines.push(`URL:${escapeText(input.url)}`, `LOCATION:${escapeText(input.url)}`);
  }
  if (input.organizer) {
    lines.push(`ORGANIZER;CN=${escapeText(input.organizer.name)}:mailto:${input.organizer.email}`);
  }
  if (input.attendee) {
    lines.push(`ATTENDEE;CN=${escapeText(input.attendee.name)};ROLE=REQ-PARTICIPANT:mailto:${input.attendee.email}`);
  }

  lines.push('END:VEVENT');
  return lines;
}
