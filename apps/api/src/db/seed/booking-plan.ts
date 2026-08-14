/**
 * Plant die Demo-Buchungen zeitlich.
 *
 * Kernidee: die Startzeitpunkte nicht selbst ausrechnen, sondern von
 * `computeAvailableSlots` liefern lassen – also von genau der Funktion, die auch die
 * öffentliche Buchungsseite und BookingsService.create verwenden. Nur so liegen die
 * gesäten Termine exakt auf dem Raster, das die Verfügbarkeitsregeln aufspannen, und
 * sitzen im Wochenkalender bündig in den hellen Verfügbarkeitsflächen statt versetzt.
 */
import type { BookingStatus } from '@hxroom/shared';
import { computeAvailableSlots, type DateRange } from '../../availability/slot-calculation';
import {
  DEMO_AVAILABILITY,
  DEMO_AVAILABILITY_SETTINGS,
  DEMO_CLIENTS,
  DEMO_OFFERS,
  type DemoOffer,
} from './demo-data';

/** Identisch zu OrganizationService.resolveOfferAndSlots – dort ebenfalls fest verdrahtet. */
const TIME_ZONE = 'Europe/Berlin';

/** Wie weit die Sitzungshistorie zurückreicht. */
const PAST_WINDOW_DAYS = 70;
/** Wie weit die anstehenden Termine reichen; deckt bookingWindowWeeks (4) ab. */
const FUTURE_WINDOW_DAYS = 28;

export interface PlannedBooking {
  /** Index in DEMO_CLIENTS; null = bewusst keinem Klienten zugeordnet. */
  clientIndex: number | null;
  offer: DemoOffer;
  start: Date;
  end: Date;
  status: BookingStatus;
  clientNote: string | null;
  /** Nur für die 'pending'-Buchung relevant: sie braucht ein frisches createdAt. */
  createdAt: Date;
}

/**
 * Baut das Slot-Raster für ein Angebot.
 *
 * `minLeadTimeHours` ist hier bewusst 0, obwohl die Demo-Einstellungen 24 Stunden
 * vorsehen: sonst fehlten genau die Slots der nächsten 24 Stunden, und dort soll ein
 * Termin liegen, damit "nächster Termin" nicht erst in Tagen greift. Für die öffentliche
 * Buchungsseite gilt weiterhin der echte Wert aus availability_settings.
 */
function slotGrid(offer: DemoOffer, from: Date, days: number): DateRange[] {
  return computeAvailableSlots({
    rules: DEMO_AVAILABILITY,
    settings: { bufferMinutes: DEMO_AVAILABILITY_SETTINGS.bufferMinutes, minLeadTimeHours: 0 },
    durationMinutes: offer.durationMinutes,
    now: from,
    timeZone: TIME_ZONE,
    daysAhead: days,
  });
}

