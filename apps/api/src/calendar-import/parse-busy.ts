import ICAL from 'ical.js';
import { fromZonedTime } from 'date-fns-tz';
import { mergeWindows, type DateRange } from '../availability/slot-calculation';

// Aus einer Kalenderdatei werden belegte Zeiten (doc/produkt/funktionen/kalenderabgleich.md §3.2).
// Nur Beginn und Ende verlassen diese Funktion – Titel, Orte, Teilnehmer und Beschreibungen
// bleiben im Arbeitsspeicher des Abrufs und werden nirgends gespeichert oder geloggt.

/** Zeitzone für Zeiten ohne auflösbare Zone und für ganztägige Termine. */
const FALLBACK_TIME_ZONE = 'Europe/Berlin';
/** Obergrenze je Kalender – schützt vor Dateien mit Zehntausenden Terminen. */
export const MAX_BUSY_OCCURRENCES = 5000;
/** Obergrenze der Schritte beim Auflösen einer Serie, auch vor dem Zeitfenster. */
const MAX_RECURRENCE_STEPS = 50_000;

export interface ParseBusyOptions {
  window: DateRange;
  /** Ganztägige Termine blockieren immer, auch wenn sie als „frei“ markiert sind. */
  blockAllDay: boolean;
  /** UIDs, die HxRoom selbst vergeben hat (booking.id) – diese Termine sind schon Buchungen. */
  ownUids: Set<string>;
  /** Adressen des Coachs, um abgelehnte Einladungen zu erkennen (klein geschrieben). */
  ownEmails: string[];
}

export interface ParseBusyResult {
  busy: DateRange[];
  /** true, wenn die Obergrenze erreicht wurde und Termine fehlen. */
  truncated: boolean;
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Zeitpunkt eines ICAL.Time. Mit aufgelöster Zone (VTIMEZONE in der Datei oder UTC) rechnet
 * ical.js selbst; ohne – „floating“ oder ein TZID ohne Definition – gilt die TZID, wenn sie
 * eine IANA-Zone ist, sonst Europe/Berlin. Ganztägig (isDate): 00:00 Uhr in Europe/Berlin.
 */
function toInstant(time: ICAL.Time, tzid: string | null): Date {
  const local = `${time.year}-${pad(time.month)}-${pad(time.day)}T${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`;
  if (time.isDate) return fromZonedTime(`${local.slice(0, 10)}T00:00:00`, FALLBACK_TIME_ZONE);
  const zone = time.zone;
  const floating = !zone || zone === ICAL.Timezone.localTimezone || zone.tzid === 'floating';
  if (!floating) return new Date(time.toUnixTime() * 1000);
  const tz = tzid && isValidTimeZone(tzid) ? tzid : FALLBACK_TIME_ZONE;
  return fromZonedTime(local, tz);
}

function blocks(event: ICAL.Event, isAllDay: boolean, options: ParseBusyOptions): boolean {
  const component = event.component;
  const status = String(component.getFirstPropertyValue('status') ?? '').toUpperCase();
  if (status === 'CANCELLED') return false;

  const declined = component.getAllProperties('attendee').some((attendee) => {
    const address = String(attendee.getFirstValue() ?? '').replace(/^mailto:/i, '').toLowerCase();
    return options.ownEmails.includes(address) && String(attendee.getParameter('partstat') ?? '').toUpperCase() === 'DECLINED';
  });
  if (declined) return false;

  if (isAllDay && options.blockAllDay) return true;

  const transp = String(component.getFirstPropertyValue('transp') ?? 'OPAQUE').toUpperCase();
  const msBusy = String(component.getFirstPropertyValue('x-microsoft-cdo-busystatus') ?? '').toUpperCase();
  return transp !== 'TRANSPARENT' && msBusy !== 'FREE';
}

export function parseBusyTimes(text: string, options: ParseBusyOptions): ParseBusyResult {
  const root = new ICAL.Component(ICAL.parse(text));
  const vevents = root.getAllSubcomponents('vevent');

  // Geänderte Einzeltermine einer Serie (RECURRENCE-ID) gehören zu ihrem Haupttermin.
  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  const singles: ICAL.Event[] = [];
  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    if (!event.uid || options.ownUids.has(event.uid)) continue;
    if (event.isRecurrenceException()) exceptions.push(event);
    else if (event.isRecurring()) masters.set(event.uid, event);
    else singles.push(event);
  }
  for (const exception of exceptions) {
    const master = masters.get(exception.uid);
    if (master) master.relateException(exception);
    else singles.push(exception); // Ausnahme ohne Serie in der Datei: wie ein Einzeltermin
  }

  const { start: windowStart, end: windowEnd } = options.window;
  const busy: DateRange[] = [];
  let truncated = false;

  const push = (event: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null) => {
    const isAllDay = start.isDate;
    if (!blocks(event, isAllDay, options)) return;
    const startTzid = event.component.getFirstProperty('dtstart')?.getParameter('tzid') as string | undefined;
    const startInstant = toInstant(start, startTzid ?? null);
    let endInstant: Date;
    if (end) {
      endInstant = toInstant(end, (event.component.getFirstProperty('dtend')?.getParameter('tzid') as string | undefined) ?? startTzid ?? null);
    } else {
      // Ohne DTEND/DURATION: ganztägig ein Tag, sonst ein Zeitpunkt ohne Dauer (blockiert nichts)
      endInstant = isAllDay ? new Date(startInstant.getTime() + 24 * 60 * 60_000) : startInstant;
    }
    if (endInstant <= startInstant) return;
    if (endInstant <= windowStart || startInstant >= windowEnd) return;
    busy.push({
      start: startInstant < windowStart ? windowStart : startInstant,
      end: endInstant > windowEnd ? windowEnd : endInstant,
    });
    if (busy.length >= MAX_BUSY_OCCURRENCES) truncated = true;
  };

  for (const event of singles) {
    if (truncated) break;
    push(event, event.startDate, event.endDate ?? null);
  }

  for (const master of masters.values()) {
    if (truncated) break;
    const iterator = master.iterator();
    let next: ICAL.Time | null;
    let steps = 0;
    while ((next = iterator.next()) && steps++ < MAX_RECURRENCE_STEPS && !truncated) {
      const details = master.getOccurrenceDetails(next);
      // Abbruch erst, wenn die Serie hinter dem Fenster liegt. Vorher reicht ein Blick auf den
      // Beginn in UTC-Näherung; die genaue Prüfung macht push().
      if (toInstant(details.startDate, null).getTime() - 14 * 60 * 60_000 > windowEnd.getTime()) break;
      push(details.item, details.startDate, details.endDate);
    }
  }

  return { busy: mergeWindows(busy, true), truncated };
}
