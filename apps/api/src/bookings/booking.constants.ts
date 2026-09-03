import type { BookingStatus } from '@hxroom/shared';

// Zeitfenster, in dem eine 'pending'-Buchung bestätigt werden muss, bevor sie verfällt
// (siehe doc/idee-klienten-matching.md). Wird an drei Stellen gebraucht und muss dort
// zwingend derselbe Wert sein: beim Lazy-Check in BookingsService.confirm, im
// Verfall-Cron (BookingExpiryService) und im Hinweistext der Bestätigungsmail.
//
// Offene Frage in der Doku (TTL bei sehr kurzfristigen Buchungen kappen) ist noch nicht
// umgesetzt – aktuell gilt der Wert unabhängig vom Terminzeitpunkt.
export const CONFIRMATION_TTL_MINUTES = 30;

// Ist eine Buchung mit diesem Erstellungszeitpunkt abgelaufen? Bewusst als reine
// Funktion, damit die Grenzfälle ohne Datenbank testbar sind.
export function isExpiredPending(createdAt: Date, now: Date, ttlMinutes = CONFIRMATION_TTL_MINUTES): boolean {
  return now.getTime() - createdAt.getTime() > ttlMinutes * 60_000;
}

// Ein Spontan-Termin braucht kein Angebot: Das Gespräch, das jetzt stattfindet, ist oft
// keines der veröffentlichten Angebote. Fehlt es, treten diese Werte an die Stelle des
// Angebots-Snapshots. Die Dauer ist dabei mehr als Anzeige – aus ihr ergibt sich die
// Endzeit und damit das Zugangsfenster des Klienten (call-access.ts).
export const AD_HOC_OFFER_NAME = 'Spontan-Termin';
export const AD_HOC_DURATION_MINUTES = 60;

// Der Klient darf seinen Termin über den Link aus der Bestätigungsmail bis zum
// Terminbeginn selbst absagen (doc/funktionen/backoffice-coach.md 2.06). Danach ist die
// Sitzung entweder gelaufen oder läuft gerade – dann gehört die Absage in die Hand des
// Coachs, nicht in einen Mail-Link. Eine Absagefrist darüber hinaus gibt es im MVP nicht.
//
// 'pending' ist bewusst eingeschlossen: wer noch nicht bestätigt hat, soll den Slot
// trotzdem aktiv freigeben können, statt auf den TTL-Verfall zu warten.
export function canClientCancel(booking: { status: BookingStatus; startTime: Date }, now: Date): boolean {
  return (booking.status === 'pending' || booking.status === 'confirmed') && booking.startTime > now;
}

// Eine Sitzung zählt als gehalten, wenn sie bestätigt (oder abgeschlossen) ist. Abgesagte
// und nie bestätigte Termine haben nicht stattgefunden und würden jede Kennzahl
// verfälschen – in der Klientenliste des Coachs (ClientsService) genauso wie in der
// Coach-Liste des Betreibers (AdminCoachesService). Deshalb hier einmal definiert: liefen
// die beiden Listen auseinander, wäre nicht mehr klar, welche Zahl stimmt.
//
// Als reines Array statt als Drizzle-Bedingung, damit diese Datei frei von ORM-Importen
// bleibt; die Aufrufer bauen ihr `inArray` selbst.
export const HELD_SESSION_STATUSES = ['confirmed', 'completed'] as const;