/** Montag 00:00 der Woche, in der `date` liegt – wie apps/coach/app/utils/bookings.ts. */
function startOfWeekMonday(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/**
 * Verteilt `count` Slots möglichst gleichmäßig über `slots`, statt die ersten n zu nehmen.
 * Dichte Blöcke würden die öffentliche Buchungsseite leer aussehen lassen, weil jede
 * nicht-stornierte Buchung ihren Zeitraum aus der Slot-Berechnung ausschließt.
 */
function spread(slots: DateRange[], count: number): DateRange[] {
  if (slots.length === 0 || count <= 0) return [];
  if (count >= slots.length) return [...slots];

  const step = slots.length / count;
  const picked: DateRange[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(slots[Math.floor(i * step)]);
  }
  return picked;
}

const CLIENT_NOTES = [
  'Ich würde gern über die Rückmeldung aus dem Jahresgespräch sprechen.',
  'Kurzfristig etwas dazwischengekommen – falls möglich, bitte um Rückruf vorab.',
  'Diesmal möchte ich beim Thema Abgrenzung im Team weitermachen.',
  null,
  null,
];


/**
 * Plant alle Buchungen für den voll ausgestatteten Coach.
 *
 * Der Zuschnitt deckt bewusst jeden Zustand ab, den die Coach-App unterscheidet:
 * Sitzungshistorie, laufende Woche, Anstehende, Abgesagte (Vergangenheit und Zukunft),
 * eine unbestätigte und eine Buchung ohne Klientenzuordnung.
 */
export function planBookings(now: Date): PlannedBooking[] {
  const coaching = DEMO_OFFERS.find((o) => o.slug === 'coaching')!;
  const intensiv = DEMO_OFFERS.find((o) => o.slug === 'intensiv')!;
  const erstgespraech = DEMO_OFFERS.find((o) => o.slug === 'erstgespraech')!;

  // Das Raster wird durchgehend für das 60-Minuten-Angebot gebaut. Ein einziges Raster
  // hält die Startzeitpunkte über alle Angebote hinweg vergleichbar; längere oder kürzere
  // Termine sitzen auf denselben Rasterpunkten und wirken im Kalender dadurch aufgeräumt.
  // computeAvailableSlots filtert alles vor `now` heraus, deshalb für die Vergangenheit
  // ein zurückdatiertes `now` und anschließend die Einschränkung auf `end < now`.
  const pastFrom = new Date(now.getTime() - PAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const pastGrid = slotGrid(coaching, pastFrom, PAST_WINDOW_DAYS).filter((s) => s.end < now);
  const futureGrid = slotGrid(coaching, now, FUTURE_WINDOW_DAYS).filter((s) => s.start > now);

  const gridStarts = [...pastGrid, ...futureGrid].map((s) => s.start.getTime());

  const planned: PlannedBooking[] = [];
  // Jeder von einem Termin überdeckte Rasterpunkt wird hier vermerkt – auch bei einer
  // abgesagten Buchung. Für den partiellen Unique-Index bookings_org_start_active_unique
  // wäre das nicht nötig (er klammert 'cancelled' aus), aber sonst könnten zwei
  // Planungsschritte denselben Zeitpunkt greifen und im Kalender übereinander liegen.
  // Dass eine Absage ihren Zeitpunkt fachlich wieder freigibt, bleibt davon unberührt:
  // die Slot-Berechnung schließt 'cancelled' aus, auf der Buchungsseite ist er wieder frei.
  const consumed = new Set<number>();

  /**
   * `end` kommt immer aus der Angebotsdauer – ein 90-Minuten-Termin auf einem
   * 60-Minuten-Rasterpunkt würde sonst endTime und durationMinutes widersprüchlich
   * befüllen. Alle vom Termin überdeckten Rasterpunkte gelten danach als belegt.
   */
  const add = (params: Omit<PlannedBooking, 'end'>): void => {
    const end = new Date(params.start.getTime() + params.offer.durationMinutes * 60_000);
    for (const t of gridStarts) {
      if (t >= params.start.getTime() && t < end.getTime()) consumed.add(t);
    }
    planned.push({ ...params, end });
  };

  /** Frei ist ein Rasterpunkt nur, wenn die Angebotsdauer dort vollständig hineinpasst. */
  const freeFor = (offer: DemoOffer) => (slot: DateRange) => {
    const end = slot.start.getTime() + offer.durationMinutes * 60_000;
    for (const t of gridStarts) {
      if (t >= slot.start.getTime() && t < end && consumed.has(t)) return false;
    }
    return true;
  };

  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const inCurrentWeek = (s: DateRange) => s.start >= weekStart && s.start < weekEnd;

  const withHistory = DEMO_CLIENTS
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.history === 'both' || c.history === 'past-only');
  // 'future-only' zuerst: für diesen Klienten *ist* der anstehende Termin der Zweck.
  // Reicht das Raster am Ende für einen Klienten nicht, soll die Lücke bei einem
  // 'both'-Klienten entstehen – der hat seine Historie ohnehin.
  const withFuture = DEMO_CLIENTS
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.history === 'both' || c.history === 'future-only')
    .sort((a, b) => Number(b.c.history === 'future-only') - Number(a.c.history === 'future-only'));

  // --- Sitzungshistorie ----------------------------------------------------------
  // Bewusst außerhalb der laufenden Woche, die weiter unten gezielt belegt wird.
  spread(pastGrid.filter((s) => !inCurrentWeek(s)), 12).forEach((slot, idx) => {
    add({
      clientIndex: withHistory[idx % withHistory.length].i,
      offer: coaching,
      start: slot.start,
      status: 'confirmed',
      clientNote: null,
      createdAt: new Date(slot.start.getTime() - 3 * 24 * 60 * 60 * 1000),
    });
  });

  // Genau eine 'completed': prüft, dass sessionCount/lastSessionAt beide Status zählen
  // (ClientsService: status IN ('confirmed','completed')). In der UI ist 'completed'
  // nicht von 'confirmed' zu unterscheiden – ein Badge dafür gibt es nicht.
  const completedSlot = pastGrid.find((s) => !inCurrentWeek(s) && freeFor(intensiv)(s));
  if (completedSlot) {
    add({
      clientIndex: withHistory[0].i,
      offer: intensiv,
      start: completedSlot.start,
      status: 'completed',
      clientNote: null,
      createdAt: new Date(completedSlot.start.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
  }

  // --- Laufende Woche, bereits vorbei --------------------------------------------
  // Läuft der Seed an einem Donnerstag, wäre die Wochenansicht ohne diese Termine in
  // der ersten Wochenhälfte leer.
  let pastAssigned = 0;
  spread(pastGrid.filter(inCurrentWeek), 3).forEach((slot) => {
    if (!freeFor(coaching)(slot)) return;
    add({
      clientIndex: withHistory[(pastAssigned + 1) % withHistory.length].i,
      offer: coaching,
      start: slot.start,
      status: 'confirmed',
      clientNote: CLIENT_NOTES[pastAssigned % CLIENT_NOTES.length],
      createdAt: new Date(slot.start.getTime() - 2 * 24 * 60 * 60 * 1000),
    });
    pastAssigned++;
  });

  // Abgesagt in der Vergangenheit – füllt den Agenda-Filter "Abgesagte"
  const cancelledPast = pastGrid.find(freeFor(coaching));
  if (cancelledPast) {
    add({
      clientIndex: withHistory[1 % withHistory.length].i,
      offer: coaching,
      start: cancelledPast.start,
      status: 'cancelled',
      clientNote: null,
      createdAt: new Date(cancelledPast.start.getTime() - 4 * 24 * 60 * 60 * 1000),
    });
  }

  // --- Anstehende Termine --------------------------------------------------------
  // Erst die laufende Woche (für die Wochenansicht), dann der Rest des Buchungsfensters.
  // Mehr Kandidaten als benötigte Termine: die Intensiv-Sessions belegen zwei
  // Rasterpunkte und lassen einzelne Kandidaten durchfallen. Mit Reserve bekommt jeder
  // Klient aus withFuture zuverlässig einen anstehenden Termin.
  const upcoming = [
    ...spread(futureGrid.filter(inCurrentWeek), 3),
    ...spread(futureGrid.filter((s) => !inCurrentWeek(s)), 6),
  ];
  // Der Zähler läuft erst beim tatsächlichen Anlegen weiter. Zählte er über alle
  // Kandidaten, verlöre ein übersprungener Slot "seinen" Klienten und einzelne Klienten
  // blieben ohne Folgetermin.
  let futureAssigned = 0;
  upcoming.forEach((slot) => {
    // Jeder dritte Termin als Intensiv-Session: unterschiedliche Dauern und
    // Sitzungsfarben im Kalender (offerColor in apps/coach/app/utils/offers.ts).
    const offer = futureAssigned % 3 === 0 ? intensiv : coaching;
    if (!freeFor(offer)(slot)) return;
    add({
      clientIndex: withFuture[futureAssigned % withFuture.length].i,
      offer,
      start: slot.start,
      status: 'confirmed',
      clientNote: CLIENT_NOTES[futureAssigned % CLIENT_NOTES.length],
      createdAt: new Date(now.getTime() - (futureAssigned + 1) * 36 * 60 * 60 * 1000),
    });
    futureAssigned++;
  });

  // Unbestätigte Buchung. createdAt = now ist Pflicht: BookingExpiryService storniert
  // jede 'pending'-Buchung, die älter als CONFIRMATION_TTL_MINUTES (30) ist. Sie lebt
  // damit rund eine halbe Stunde – danach einfach erneut seeden.
  const pendingSlot = futureGrid.find(freeFor(erstgespraech));
  if (pendingSlot) {
    add({
      // Ohne Klient: der entsteht erst beim Bestätigen (BookingsService.confirm),
      // siehe doc/idee-klienten-matching.md – keine "Geister-Klienten".
      clientIndex: null,
      offer: erstgespraech,
      start: pendingSlot.start,
      status: 'pending',
      clientNote: 'Ich habe eine Empfehlung von einer Kollegin bekommen.',
      createdAt: now,
    });
  }

  // Abgesagt in der Zukunft
  const cancelledFuture = futureGrid.find(freeFor(coaching));
  if (cancelledFuture) {
    add({
      clientIndex: withFuture[0].i,
      offer: coaching,
      start: cancelledFuture.start,
      status: 'cancelled',
      clientNote: null,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
  }

  // Bestätigt, aber ohne Klientenzuordnung – dafür ist "Klient zuordnen" im
  // BookingDetailSlideover gedacht (Baustein 3 aus doc/idee-klienten-matching.md).
  const unassigned = futureGrid.find(freeFor(erstgespraech));
  if (unassigned) {
    add({
      clientIndex: null,
      offer: erstgespraech,
      start: unassigned.start,
      status: 'confirmed',
      clientNote: null,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    });
  }

  return planned.sort((a, b) => a.start.getTime() - b.start.getTime());
}
